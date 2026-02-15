function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function toNumber(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

const PERSONA_WEIGHT_PRESETS = {
  analytical: { price: -0.25, quality: 0.35, speed: 0.25, comfort: 0.15 },
  price_sensitive: { price: -0.6, quality: 0.2, speed: 0.1, comfort: 0.1 },
  premium: { price: -0.1, quality: 0.45, speed: 0.15, comfort: 0.3 },
  default: { price: -0.25, quality: 0.25, speed: 0.25, comfort: 0.25 },
};

function scoreOption(option, weights) {
  const features = option?.features || {};
  const score =
    toNumber(features.price) * (weights.price || 0) +
    toNumber(features.quality) * (weights.quality || 0) +
    toNumber(features.speed) * (weights.speed || 0) +
    toNumber(features.comfort) * (weights.comfort || 0);
  return score;
}

function pickReason(weights, choice) {
  const sorted = Object.entries(weights)
    .sort((left, right) => Math.abs(right[1]) - Math.abs(left[1]))
    .map(([feature]) => feature);
  const topFeature = sorted[0] || "overall balance";
  return `I chose ${choice.label} because ${topFeature} mattered most for me.`;
}

export function decideTaskChoice({ character, task, random }) {
  const options = task?.options || [];
  if (options.length === 0) {
    return {
      chosenOption: null,
      confidence: 0,
      reason: "No option was available.",
    };
  }

  const presetKey = character?.segment || "default";
  const weights =
    PERSONA_WEIGHT_PRESETS[presetKey] || PERSONA_WEIGHT_PRESETS.default;

  const scored = options.map((option) => ({
    option,
    score: scoreOption(option, weights),
  }));

  const noise =
    (random?.next?.() ?? Math.random()) * (character?.noise ?? 0) * 2 - 1;
  scored.sort((left, right) => right.score - left.score);

  const winner = noise > 0.5 && scored[1] ? scored[1] : scored[0];
  const delta = Math.abs((scored[0]?.score || 0) - (scored[1]?.score || 0));

  return {
    chosenOption: winner.option,
    confidence: clamp(Math.round((1 / (1 + Math.exp(-delta))) * 100), 5, 99),
    reason: pickReason(weights, winner.option),
    scoreDelta: delta,
  };
}
