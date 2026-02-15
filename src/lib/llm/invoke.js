/**
 * invoke_llm - Unified LLM invocation helper
 *
 * Routes requests to the appropriate provider (Gemini, OpenAI, Anthropic, OpenRouter)
 * based on the model. Supports text chat and image generation.
 */
import { Models } from "./models";
import {
  Provider,
  getProviderForModel,
  getApiKeyForProvider,
} from "./providers";

const DEFAULT_MAX_RETRIES = 3;
const REQUEST_TIMEOUT_MS = 300_000;

/**
 * Error types for retry logic
 */
const ErrorType = Object.freeze({
  RATE_LIMIT: "rate_limit",
  PROVIDER_ERROR: "provider_error",
  TOKEN_LIMIT: "token_limit",
  UNSUPPORTED_MODEL: "unsupported_model",
  OTHER: "other",
});

function classifyError(_response, statusCode, errorText) {
  const lower = (errorText || "").toLowerCase();
  if (
    statusCode === 429 ||
    lower.includes("rate limit") ||
    lower.includes("too many requests")
  ) {
    return ErrorType.RATE_LIMIT;
  }
  if (
    lower.includes("context length") ||
    lower.includes("token") ||
    lower.includes("max_tokens")
  ) {
    return ErrorType.TOKEN_LIMIT;
  }
  if (
    lower.includes("model") ||
    lower.includes("not found") ||
    lower.includes("unsupported")
  ) {
    return ErrorType.UNSUPPORTED_MODEL;
  }
  return ErrorType.PROVIDER_ERROR;
}

function isRetriable(errorType) {
  return (
    errorType === ErrorType.RATE_LIMIT || errorType === ErrorType.PROVIDER_ERROR
  );
}

/**
 * Extract base64 and mime from data URL
 */
function dataUrlToBase64(dataUrl) {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error("Invalid data URL format");
  return { mime: match[1], base64: match[2] };
}

/**
 * OpenRouter handler (chat completions, supports image output)
 */
async function callOpenRouter(apiKey, modelId, messages, options) {
  const { jsonMode = false, maxTokens = 0 } = options;

  // OpenRouter expects imageUrl (camelCase), we use image_url
  const normalizedMessages = messages.map((msg) => {
    if (!Array.isArray(msg.content)) return msg;
    return {
      ...msg,
      content: msg.content.map((part) => {
        if (part.type === "image_url" && part.image_url?.url) {
          return { type: "image_url", imageUrl: { url: part.image_url.url } };
        }
        return part;
      }),
    };
  });

  // Only include image modalities for image-capable models
  const isImageModel = modelId.includes("image");
  const body = {
    model: modelId,
    messages: normalizedMessages,
    stream: false,
  };
  if (isImageModel) {
    body.modalities = ["image", "text"];
  }
  if (jsonMode) body.response_format = { type: "json_object" };
  if (maxTokens > 0) body.max_tokens = maxTokens;

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`OpenRouter API error: ${res.status} - ${text}`);
  }

  if (!res.ok) {
    const errType = classifyError(data, res.status, data?.error?.message || text);
    throw Object.assign(new Error(data?.error?.message || text), {
      errorType: errType,
      statusCode: res.status,
    });
  }

  const images = [];
  const choices = data.choices || [];
  if (choices.length > 0) {
    const msg = choices[0].message || {};
    for (const im of msg.images || []) {
      const url = im?.image_url?.url ?? im?.imageUrl?.url;
      if (url) images.push(url);
    }
  }

  const content =
    choices[0]?.message?.content ?? choices[0]?.message?.text ?? null;

  return { content, images, raw: data };
}

/**
 * Gemini handler (generateContent, supports image output)
 */
