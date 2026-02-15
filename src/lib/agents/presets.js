/**
 * Agent Configuration Presets
 * Predefined traits, personalities, locations, and model mappings
 */

// ============================================================================
// MBTI PERSONALITIES
// ============================================================================

/**
 * All 16 MBTI personality types with mapped trait values
 */
export const MBTI_PERSONALITIES = Object.freeze({
  // Analysts
  INTJ: {
    id: "INTJ",
    label: "INTJ - Architect",
    description: "Strategic, independent",
    traits: {
      personality: "INTJ",
      priceSensitivity: 0.4,
      riskTolerance: 0.6,
      consistency: 0.9,
    },
  },
  INTP: {
    id: "INTP",
    label: "INTP - Logician",
    description: "Analytical, curious",
    traits: {
      personality: "INTP",
      priceSensitivity: 0.5,
      riskTolerance: 0.5,
      consistency: 0.7,
    },
  },
  ENTJ: {
    id: "ENTJ",
    label: "ENTJ - Commander",
    description: "Bold, decisive",
    traits: {
      personality: "ENTJ",
      priceSensitivity: 0.2,
      riskTolerance: 0.8,
      consistency: 0.9,
    },
  },
  ENTP: {
    id: "ENTP",
    label: "ENTP - Debater",
    description: "Smart, curious",
    traits: {
      personality: "ENTP",
      priceSensitivity: 0.3,
      riskTolerance: 0.7,
      consistency: 0.5,
    },
  },

  // Diplomats
  INFJ: {
    id: "INFJ",
    label: "INFJ - Advocate",
    description: "Idealistic, principled",
    traits: {
      personality: "INFJ",
      priceSensitivity: 0.6,
      riskTolerance: 0.4,
      consistency: 0.8,
    },
  },
  INFP: {
    id: "INFP",
    label: "INFP - Mediator",
    description: "Poetic, kind",
    traits: {
      personality: "INFP",
      priceSensitivity: 0.7,
      riskTolerance: 0.3,
      consistency: 0.6,
    },
  },
  ENFJ: {
    id: "ENFJ",
    label: "ENFJ - Protagonist",
    description: "Charismatic, inspiring",
    traits: {
      personality: "ENFJ",
      priceSensitivity: 0.4,
      riskTolerance: 0.5,
      consistency: 0.8,
    },
  },
  ENFP: {
    id: "ENFP",
    label: "ENFP - Campaigner",
    description: "Enthusiastic, creative",
    traits: {
      personality: "ENFP",
      priceSensitivity: 0.4,
      riskTolerance: 0.6,
      consistency: 0.4,
    },
  },

  // Sentinels
  ISTJ: {
    id: "ISTJ",
    label: "ISTJ - Logistician",
    description: "Practical, reliable",
    traits: {
      personality: "ISTJ",
      priceSensitivity: 0.7,
      riskTolerance: 0.2,
      consistency: 0.95,
    },
  },
  ISFJ: {
    id: "ISFJ",
    label: "ISFJ - Defender",
    description: "Dedicated, warm",
    traits: {
      personality: "ISFJ",
      priceSensitivity: 0.8,
      riskTolerance: 0.2,
      consistency: 0.9,
    },
  },
  ESTJ: {
    id: "ESTJ",
    label: "ESTJ - Executive",
    description: "Organized, logical",
    traits: {
      personality: "ESTJ",
      priceSensitivity: 0.5,
      riskTolerance: 0.4,
      consistency: 0.9,
    },
  },
  ESFJ: {
    id: "ESFJ",
    label: "ESFJ - Consul",
    description: "Caring, social",
    traits: {
      personality: "ESFJ",
      priceSensitivity: 0.6,
      riskTolerance: 0.3,
      consistency: 0.8,
    },
  },

  // Explorers
  ISTP: {
    id: "ISTP",
    label: "ISTP - Virtuoso",
    description: "Bold, practical",
    traits: {
      personality: "ISTP",
      priceSensitivity: 0.5,
      riskTolerance: 0.7,
      consistency: 0.6,
    },
  },
  ISFP: {
    id: "ISFP",
    label: "ISFP - Adventurer",
    description: "Flexible, charming",
    traits: {
      personality: "ISFP",
      priceSensitivity: 0.6,
      riskTolerance: 0.5,
      consistency: 0.5,
    },
  },
  ESTP: {
    id: "ESTP",
    label: "ESTP - Entrepreneur",
    description: "Smart, energetic",
    traits: {
      personality: "ESTP",
      priceSensitivity: 0.3,
      riskTolerance: 0.8,
      consistency: 0.4,
    },
  },
  ESFP: {
    id: "ESFP",
    label: "ESFP - Entertainer",
    description: "Spontaneous, fun",
    traits: {
      personality: "ESFP",
      priceSensitivity: 0.4,
      riskTolerance: 0.6,
      consistency: 0.3,
    },
  },
});

