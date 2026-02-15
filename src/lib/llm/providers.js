/**
 * LLM Providers and model-to-provider mapping
 */
import { Models } from "./models";

export const Provider = Object.freeze({
  GEMINI: "gemini",
  OPENAI: "openai",
  ANTHROPIC: "anthropic",
  OPENROUTER: "openrouter",
});

/** @type {Record<string, string>} Model ID -> Provider */
export const MODEL_TO_PROVIDER = Object.freeze({
  // Gemini (direct Google API)
  [Models.GEMINI_2_FLASH]: Provider.GEMINI,
  [Models.GEMINI_2_5_FLASH]: Provider.GEMINI,
  [Models.GEMINI_2_5_FLASH_IMAGE]: Provider.GEMINI,
  [Models.GEMINI_3]: Provider.GEMINI,

  // OpenRouter
  [Models.GEMINI_2_5_FLASH_OPENROUTER]: Provider.OPENROUTER,
  [Models.GEMINI_2_5_FLASH_IMAGE_PREVIEW]: Provider.OPENROUTER,
  [Models.GEMINI_2_FLASH_OPENROUTER]: Provider.OPENROUTER,
  [Models.CLAUDE_SONNET_4_5]: Provider.OPENROUTER,
  [Models.CLAUDE_OPUS_4_6]: Provider.OPENROUTER,
  [Models.CLAUDE_HAIKU_4_5]: Provider.OPENROUTER,
  [Models.GPT_5_2]: Provider.OPENROUTER,
  [Models.GPT_5_3_CODEX]: Provider.OPENROUTER,

  // OpenAI (direct API)
  [Models.GPT_5_2_OPENAI]: Provider.OPENAI,
  [Models.GPT_4_1_MINI]: Provider.OPENAI,

  // Anthropic (direct API)
  [Models.CLAUDE_SONNET_4_5_ANTHROPIC]: Provider.ANTHROPIC,
  [Models.CLAUDE_OPUS_4_6_ANTHROPIC]: Provider.ANTHROPIC,
  [Models.CLAUDE_HAIKU_4_5_ANTHROPIC]: Provider.ANTHROPIC,
});

const PROVIDER_ENV_KEYS = Object.freeze({
  [Provider.GEMINI]: "GEMINI_API_KEY",
  [Provider.OPENAI]: "OPENAI_API_KEY",
  [Provider.ANTHROPIC]: "ANTHROPIC_API_KEY",
  [Provider.OPENROUTER]: "OPENROUTER_API_KEY",
});

/**
 * Get the provider for a given model
 * @param {string} modelId - Model ID from Models enum
 * @returns {string} Provider key
 */
export function getProviderForModel(modelId) {
  const provider = MODEL_TO_PROVIDER[modelId];
  if (!provider) {
    throw new Error(`Unknown model: ${modelId}. Add to MODEL_TO_PROVIDER.`);
  }
  return provider;
}

/**
 * Get the API key for a provider from environment
 * @param {string} provider - Provider key from Provider enum
 * @returns {string}
 */
export function getApiKeyForProvider(provider) {
  const envKey = PROVIDER_ENV_KEYS[provider];
  if (!envKey) {
    throw new Error(`Unknown provider: ${provider}`);
  }
  const key = process.env[envKey];
  if (!key) {
    throw new Error(`${envKey} not configured`);
  }
  return key;
}
