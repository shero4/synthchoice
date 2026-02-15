/**
 * Firestore Data Models for SynthChoice
 * These JSDoc types provide editor autocomplete and documentation
 */

// ============================================================================
// FEATURE SCHEMA
// ============================================================================

/**
 * @typedef {'continuous' | 'categorical' | 'binary'} FeatureType
 */

/**
 * @typedef {Object} Feature
 * @property {string} key - Unique identifier for the feature
 * @property {string} label - Display label
 * @property {FeatureType} type - Feature type
 * @property {string} [unit] - Unit for continuous features (e.g., "INR", "months")
 * @property {number} [min] - Minimum value for continuous features
 * @property {number} [max] - Maximum value for continuous features
 * @property {string[]} [categories] - Possible values for categorical features
 */

/**
 * @typedef {Object} FeatureSchema
 * @property {number} version - Schema version
 * @property {Feature[]} features - Array of feature definitions
 */

// ============================================================================
// NORMALIZATION
// ============================================================================

/**
 * @typedef {'manual' | 'llm'} NormalizationMode
 */

/**
 * @typedef {Object} NormalizationConfig
 * @property {NormalizationMode} mode - How alternatives were normalized
 * @property {string} notes - Any notes about normalization
 * @property {Date | null} lastNormalizedAt - When last normalized
 */

// ============================================================================
// AGENT TRAITS & SEGMENTS
// ============================================================================

/**
 * @typedef {Object} AgentTraits
 * @property {string} [location] - Geographic location
 * @property {string} [personality] - Personality type (e.g., "ENTJ")
 * @property {number} [priceSensitivity] - 0..1 scale
 * @property {number} [riskTolerance] - 0..1 scale
 * @property {number} [consistency] - 0..1 scale (how consistent in choices)
 */

/**
 * @typedef {Object} AgentSegment
 * @property {string} segmentId - Unique segment identifier
 * @property {string} label - Display label
 * @property {number} count - Number of agents in this segment
 * @property {AgentTraits} traits - Default traits for agents in this segment
 * @property {string} [modelTag] - LLM model tag (e.g., "gpt")
 */

/**
 * @typedef {Object} AgentPlan
 * @property {number} totalAgents - Total number of agents
 * @property {AgentSegment[]} segments - Array of segment definitions
 */

/**
 * @typedef {Object} CustomPersonality
 * @property {string} id - Unique identifier
 * @property {string} label - Display label
 * @property {string} [description] - Optional description
 * @property {AgentTraits} traits - Trait values
 */

/**
 * @typedef {Object} CustomLocation
 * @property {string} id - Unique identifier
 * @property {string} label - Display label
 */

/**
 * @typedef {Object} AgentConfig
 * @property {string[]} selectedModels - Selected model preset IDs
 * @property {string[]} selectedPersonalities - Selected personality preset IDs
 * @property {string[]} selectedLocations - Selected location preset IDs
 * @property {number} agentsPerCombo - Number of agents per combination
 * @property {CustomPersonality[]} customPersonalities - User-defined personalities
 * @property {CustomLocation[]} customLocations - User-defined locations
 */

// ============================================================================
// EXPERIMENT
// ============================================================================

/**
 * @typedef {'draft' | 'ready' | 'archived'} ExperimentStatus
 */

/**
 * @typedef {Object} Experiment
 * @property {string} id - Firestore document ID
 * @property {string} name - Experiment name
 * @property {string} description - Experiment description
 * @property {string} ownerUid - Owner's Firebase UID
 * @property {ExperimentStatus} status - Current status
 * @property {FeatureSchema} featureSchema - Feature definitions
 * @property {NormalizationConfig} normalization - Normalization settings
 * @property {AgentPlan} agentPlan - Agent configuration (generated from agentConfig)
 * @property {AgentConfig} [agentConfig] - Simplified agent configuration
 * @property {Date} createdAt - Creation timestamp
 * @property {Date} updatedAt - Last update timestamp
 */

// ============================================================================
// ALTERNATIVE
// ============================================================================

/**
 * @typedef {Object} SpriteConfig
 * @property {string} seed - Deterministic seed for sprite generation
 * @property {string} style - Sprite style (e.g., "pixel")
 * @property {string} [storagePath] - Firebase Storage path if image stored
 */

/**
 * @typedef {Object} AlternativeDisplay
 * @property {string} title - Display title
 * @property {string[]} bullets - Bullet points for display
 */

/**
 * @typedef {Object} Alternative
 * @property {string} id - Firestore document ID
 * @property {string} name - Alternative name
 * @property {string} rawInput - Original input text
 * @property {Object<string, any>} features - Feature values keyed by feature key
 * @property {AlternativeDisplay} display - Display configuration
 * @property {SpriteConfig} sprite - Sprite configuration
 * @property {Date} createdAt - Creation timestamp
 * @property {Date} updatedAt - Last update timestamp
 */

// ============================================================================
// AGENT (optional, can be generated at runtime)
// ============================================================================

/**
 * @typedef {Object} Agent
 * @property {string} id - Firestore document ID
 * @property {string} segmentId - Which segment this agent belongs to
 * @property {string} label - Display label (e.g., "Agent #12")
 * @property {AgentTraits} traits - Agent's traits
 * @property {string} [modelTag] - LLM model tag
 * @property {SpriteConfig} sprite - Sprite configuration
 * @property {Date} createdAt - Creation timestamp
 */