// ============================================================================
// BEHAVIORAL ARCHETYPES
// ============================================================================

/**
 * Behavioral archetypes for simpler selection
 */
export const BEHAVIORAL_ARCHETYPES = Object.freeze({
  BUDGET_CONSCIOUS: {
    id: "BUDGET_CONSCIOUS",
    label: "Budget-Conscious",
    description: "Prioritizes value and savings",
    traits: {
      personality: "Budget-Conscious",
      priceSensitivity: 0.9,
      riskTolerance: 0.2,
      consistency: 0.8,
    },
  },
  RISK_TAKER: {
    id: "RISK_TAKER",
    label: "Risk-Taker",
    description: "Willing to take chances for potential gains",
    traits: {
      personality: "Risk-Taker",
      priceSensitivity: 0.2,
      riskTolerance: 0.9,
      consistency: 0.5,
    },
  },
  BALANCED: {
    id: "BALANCED",
    label: "Balanced",
    description: "Moderate approach to decisions",
    traits: {
      personality: "Balanced",
      priceSensitivity: 0.5,
      riskTolerance: 0.5,
      consistency: 0.7,
    },
  },
  IMPULSIVE_BUYER: {
    id: "IMPULSIVE_BUYER",
    label: "Impulsive Buyer",
    description: "Makes quick, spontaneous decisions",
    traits: {
      personality: "Impulsive Buyer",
      priceSensitivity: 0.2,
      riskTolerance: 0.6,
      consistency: 0.3,
    },
  },
  ANALYTICAL: {
    id: "ANALYTICAL",
    label: "Analytical",
    description: "Carefully researches before deciding",
    traits: {
      personality: "Analytical",
      priceSensitivity: 0.5,
      riskTolerance: 0.4,
      consistency: 0.95,
    },
  },
});

// ============================================================================
// ALL PERSONALITY PRESETS (combined)
// ============================================================================

/**
 * All personality presets combined for easy lookup
 */
export const ALL_PERSONALITY_PRESETS = Object.freeze({
  ...MBTI_PERSONALITIES,
  ...BEHAVIORAL_ARCHETYPES,
});

/**
 * Get personality preset by ID
 * @param {string} id - Preset ID
 * @returns {Object|null} Preset object or null if not found
 */
export function getPersonalityPreset(id) {
  return ALL_PERSONALITY_PRESETS[id] || null;
}

// ============================================================================
// LOCATION PRESETS
// ============================================================================

/**
 * Predefined location options
 */
export const LOCATION_PRESETS = Object.freeze([
  // North America
  { id: "san_francisco", label: "San Francisco", region: "North America" },
  { id: "new_york", label: "New York", region: "North America" },
  { id: "los_angeles", label: "Los Angeles", region: "North America" },
  { id: "chicago", label: "Chicago", region: "North America" },
  { id: "toronto", label: "Toronto", region: "North America" },

  // Europe
  { id: "london", label: "London", region: "Europe" },
  { id: "berlin", label: "Berlin", region: "Europe" },
  { id: "paris", label: "Paris", region: "Europe" },
  { id: "amsterdam", label: "Amsterdam", region: "Europe" },

  // Asia
  { id: "mumbai", label: "Mumbai", region: "Asia" },
  { id: "bangalore", label: "Bangalore", region: "Asia" },
  { id: "delhi", label: "Delhi", region: "Asia" },
  { id: "tokyo", label: "Tokyo", region: "Asia" },
  { id: "singapore", label: "Singapore", region: "Asia" },
  { id: "shanghai", label: "Shanghai", region: "Asia" },
  { id: "seoul", label: "Seoul", region: "Asia" },

  // Australia
  { id: "sydney", label: "Sydney", region: "Australia" },
  { id: "melbourne", label: "Melbourne", region: "Australia" },

  // South America
  { id: "sao_paulo", label: "São Paulo", region: "South America" },

  // Middle East
  { id: "dubai", label: "Dubai", region: "Middle East" },
]);

/**
 * Get locations grouped by region
 * @returns {Object} Locations grouped by region
 */
export function getLocationsByRegion() {
  return LOCATION_PRESETS.reduce((acc, loc) => {
    if (!acc[loc.region]) {
      acc[loc.region] = [];
    }
    acc[loc.region].push(loc);
    return acc;
  }, {});
}

