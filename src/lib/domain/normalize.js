/**
 * Normalization Helpers
 * Convert raw input to structured alternatives
 */

/**
 * Parse raw text input into alternative objects
 * @param {string} rawInput - Raw text input
 * @param {import('@/models/firestore').Feature[]} features - Feature schema
 * @returns {{ alternatives: Object[], errors: string[] }}
 */
export function parseTextInput(rawInput, features) {
  const alternatives = [];
  const errors = [];

  if (!rawInput || !rawInput.trim()) {
    return { alternatives: [], errors: ["No input provided"] };
  }

  const lines = rawInput
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  lines.forEach((line, index) => {
    try {
      // Try to parse as "Name: description" format
      const colonIndex = line.indexOf(":");
      let name = `Alternative ${index + 1}`;
      let description = line;

      if (colonIndex > 0 && colonIndex < 50) {
        name = line.substring(0, colonIndex).trim();
        description = line.substring(colonIndex + 1).trim();
      }

      const alternative = {
        name,
        rawInput: line,
        features: {},
        display: {
          title: name,
          bullets: [],
        },
      };

      // TODO: Implement actual feature extraction from description
      // For now, leave features empty for manual input
      // This is a placeholder for LLM-based normalization

      alternatives.push(alternative);
    } catch (error) {
      errors.push(`Error parsing line ${index + 1}: ${error.message}`);
    }
  });

  return { alternatives, errors };
}

/**
 * Parse JSON input into alternative objects
 * @param {string} jsonInput - JSON string
 * @param {import('@/models/firestore').Feature[]} features - Feature schema
 * @returns {{ alternatives: Object[], errors: string[] }}
 */
export function parseJsonInput(jsonInput, features) {
  const alternatives = [];
  const errors = [];

  try {
    const parsed = JSON.parse(jsonInput);

    if (!Array.isArray(parsed)) {
      errors.push("JSON input must be an array");
      return { alternatives: [], errors };
    }

    parsed.forEach((item, index) => {
      if (typeof item !== "object" || item === null) {
        errors.push(`Item ${index + 1} must be an object`);
        return;
      }

      const alternative = {
        name: item.name || `Alternative ${index + 1}`,
        rawInput: JSON.stringify(item),
        features: {},
        display: {
          title: item.name || item.title || `Alternative ${index + 1}`,
          bullets: item.bullets || [],
        },
      };

      // Map known fields to features
      features.forEach((feature) => {
        if (item[feature.key] !== undefined) {
          alternative.features[feature.key] = item[feature.key];
        } else if (item.features && item.features[feature.key] !== undefined) {
          alternative.features[feature.key] = item.features[feature.key];
        }
      });

      alternatives.push(alternative);
    });
  } catch (error) {
    errors.push(`Invalid JSON: ${error.message}`);
  }

  return { alternatives, errors };
}

/**
 * Auto-detect input format and parse
 * @param {string} input - Raw input
 * @param {import('@/models/firestore').Feature[]} features - Feature schema
 * @returns {{ alternatives: Object[], errors: string[], format: 'json' | 'text' }}
 */
export function parseInput(input, features) {
  const trimmed = input.trim();

  // Check if it looks like JSON
  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    try {
      const result = parseJsonInput(trimmed, features);
      return { ...result, format: "json" };
    } catch {
      // Fall through to text parsing
    }
  }

  const result = parseTextInput(input, features);
  return { ...result, format: "text" };
}

/**
 * Validate alternatives against schema
 * @param {Object[]} alternatives - Parsed alternatives
 * @param {import('@/models/firestore').Feature[]} features - Feature schema
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateAlternatives(alternatives, features) {
  const errors = [];

  if (!alternatives || alternatives.length === 0) {
    errors.push("At least one alternative is required");
    return { valid: false, errors };
  }

  alternatives.forEach((alt, index) => {
    if (!alt.name) {
      errors.push(`Alternative ${index + 1} is missing a name`);
    }

    // Check for required features
    features.forEach((feature) => {
      const value = alt.features?.[feature.key];
      if (value === undefined || value === null) {
        errors.push(`Alternative "${alt.name}" is missing feature "${feature.label || feature.key}"`);
      }
    });
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}
