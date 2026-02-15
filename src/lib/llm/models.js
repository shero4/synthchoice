/**
 * LLM Models enum
 * Maps model identifiers to their API model IDs.
 * Use getProviderForModel() to determine which provider/API key to use.
 */
export const Models = Object.freeze({
  // Gemini (direct Google API)
  GEMINI_2_FLASH: "gemini-2.0-flash",
  GEMINI_2_5_FLASH: "gemini-2.5-flash",
  GEMINI_3: "gemini-3",

  // OpenRouter (routes to various backends)
  GEMINI_2_5_FLASH_OPENROUTER: "google/gemini-2.5-flash",
  GEMINI_2_FLASH_OPENROUTER: "google/gemini-2.0-flash",
  CLAUDE_SONNET_4_5: "anthropic/claude-sonnet-4.5",
  CLAUDE_OPUS_4_6: "anthropic/claude-opus-4.6",
  CLAUDE_HAIKU_4_5: "anthropic/claude-haiku-4.5",
  GPT_5_2: "openai/gpt-5.2",
  GPT_5_3_CODEX: "openai/gpt-5.3-codex",

  // Anthropic (direct API)
  CLAUDE_SONNET_4_5_ANTHROPIC: "claude-sonnet-4-5-20250929",
  CLAUDE_OPUS_4_6_ANTHROPIC: "claude-opus-4-6",
  CLAUDE_HAIKU_4_5_ANTHROPIC: "claude-haiku-4-5-20251001",

  // OpenAI (direct API)
  GPT_5_2_OPENAI: "gpt-5.2",
});
