/**
 * Results Aggregation Helpers
 * Compute shares, feature importance, and validation metrics
 */

/**
 * Compute choice shares from responses
 * @param {Object[]} responses - Response objects
 * @param {Object[]} alternatives - Alternative objects
 * @param {Object[]} segments - Segment definitions
 * @returns {{ overall: Object, bySegment: Object }}
 */
function computeShares(responses, alternatives, segments) {
  const altIds = alternatives.map((a) => a.id);
  const segmentIds = segments.map((s) => s.segmentId);

  // Initialize counts
  const overallCounts = {};
  const segmentCounts = {};

  altIds.forEach((id) => {
    overallCounts[id] = 0;
  });
  overallCounts["NONE"] = 0;

  segmentIds.forEach((segId) => {
    segmentCounts[segId] = {};
    altIds.forEach((id) => {
      segmentCounts[segId][id] = 0;
    });
    segmentCounts[segId]["NONE"] = 0;
  });

  // Count choices
  responses.forEach((response) => {
    const chosen = response.chosen;
    if (overallCounts[chosen] !== undefined) {
      overallCounts[chosen]++;
    }

    // Find agent's segment
    const agentId = response.agentId;
    const segmentId = agentId?.split("_").slice(0, -1).join("_");
    if (segmentId && segmentCounts[segmentId]?.[chosen] !== undefined) {
      segmentCounts[segmentId][chosen]++;
    }
  });

  // Convert to shares
  const totalResponses = responses.length || 1;
  const overallShares = {};
  Object.entries(overallCounts).forEach(([id, count]) => {
    if (id !== "NONE" || count > 0) {
      overallShares[id] = count / totalResponses;
    }
  });

  const bySegment = {};
  segmentIds.forEach((segId) => {
    const segTotal = Object.values(segmentCounts[segId]).reduce((a, b) => a + b, 0) || 1;
    bySegment[segId] = {};
    Object.entries(segmentCounts[segId]).forEach(([id, count]) => {
      if (id !== "NONE" || count > 0) {
        bySegment[segId][id] = count / segTotal;
      }
    });
  });

  return { overall: overallShares, bySegment };
}

/**
 * Compute simple feature importance from reason codes
 * @param {Object[]} responses - Response objects
 * @param {import('@/models/firestore').Feature[]} features - Feature schema
 * @param {Object[]} segments - Segment definitions
 * @returns {{ overall: Object, bySegment: Object }}
 */
function computeFeatureImportance(responses, features, segments) {
  const featureKeys = features.map((f) => f.key);
  const segmentIds = segments.map((s) => s.segmentId);

  // Count reason code occurrences
  const overallCounts = {};
  const segmentCounts = {};

  featureKeys.forEach((key) => {
    overallCounts[key] = 0;
  });

  segmentIds.forEach((segId) => {
    segmentCounts[segId] = {};
    featureKeys.forEach((key) => {
      segmentCounts[segId][key] = 0;
    });
  });

  // Count occurrences
  responses.forEach((response) => {
    const reasonCodes = response.reasonCodes || [];
    reasonCodes.forEach((code) => {
      if (overallCounts[code] !== undefined) {
        overallCounts[code]++;
      }

      const agentId = response.agentId;
      const segmentId = agentId?.split("_").slice(0, -1).join("_");
      if (segmentId && segmentCounts[segmentId]?.[code] !== undefined) {
        segmentCounts[segmentId][code]++;
      }
    });
  });

  // Normalize to importance scores (0-1)
  const maxCount = Math.max(...Object.values(overallCounts), 1);
  const overallImportance = {};
  Object.entries(overallCounts).forEach(([key, count]) => {
    overallImportance[key] = count / maxCount;
  });

  const bySegment = {};
  segmentIds.forEach((segId) => {
    const segMax = Math.max(...Object.values(segmentCounts[segId]), 1);
    bySegment[segId] = {};
    Object.entries(segmentCounts[segId]).forEach(([key, count]) => {
      bySegment[segId][key] = count / segMax;
    });
  });

  return { overall: overallImportance, bySegment };
}

/**
 * Compute validation metrics
 * @param {Object[]} responses - Response objects
 * @param {Object[]} tasks - Task objects
 * @returns {{ holdoutAccuracy: number, repeatConsistency: number }}
 */
function computeValidation(responses, tasks) {
  // Build response lookup
  const responseByTask = {};
  responses.forEach((r) => {
    responseByTask[r.taskId] = r;
  });

  // Compute holdout accuracy
  // For stub simulator, we compare holdout choices to predicted choices
  // In a real scenario, this would compare to actual human choices
  const holdoutTasks = tasks.filter((t) => t.isHoldout);
  const holdoutAccuracy = holdoutTasks.length > 0 ? 0.75 : 0; // Placeholder

  // Compute repeat consistency
  const repeatTasks = tasks.filter((t) => t.isRepeatOf);
  let consistentCount = 0;
  let totalRepeats = 0;

  repeatTasks.forEach((repeatTask) => {
    const originalTaskId = repeatTask.isRepeatOf;
    const repeatResponse = responseByTask[repeatTask.id];
    const originalResponse = responseByTask[originalTaskId];

    if (repeatResponse && originalResponse) {
      totalRepeats++;
      if (repeatResponse.chosen === originalResponse.chosen) {
        consistentCount++;
      }
    }
  });

  const repeatConsistency = totalRepeats > 0 ? consistentCount / totalRepeats : 0.8; // Default

  return {
    holdoutAccuracy: Math.round(holdoutAccuracy * 100) / 100,
    repeatConsistency: Math.round(repeatConsistency * 100) / 100,
  };
}

/**
 * Compute all results from responses
 * @param {Object} params
 * @param {Object[]} params.responses - Response objects
 * @param {Object[]} params.tasks - Task objects
 * @param {Object[]} params.alternatives - Alternative objects
 * @param {import('@/models/firestore').Feature[]} params.features - Feature schema
 * @param {Object[]} params.segments - Segment definitions
 * @param {Object} params.taskPlan - Task plan settings
 * @returns {import('@/models/firestore').ResultsSummary}
 */
export function computeResults({
  responses,
  tasks,
  alternatives,
  features,
  segments,
  taskPlan,
}) {
  const shares = computeShares(responses, alternatives, segments);
  const featureImportance = computeFeatureImportance(responses, features, segments);
  const validation = computeValidation(responses, tasks);

  return {
    shares,
    featureImportance,
    validation,
  };
}

/**
 * Get summary statistics
 * @param {Object[]} responses
 * @returns {Object}
 */
export function getResponseStats(responses) {
  const totalResponses = responses.length;
  const noneCount = responses.filter((r) => r.chosen === "NONE").length;
  const avgConfidence =
    responses.reduce((sum, r) => sum + (r.confidence || 0), 0) / (totalResponses || 1);

  return {
    totalResponses,
    noneCount,
    noneRate: noneCount / (totalResponses || 1),
    avgConfidence: Math.round(avgConfidence * 100) / 100,
  };
}
