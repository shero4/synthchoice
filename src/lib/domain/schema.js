/**
 * Feature Schema Helpers
 * Utilities for working with feature schemas
 */

/**
 * Validate a feature schema
 * @param {import('@/models/firestore').FeatureSchema} schema
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateSchema(schema) {
  const errors = [];

  if (!schema) {
    errors.push("Schema is required");
    return { valid: false, errors };
  }

  if (!schema.features || !Array.isArray(schema.features)) {
    errors.push("Schema must have a features array");
    return { valid: false, errors };
  }

  const keys = new Set();
  schema.features.forEach((feature, index) => {
    if (!feature.key) {
      errors.push(`Feature at index ${index} is missing a key`);
    } else if (keys.has(feature.key)) {
      errors.push(`Duplicate feature key: ${feature.key}`);
    } else {
      keys.add(feature.key);
    }

    if (!feature.type) {
      errors.push(`Feature "${feature.key}" is missing a type`);
    } else if (!["continuous", "categorical", "binary"].includes(feature.type)) {
      errors.push(`Feature "${feature.key}" has invalid type: ${feature.type}`);
    }

    if (feature.type === "categorical" && (!feature.categories || feature.categories.length === 0)) {
      errors.push(`Categorical feature "${feature.key}" must have categories`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get default value for a feature type
 * @param {import('@/models/firestore').Feature} feature
 * @returns {any}
 */
export function getDefaultValue(feature) {
  switch (feature.type) {
    case "continuous":
      return feature.min || 0;
    case "categorical":
      return feature.categories?.[0] || "";
    case "binary":
      return false;
    default:
      return null;
  }
}

/**
 * Check if a value is valid for a feature
 * @param {import('@/models/firestore').Feature} feature
 * @param {any} value
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateValue(feature, value) {
  if (value === undefined || value === null) {
    return { valid: false, error: "Value is required" };
  }

  switch (feature.type) {
    case "continuous":
      if (typeof value !== "number") {
        return { valid: false, error: "Value must be a number" };
      }
      if (feature.min !== undefined && value < feature.min) {
        return { valid: false, error: `Value must be at least ${feature.min}` };
      }
      if (feature.max !== undefined && value > feature.max) {
        return { valid: false, error: `Value must be at most ${feature.max}` };
      }
      return { valid: true };

    case "categorical":
      if (feature.categories && !feature.categories.includes(value)) {
        return { valid: false, error: `Value must be one of: ${feature.categories.join(", ")}` };
      }
      return { valid: true };

    case "binary":
      if (typeof value !== "boolean") {
        return { valid: false, error: "Value must be true or false" };
      }
      return { valid: true };

    default:
      return { valid: false, error: "Unknown feature type" };
  }
}

/**
 * Normalize a value to 0-1 range for comparison
 * @param {import('@/models/firestore').Feature} feature
 * @param {any} value
 * @returns {number}
 */
export function normalizeValue(feature, value) {
  switch (feature.type) {
    case "continuous":
      const min = feature.min || 0;
      const max = feature.max || 100;
      const range = max - min;
      if (range === 0) return 0.5;
      return (value - min) / range;

    case "categorical":
      // Return index position normalized
      if (!feature.categories) return 0;
      const index = feature.categories.indexOf(value);
      if (index === -1) return 0;
      return index / Math.max(feature.categories.length - 1, 1);

    case "binary":
      return value ? 1 : 0;

    default:
      return 0;
  }
}