// ============================================================================
// RUN
// ============================================================================

/**
 * @typedef {'running' | 'paused' | 'complete' | 'failed'} RunStatus
 */

/**
 * @typedef {Object} RunProgress
 * @property {number} totalTasks - Total number of tasks
 * @property {number} completedTasks - Number of completed tasks
 */

/**
 * @typedef {Object} RunConfigSnapshot
 * @property {number} featureSchemaVersion - Schema version at time of run
 * @property {AgentPlan} agentPlan - Agent plan snapshot
 */

/**
 * @typedef {Object} Run
 * @property {string} id - Firestore document ID
 * @property {string} experimentId - Parent experiment ID
 * @property {RunStatus} status - Current run status
 * @property {Date} startedAt - When run started
 * @property {Date | null} completedAt - When run completed
 * @property {RunConfigSnapshot} configSnapshot - Config at time of run
 * @property {RunProgress} progress - Current progress
 */

// ============================================================================
// TASK
// ============================================================================

/**
 * @typedef {Object} Task
 * @property {string} id - Firestore document ID
 * @property {string} agentId - Which agent this task is for
 * @property {string[]} shownAlternatives - Alternative IDs in display order
 * @property {boolean} isHoldout - Whether this is a holdout task
 * @property {string | null} isRepeatOf - If repeat, which task ID it repeats
 * @property {Date} createdAt - Creation timestamp
 */

// ============================================================================
// RESPONSE
// ============================================================================

/**
 * @typedef {Object} ResponseTimings
 * @property {Date} startedAt - When response started
 * @property {Date} endedAt - When response completed
 */

/**
 * @typedef {Object} Response
 * @property {string} id - Firestore document ID
 * @property {string} taskId - Which task this responds to
 * @property {string} agentId - Which agent responded
 * @property {string} chosen - Chosen alternative ID or "NONE"
 * @property {number} [confidence] - Confidence score 0..1
 * @property {string[]} [reasonCodes] - Feature keys that influenced decision
 * @property {string} [explanation] - Short explanation text
 * @property {ResponseTimings} timings - Timing information
 * @property {Date} createdAt - Creation timestamp
 */

// ============================================================================
// RESULTS SUMMARY
// ============================================================================

/**
 * @typedef {Object<string, number>} SharesMap
 * Key is alternative ID, value is share (0..1)
 */

/**
 * @typedef {Object<string, SharesMap>} SegmentSharesMap
 * Key is segment ID, value is shares map
 */

/**
 * @typedef {Object<string, number>} ImportanceMap
 * Key is feature key, value is importance score (0..1)
 */

/**
 * @typedef {Object<string, ImportanceMap>} SegmentImportanceMap
 * Key is segment ID, value is importance map
 */

/**
 * @typedef {Object} ResultsSummary
 * @property {Date} computedAt - When results were computed
 * @property {Object} shares - Choice shares
 * @property {SharesMap} shares.overall - Overall shares
 * @property {SegmentSharesMap} shares.bySegment - Shares by segment
 * @property {Object} featureImportance - Feature importance
 * @property {ImportanceMap} featureImportance.overall - Overall importance
 * @property {SegmentImportanceMap} featureImportance.bySegment - Importance by segment
 */

// ============================================================================
// DEFAULT VALUES / FACTORIES
// ============================================================================

/**
 * Create a default experiment object
 * @param {string} ownerUid
 * @returns {Omit<Experiment, 'id' | 'createdAt' | 'updatedAt'>}
 */
export function createDefaultExperiment(ownerUid) {
  return {
    name: "",
    description: "",
    ownerUid,
    status: "draft",
    featureSchema: {
      version: 1,
      features: [],
    },
    normalization: {
      mode: "manual",
      notes: "",
      lastNormalizedAt: null,
    },
    agentPlan: {
      totalAgents: 0,
      segments: [],
    },
    agentConfig: {
      selectedModels: [],
      selectedPersonalities: [],
      selectedLocations: [],
      agentsPerCombo: 1,
      customPersonalities: [],
      customLocations: [],
    },
  };
}

/**
 * Create a default feature
 * @returns {Feature}
 */
export function createDefaultFeature() {
  return {
    key: "",
    label: "",
    type: "continuous",
    unit: "",
    min: 0,
    max: 100,
  };
}

/**
 * Create a default agent segment
 * @returns {AgentSegment}
 */
export function createDefaultSegment() {
  return {
    segmentId: "",
    label: "",
    count: 10,
    traits: {
      location: "",
      personality: "",
      priceSensitivity: 0.5,
      riskTolerance: 0.5,
      consistency: 0.7,
    },
    modelTag: "stub",
  };
}

/**
 * Create a default agent config
 * @returns {AgentConfig}
 */
export function createDefaultAgentConfig() {
  return {
    selectedModels: [],
    selectedPersonalities: [],
    selectedLocations: [],
    agentsPerCombo: 1,
    customPersonalities: [],
    customLocations: [],
  };
}

/**
 * Create a default alternative
 * @returns {Omit<Alternative, 'id' | 'createdAt' | 'updatedAt'>}
 */
export function createDefaultAlternative() {
  return {
    name: "",
    rawInput: "",
    features: {},
    display: {
      title: "",
      bullets: [],
    },
    sprite: {
      seed: Math.random().toString(36).substring(7),
      style: "pixel",
      storagePath: "",
    },
  };
}
