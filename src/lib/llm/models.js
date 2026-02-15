/**
 * LLM Models enum
 * Maps model identifiers to their API model IDs.
 * Use getProviderForModel() to determine which provider/API key to use.
 *
 * Last validated: Feb 2026
 */
export const Models = Object.freeze({
  // Gemini (direct Google API)
  GEMINI_2_5_FLASH: "gemini-2.5-flash",
  GEMINI_2_5_FLASH_IMAGE: "gemini-2.5-flash-image",
  GEMINI_3_FLASH: "gemini-3-flash-preview",
  GEMINI_3_PRO: "gemini-3-pro-preview",

  // OpenRouter (routes to various backends)
  GEMINI_2_5_FLASH_OPENROUTER: "google/gemini-2.5-flash",
  GEMINI_2_0_FLASH_OPENROUTER: "google/gemini-2.0-flash-001",
  GEMINI_2_5_FLASH_IMAGE_PREVIEW: "google/gemini-2.5-flash-image-preview",
  CLAUDE_SONNET_4: "anthropic/claude-sonnet-4",
  CLAUDE_OPUS_4: "anthropic/claude-opus-4",
  CLAUDE_HAIKU_4_5: "anthropic/claude-haiku-4.5",
  GPT_5: "openai/gpt-5",
  GPT_5_MINI: "openai/gpt-5-mini",

  // Anthropic (direct API)
  CLAUDE_SONNET_4_5_ANTHROPIC: "claude-sonnet-4-5-20250929",
  CLAUDE_OPUS_4_6_ANTHROPIC: "claude-opus-4-6",
  CLAUDE_HAIKU_4_5_ANTHROPIC: "claude-haiku-4-5-20251001",

  // OpenAI (direct API)
  GPT_5_2_OPENAI: "gpt-5.2",
  GPT_4_1_MINI: "gpt-4.1-mini",
});