async function callGemini(apiKey, modelId, messages, options) {
  const { jsonMode = false, maxTokens = 0 } = options;

  // Extract system instruction from system messages
  const systemMessages = messages.filter((m) => m.role === "system");
  const systemInstruction = systemMessages.map((m) => m.content).join("\n\n");

  // Convert OpenRouter-style messages to Gemini format (only user messages)
  const parts = [];
  for (const msg of messages) {
    if (msg.role !== "user") continue;
    const content = Array.isArray(msg.content) ? msg.content : [{ type: "text", text: msg.content }];
    for (const part of content) {
      if (part.type === "text" && part.text) {
        parts.push({ text: part.text });
      }
      if (part.type === "image_url" && part.image_url?.url) {
        const { mime, base64 } = dataUrlToBase64(part.image_url.url);
        parts.push({ inlineData: { mimeType: mime, data: base64 } });
      }
    }
  }

  // Only include responseModalities for image generation models
  const isImageModel = modelId.includes("image");
  const generationConfig = {};
  if (isImageModel) {
    generationConfig.responseModalities = ["Text", "Image"];
  }
  if (jsonMode) generationConfig.responseMimeType = "application/json";
  if (maxTokens > 0) generationConfig.maxOutputTokens = maxTokens;

  const requestBody = {
    contents: [{ role: "user", parts }],
    generationConfig,
  };
  
  // Add system instruction if present
  if (systemInstruction) {
    requestBody.systemInstruction = { parts: [{ text: systemInstruction }] };
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify(requestBody),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Gemini API error: ${res.status} - ${text}`);
  }

  if (!res.ok) {
    const errType = classifyError(
      data,
      res.status,
      data?.error?.message || text
    );
    throw Object.assign(new Error(data?.error?.message || text), {
      errorType: errType,
      statusCode: res.status,
    });
  }

  const images = [];
  for (const cand of data.candidates || []) {
    const content = cand.content || {};
    for (const part of content.parts || []) {
      const inline = part.inlineData;
      if (inline?.data && inline?.mimeType) {
        images.push(`data:${inline.mimeType};base64,${inline.data}`);
      }
    }
  }

  let content = null;
  for (const cand of data.candidates || []) {
    const c = cand.content || {};
    for (const part of c.parts || []) {
      if (part.text) {
        content = (content || "") + part.text;
      }
    }
  }

  return { content, images, raw: data };
}

/**
 * OpenAI handler (responses API for image gen, chat completions for text)
 */
async function callOpenAI(apiKey, modelId, messages, options) {
  const { jsonMode = false, maxTokens = 0 } = options;

  // Check if we have image input (sprite generation)
  const hasImageInput = messages.some((m) => {
    const c = m.content;
    return Array.isArray(c) && c.some((p) => p.type === "image_url");
  });

  if (hasImageInput) {
    // Use Responses API for image generation
    const userMsg = messages.find((m) => m.role === "user");
    const content = userMsg?.content || [];
    const input = [];
    for (const part of content) {
      if (part.type === "text") {
        input.push({ type: "input_text", text: part.text });
      }
      if (part.type === "image_url" && part.image_url?.url) {
        input.push({ type: "input_image", image_url: part.image_url.url });
      }
    }

    const res = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: modelId,
        input: [{ role: "user", content: input }],
        tools: [{ type: "image_generation" }],
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(`OpenAI API error: ${res.status} - ${text}`);
    }

    if (!res.ok) {
      const errType = classifyError(
        data,
        res.status,
        data?.error?.message || text
      );
      throw Object.assign(new Error(data?.error?.message || text), {
        errorType: errType,
        statusCode: res.status,
      });
    }

    const images = [];
    for (const item of data.output || []) {
      if (item.type === "image_generation_call" && item.result) {
        images.push(`data:image/png;base64,${item.result}`);
      }
    }

    return { content: null, images, raw: data };
  }

  // Standard chat completions
  const body = {
    model: modelId,
    messages,
    stream: false,
  };
  if (jsonMode) body.response_format = { type: "json_object" };
  if (maxTokens > 0) body.max_tokens = maxTokens;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`OpenAI API error: ${res.status} - ${text}`);
  }

  if (!res.ok) {
    const errType = classifyError(data, res.status, data?.error?.message || text);
    throw Object.assign(new Error(data?.error?.message || text), {
      errorType: errType,
      statusCode: res.status,
    });
  }

  const content = data.choices?.[0]?.message?.content ?? null;
  return { content, images: [], raw: data };
}

/**
 * Anthropic handler (messages API)
 */
async function callAnthropic(apiKey, modelId, messages, options) {
  const { maxTokens = 0 } = options;

  const systemMessages = messages.filter((m) => m.role === "system");
  const system = systemMessages.map((m) => m.content).join("\n\n");

  const userMessages = messages.filter((m) => m.role === "user");
  const anthropicContent = [];
  for (const msg of userMessages) {
    const c = msg.content;
    if (Array.isArray(c)) {
      for (const part of c) {
        if (part.type === "text") anthropicContent.push({ type: "text", text: part.text });
        if (part.type === "image_url" && part.image_url?.url) {
          const { mime, base64 } = dataUrlToBase64(part.image_url.url);
          anthropicContent.push({
            type: "image",
            source: { type: "base64", media_type: mime, data: base64 },
          });
        }
      }
    } else if (typeof c === "string") {
      anthropicContent.push({ type: "text", text: c });
    }
  }

  const body = {
    model: modelId,
    max_tokens: maxTokens > 0 ? maxTokens : 4096,
    system: system || undefined,
    messages: [{ role: "user", content: anthropicContent }],
  };

  const res = await fetch(
    "https://api.anthropic.com/v1/messages",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    }
  );

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Anthropic API error: ${res.status} - ${text}`);
  }

  if (!res.ok) {
    const errType = classifyError(
      data,
      res.status,
      data?.error?.message || text
    );
    throw Object.assign(new Error(data?.error?.message || text), {
      errorType: errType,
      statusCode: res.status,
    });
  }

  let content = null;
  for (const block of data.content || []) {
    if (block.type === "text") {
      content = (content || "") + block.text;
    }
  }

  return { content, images: [], raw: data };
}

