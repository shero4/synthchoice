/**
 * Validation Helpers
 * Validate experiments, responses, and configurations
 */

/**
 * Validate an experiment is ready to run
 * @param {import('@/models/firestore').Experiment} experiment
 * @param {Object[]} alternatives
 * @returns {{ valid: boolean, errors: string[], warnings: string[] }}
 */
export function validateExperimentReadyToRun(experiment, alternatives) {
  const errors = [];
  const warnings = [];

  // Check basic fields
  if (!experiment.name) {
    errors.push("Experiment must have a name");
  }

  // Check feature schema
  if (!experiment.featureSchema?.features?.length) {
    errors.push("Experiment must have at least one feature defined");
  }

  // Check alternatives
  if (!alternatives || alternatives.length < 2) {
    errors.push("Experiment must have at least 2 alternatives");
  }

  // Check for minimum alternatives (A/B format requires at least 2)
  if (alternatives && alternatives.length < 2) {
    errors.push("Experiment requires at least 2 alternatives");
  }

  // Check agent plan
  if (!experiment.agentPlan?.segments?.length) {
    errors.push("Experiment must have at least one agent segment");
  }

  const totalAgents = experiment.agentPlan?.segments?.reduce(
    (sum, s) => sum + (s.count || 0),
    0
  ) || 0;

  if (totalAgents === 0) {
    errors.push("Experiment must have at least one agent");
  }

  // Warnings
  if (totalAgents < 10) {
    warnings.push("Small sample size may lead to unreliable results");
  }

  // Check that alternatives have all features
  const featureKeys = experiment.featureSchema?.features?.map((f) => f.key) || [];
  alternatives?.forEach((alt) => {
    const missingFeatures = featureKeys.filter(
      (key) => alt.features?.[key] === undefined
    );
    if (missingFeatures.length > 0) {
      warnings.push(
        `Alternative "${alt.name}" is missing features: ${missingFeatures.join(", ")}`
      );
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate response data
 * @param {Object} response
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateResponse(response) {
  const errors = [];

  if (!response.taskId) {
    errors.push("Response must have a taskId");
  }

  if (!response.agentId) {
    errors.push("Response must have an agentId");
  }

  if (!response.chosen) {
    errors.push("Response must have a chosen value");
  }

  if (response.confidence !== undefined) {
    if (typeof response.confidence !== "number" || response.confidence < 0 || response.confidence > 1) {
      errors.push("Confidence must be a number between 0 and 1");
    }
  }

  if (response.reasonCodes && !Array.isArray(response.reasonCodes)) {
    errors.push("reasonCodes must be an array");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate task data
 * @param {Object} task
 * @param {string[]} alternativeIds
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateTask(task, alternativeIds) {
  const errors = [];

  if (!task.agentId) {
    errors.push("Task must have an agentId");
  }

  if (!task.shownAlternatives || !Array.isArray(task.shownAlternatives)) {
    errors.push("Task must have shownAlternatives array");
  } else {
    const invalidAlts = task.shownAlternatives.filter(
      (id) => !alternativeIds.includes(id)
    );
    if (invalidAlts.length > 0) {
      errors.push(`Task references unknown alternatives: ${invalidAlts.join(", ")}`);
    }

    if (task.shownAlternatives.length < 2) {
      errors.push("Task must show at least 2 alternatives");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Check if experiment can be edited
 * @param {import('@/models/firestore').Experiment} experiment
 * @param {Object[]} runs
 * @returns {{ canEdit: boolean, reason?: string }}
 */
export function canEditExperiment(experiment, runs = []) {
  if (experiment.status === "archived") {
    return { canEdit: false, reason: "Archived experiments cannot be edited" };
  }

  const completedRuns = runs.filter((r) => r.status === "complete");
  if (completedRuns.length > 0) {
    return {
      canEdit: false,
      reason: "Experiments with completed runs cannot be edited (data integrity)",
    };
  }

  return { canEdit: true };
}

/**
 * Validate agent traits
 * @param {Object} traits
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateTraits(traits) {
  const errors = [];

  const numericTraits = ["priceSensitivity", "riskTolerance", "consistency"];

  numericTraits.forEach((trait) => {
    if (traits[trait] !== undefined) {
      const value = traits[trait];
      if (typeof value !== "number" || value < 0 || value > 1) {
        errors.push(`${trait} must be a number between 0 and 1`);
      }
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}
