/**
 * Simulation Engine (Stub)
 * Simple utility-based decision engine for v1
 * 
 * TODO: Replace with LLM-based simulation in v1.5+
 */

import { normalizeValue } from "./schema";

/**
 * Calculate utility score for an alternative given an agent
 * @param {Object} agent - Agent with traits
 * @param {Object} alternative - Alternative with features
 * @param {import('@/models/firestore').Feature[]} features - Feature schema
 * @returns {{ score: number, contributions: Object }}
 */
function calculateUtility(agent, alternative, features) {
  let score = 0;
  const contributions = {};
  const traits = agent.traits || {};

  features.forEach((feature) => {
    const value = alternative.features?.[feature.key];
    if (value === undefined) return;

    const normalizedValue = normalizeValue(feature, value);
    let featureScore = 0;

    // Apply trait-based weights
    switch (feature.key.toLowerCase()) {
      case "price":
      case "cost":
        // Price-sensitive agents prefer lower prices
        const priceSensitivity = traits.priceSensitivity || 0.5;
        featureScore = (1 - normalizedValue) * priceSensitivity * 2;
        break;

      case "warranty":
      case "guarantee":
      case "support":
        // Risk-averse agents (low risk tolerance) prefer better warranty
        const riskAversion = 1 - (traits.riskTolerance || 0.5);
        featureScore = normalizedValue * riskAversion * 1.5;
        break;

      case "quality":
      case "reliability":
        // Everyone values quality
        featureScore = normalizedValue * 1.5;
        break;

      default:
        // Default: higher values are better
        featureScore = normalizedValue;
    }

    contributions[feature.key] = featureScore;
    score += featureScore;
  });

  return { score, contributions };
}

/**
 * Add noise to scores based on agent consistency
 * @param {number} score
 * @param {number} consistency - 0..1, higher = less noise
 * @returns {number}
 */
function addNoise(score, consistency) {
  const noiseLevel = (1 - consistency) * 0.5;
  const noise = (Math.random() - 0.5) * noiseLevel;
  return score + noise;
}

/**
 * Simulate a choice for a task
 * @param {Object} params
 * @param {Object} params.agent - Agent making the choice
 * @param {Object[]} params.alternatives - Alternatives to choose from
 * @param {import('@/models/firestore').Feature[]} params.features - Feature schema
 * @param {boolean} params.includeNone - Whether "None" is an option
 * @returns {import('@/models/firestore').Response}
 */
export function simulateChoice({ agent, alternatives, features, includeNone }) {
  const consistency = agent.traits?.consistency || 0.7;
  const scores = [];
  const allContributions = {};

  // Calculate utility for each alternative
  alternatives.forEach((alt) => {
    const { score, contributions } = calculateUtility(agent, alt, features);
    const noisyScore = addNoise(score, consistency);
    scores.push({ id: alt.id, score: noisyScore, rawScore: score });
    allContributions[alt.id] = contributions;
  });

  // Sort by score (descending)
  scores.sort((a, b) => b.score - a.score);

  // Check if "None" should be chosen
  let chosen = scores[0]?.id || "NONE";
  const topScore = scores[0]?.score || 0;

  if (includeNone) {
    // "None" threshold based on agent's overall satisfaction
    const noneThreshold = 0.3;
    if (topScore < noneThreshold) {
      chosen = "NONE";
    }
  }

  // Calculate confidence (difference between top two)
  let confidence = 0.5;
  if (scores.length >= 2) {
    const scoreDiff = scores[0].score - scores[1].score;
    confidence = Math.min(0.5 + scoreDiff, 0.99);
  } else if (scores.length === 1) {
    confidence = 0.8;
  }

  // Determine reason codes (top contributing features)
  const reasonCodes = [];
  if (chosen !== "NONE" && allContributions[chosen]) {
    const sortedContributions = Object.entries(allContributions[chosen])
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
    reasonCodes.push(...sortedContributions.map(([key]) => key));
  }

  // Generate explanation
  const explanation = generateExplanation(chosen, reasonCodes, agent, alternatives);

  return {
    chosen,
    confidence: Math.round(confidence * 100) / 100,
    reasonCodes,
    explanation,
  };
}

/**
 * Generate a simple explanation for the choice
 * @param {string} chosen
 * @param {string[]} reasonCodes
 * @param {Object} agent
 * @param {Object[]} alternatives
 * @returns {string}
 */
function generateExplanation(chosen, reasonCodes, agent, alternatives) {
  if (chosen === "NONE") {
    return "None of the options met my requirements.";
  }

  const alt = alternatives.find((a) => a.id === chosen);
  const altName = alt?.name || "this option";

  if (reasonCodes.length === 0) {
    return `Chose ${altName} based on overall evaluation.`;
  }

  const topReason = reasonCodes[0];
  const reasonPhrase = getReasonPhrase(topReason, agent);

  return `Chose ${altName} primarily due to ${reasonPhrase}.`;
}

/**
 * Get human-readable reason phrase
 * @param {string} featureKey
 * @param {Object} agent
 * @returns {string}
 */
function getReasonPhrase(featureKey, agent) {
  const key = featureKey.toLowerCase();

  switch (key) {
    case "price":
    case "cost":
      return "better pricing";
    case "warranty":
      return "better warranty coverage";
    case "quality":
      return "higher quality";
    case "support":
      return "better support options";
    default:
      return `the ${featureKey} offering`;
  }
}

/**
 * Batch simulate choices for multiple tasks
 * @param {Object} params
 * @param {Object[]} params.tasks - Tasks to simulate
 * @param {Object[]} params.agents - All agents
 * @param {Object[]} params.alternatives - All alternatives
 * @param {import('@/models/firestore').Feature[]} params.features - Feature schema
 * @param {boolean} params.includeNone - Whether "None" is an option
 * @returns {Object[]} Array of responses
 */
export function batchSimulate({ tasks, agents, alternatives, features, includeNone }) {
  const responses = [];

  tasks.forEach((task) => {
    const agent = agents.find((a) => a.id === task.agentId);
    if (!agent) return;

    const taskAlternatives = task.shownAlternatives
      .map((id) => alternatives.find((a) => a.id === id))
      .filter(Boolean);

    const response = simulateChoice({
      agent,
      alternatives: taskAlternatives,
      features,
      includeNone,
    });

    responses.push({
      taskId: task.id,
      agentId: task.agentId,
      ...response,
    });
  });

  return responses;
}
