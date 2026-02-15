/**
 * LLM Models enum
 * Maps model identifiers to their API model IDs.
 * Use getProviderForModel() to determine which provider/API key to use.
 */
export const Models = Object.freeze({
  // Gemini (direct Google API)
  GEMINI_2_FLASH_IMAGE: "gemini-2.0-flash-exp-image-generation",
  GEMINI_2_FLASH: "gemini-2.0-flash",

  // OpenRouter (routes to various backends)
  GEMINI_2_5_FLASH_IMAGE_PREVIEW: "google/gemini-2.5-flash-image-preview",
  GEMINI_2_FLASH_OPENROUTER: "google/gemini-2.0-flash-001",
  CLAUDE_3_5_SONNET: "anthropic/claude-3.5-sonnet",
  CLAUDE_3_OPUS: "anthropic/claude-3-opus-4",
  GPT_4O: "openai/gpt-4o",
  GPT_4O_MINI: "openai/gpt-4o-mini",

  // OpenAI (direct API)
  GPT_4_1_MINI: "gpt-4.1-mini",
  GPT_4O_OPENAI: "gpt-4o",

  // Anthropic (direct API)
  CLAUDE_3_5_SONNET_ANTHROPIC: "claude-3-5-sonnet-20241022",
  CLAUDE_3_OPUS_ANTHROPIC: "claude-3-opus-4-20250514",
});