/**
 * Invoke LLM with unified interface
 *
 * @param {string} model - Model ID from Models enum
 * @param {Array<{role: string, content: string | Array}>} messages - Chat messages (OpenRouter format)
 * @param {Object} options
 * @param {string} [options.sessionId] - Optional session ID for logging
 * @param {string[]} [options.tags] - Optional tags for logging
 * @param {boolean} [options.jsonMode] - Request JSON response
 * @param {number} [options.maxTokens] - Max tokens (0 = default)
 * @param {number} [options.maxRetries] - Max retries (default 3)
 * @param {string} [options.provider] - Override provider (default: from model mapping)
 * @returns {Promise<{content: string|null, images: string[], raw: object}>}
 */
export async function invoke_llm(model, messages, options = {}) {
  const {
    sessionId: _sessionId = "",
    tags: _tags = [],
    jsonMode = false,
    maxTokens = 0,
    maxRetries = DEFAULT_MAX_RETRIES,
    provider: providerOverride,
  } = options;

  const provider = providerOverride ?? getProviderForModel(model);
  const apiKey = getApiKeyForProvider(provider);

  const providerOpts = { jsonMode, maxTokens };

  let lastError;
  for (let retries = 0; retries <= maxRetries; retries++) {
    try {
      let result;
      switch (provider) {
        case Provider.OPENROUTER:
          result = await callOpenRouter(apiKey, model, messages, providerOpts);
          break;
        case Provider.GEMINI:
          result = await callGemini(apiKey, model, messages, providerOpts);
          break;
        case Provider.OPENAI:
          result = await callOpenAI(apiKey, model, messages, providerOpts);
          break;
        case Provider.ANTHROPIC:
          result = await callAnthropic(apiKey, model, messages, providerOpts);
          break;
        default:
          throw new Error(`Unknown provider: ${provider}`);
      }

      return result;
    } catch (err) {
      lastError = err;
      const errorType = err.errorType ?? ErrorType.OTHER;

      if (
        errorType === ErrorType.TOKEN_LIMIT ||
        errorType === ErrorType.UNSUPPORTED_MODEL
      ) {
        throw err;
      }

      if (!isRetriable(errorType) || retries >= maxRetries) {
        throw err;
      }

      console.warn(
        `[invoke_llm] [${model}] Retry ${retries + 1}/${maxRetries} after ${errorType}: ${err.message}`
      );
    }
  }

  throw lastError;
}

export { Models, Provider, getProviderForModel, getApiKeyForProvider };