// ============================================================================
// MODEL PRESETS
// ============================================================================

/**
 * Available models for agent configuration
 * Maps to the Models enum in src/lib/llm/models.js
 */
export const MODEL_PRESETS = Object.freeze([
  // Stub for testing
  {
    id: "stub",
    label: "Stub (Testing)",
    description: "Mock responses for testing",
    modelTag: "stub",
  },

  // Gemini
  {
    id: "gemini_2_5_flash",
    label: "Gemini 2.5 Flash",
    description: "Fast with 1M context",
    modelTag: "google/gemini-2.5-flash",
  },
  {
    id: "gemini_2_0_flash",
    label: "Gemini 2.0 Flash",
    description: "Fast and capable (via OpenRouter)",
    modelTag: "google/gemini-2.0-flash-001",
  },

  // Claude
  {
    id: "claude_sonnet_4",
    label: "Claude Sonnet 4",
    description: "Best balance of speed and intelligence",
    modelTag: "anthropic/claude-sonnet-4",
  },
  {
    id: "claude_opus_4",
    label: "Claude Opus 4",
    description: "Most intelligent, complex tasks",
    modelTag: "anthropic/claude-opus-4",
  },
  {
    id: "claude_haiku_4_5",
    label: "Claude Haiku 4.5",
    description: "Fastest Claude model",
    modelTag: "anthropic/claude-haiku-4.5",
  },

  // GPT
  {
    id: "gpt_5",
    label: "GPT-5",
    description: "400K context, complex reasoning",
    modelTag: "openai/gpt-5",
  },
  {
    id: "gpt_5_mini",
    label: "GPT-5 Mini",
    description: "Cost-optimized, balanced performance",
    modelTag: "openai/gpt-5-mini",
  },
]);

/**
 * Get model preset by ID
 * @param {string} id - Model preset ID
 * @returns {Object|null} Model preset or null
 */
export function getModelPreset(id) {
  return MODEL_PRESETS.find((m) => m.id === id) || null;
}

/**
 * Get model preset by model tag
 * @param {string} modelTag - The model tag
 * @returns {Object|null} Model preset or null
 */
export function getModelPresetByTag(modelTag) {
  return MODEL_PRESETS.find((m) => m.modelTag === modelTag) || null;
}

// ============================================================================
// SEGMENT GENERATION
// ============================================================================

/**
 * Generate segments from agent configuration
 * @param {Object} config - Agent configuration
 * @param {string[]} config.selectedModels - Selected model IDs
 * @param {string[]} config.selectedPersonalities - Selected personality IDs
 * @param {string[]} config.selectedLocations - Selected location IDs
 * @param {number} config.agentsPerCombo - Number of agents per combination
 * @param {Object[]} [config.customPersonalities] - Custom personality definitions
 * @returns {Object[]} Generated segments
 */
export function generateSegmentsFromConfig(config) {
  const {
    selectedModels = [],
    selectedPersonalities = [],
    selectedLocations = [],
    agentsPerCombo = 1,
    customPersonalities = [],
  } = config;

  const segments = [];

  // Build custom personalities lookup
  const customLookup = customPersonalities.reduce((acc, p) => {
    acc[p.id] = p;
    return acc;
  }, {});

  for (const modelId of selectedModels) {
    const model = getModelPreset(modelId);
    if (!model) continue;

    for (const personalityId of selectedPersonalities) {
      // Look up personality from presets or custom
      const personality =
        ALL_PERSONALITY_PRESETS[personalityId] || customLookup[personalityId];
      if (!personality) continue;

      for (const locationId of selectedLocations) {
        // Look up location from presets or use as custom string
        const locationPreset = LOCATION_PRESETS.find((l) => l.id === locationId);
        const locationLabel = locationPreset ? locationPreset.label : locationId;

        const segmentId = `${modelId}_${personalityId}_${locationId}`.replace(
          /\s+/g,
          "_"
        );

        segments.push({
          segmentId,
          label: `${personality.label} in ${locationLabel}`,
          count: agentsPerCombo,
          modelTag: model.modelTag,
          traits: {
            ...personality.traits,
            location: locationLabel,
          },
        });
      }
    }
  }

  return segments;
}

/**
 * Calculate total agents from configuration
 * @param {Object} config - Agent configuration
 * @returns {number} Total number of agents
 */
export function calculateTotalAgents(config) {
  const {
    selectedModels = [],
    selectedPersonalities = [],
    selectedLocations = [],
    agentsPerCombo = 1,
  } = config;

  return (
    selectedModels.length *
    selectedPersonalities.length *
    selectedLocations.length *
    agentsPerCombo
  );
}
