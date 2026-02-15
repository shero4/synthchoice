/**
 * Results Aggregation & Conjoint Estimation Helpers
 *
 * Computes:
 *  - Choice shares (overall + by segment)
 *  - Feature importance (reason-code frequency)
 *  - Part-worth utilities (MNL-style β weights via gradient descent)
 *  - Feature encoding (continuous, categorical one-hot, binary)
 *  - Choice drivers analysis (what drove each choice)
 *  - Willingness-to-pay estimates (if a price/cost feature exists)
 *  - Choice-share simulation for hypothetical concepts
 *  - Bootstrap confidence intervals
 */

// ─────────────────────────────────────────────────────────────
// 1. FEATURE ENCODING
// ─────────────────────────────────────────────────────────────

/**
 * Encode a single alternative's features into a numeric vector.
 * - continuous: standardize to z-score using (value - mean) / std
 * - categorical: one-hot encoding
 * - binary: 0 / 1
 *
 * Returns { vector: number[], keys: string[] } where keys label each
 * dimension so we can map back to human-readable names.
 */
function encodeFeatures(altFeatures, featureSchema, stats) {
  const vector = [];
  const keys = [];

  for (const feat of featureSchema) {
    const raw = altFeatures[feat.key];

    if (feat.type === "continuous") {
      const mean = stats[feat.key]?.mean ?? 0;
      const std = stats[feat.key]?.std ?? 1;
      vector.push(std === 0 ? 0 : (Number(raw) - mean) / std);
      keys.push(feat.key);
    } else if (feat.type === "categorical") {
      const cats = feat.categories || [];
      for (const cat of cats) {
        vector.push(raw === cat ? 1 : 0);
        keys.push(`${feat.key}:${cat}`);
      }
    } else {
      // binary
      vector.push(raw ? 1 : 0);
      keys.push(feat.key);
    }
  }
  return { vector, keys };
}

/**
 * Compute mean/std for continuous features across all alternatives.
 */
function computeFeatureStats(alternatives, featureSchema) {
  const stats = {};
  for (const feat of featureSchema) {
    if (feat.type !== "continuous") continue;
    const vals = alternatives
      .map((a) => Number(a.features?.[feat.key]))
      .filter((v) => !Number.isNaN(v));
    const n = vals.length || 1;
    const mean = vals.reduce((s, v) => s + v, 0) / n;
    const variance = vals.reduce((s, v) => s + (v - mean) ** 2, 0) / n;
    stats[feat.key] = { mean, std: Math.sqrt(variance) || 1 };
  }
  return stats;
}

// ─────────────────────────────────────────────────────────────
// 2. MNL ESTIMATION  (gradient descent)
// ─────────────────────────────────────────────────────────────

/**
 * Fit a multinomial logit model via batch gradient descent.
 *
 * Each "observation" is one response where the agent was shown a choice set
 * and picked one alternative.  We maximise log-likelihood:
 *
 *   LL = Σ_i  (β'x_chosen  - log Σ_j exp(β'x_j))
 *
 * @param {Object[]} observations - { chosenIdx, encodedSet: number[][] }
 * @param {number} dim - feature vector dimension
 * @param {Object} [opts]
 * @returns {number[]} β vector
 */
function fitMNL(observations, dim, opts = {}) {
  const { lr = 0.05, iters = 400, l2 = 0.001 } = opts;
  const beta = new Array(dim).fill(0);

  for (let t = 0; t < iters; t++) {
    const grad = new Array(dim).fill(0);

    for (const obs of observations) {
      const { chosenIdx, encodedSet } = obs;
      if (chosenIdx < 0 || chosenIdx >= encodedSet.length) continue;

      // Compute utilities and soft-max probabilities
      const utils = encodedSet.map((x) =>
        x.reduce((s, xi, k) => s + xi * beta[k], 0),
      );
      const maxU = Math.max(...utils);
      const exps = utils.map((u) => Math.exp(u - maxU));
      const sumExp = exps.reduce((a, b) => a + b, 0) || 1;
      const probs = exps.map((e) => e / sumExp);

      // Gradient: x_chosen - Σ_j  p_j * x_j
      const xChosen = encodedSet[chosenIdx];
      for (let k = 0; k < dim; k++) {
        let weightedSum = 0;
        for (let j = 0; j < encodedSet.length; j++) {
          weightedSum += probs[j] * encodedSet[j][k];
        }
        grad[k] += xChosen[k] - weightedSum;
      }
    }

    // Update β with gradient + L2 regularisation
    const n = observations.length || 1;
    for (let k = 0; k < dim; k++) {
      beta[k] += lr * (grad[k] / n - l2 * beta[k]);
    }
  }

  return beta;
}

// ─────────────────────────────────────────────────────────────
// 3. PART-WORTH UTILITIES
// ─────────────────────────────────────────────────────────────

/**
 * Compute part-worth utilities (β weights) from responses.
 *
 * We build one "observation" per response that chose a real alternative
 * (not NONE), encode every alternative in the experiment, and fit MNL.
 *
 * Also computes per-segment β if segments are given.
 */
function computePartWorths(responses, alternatives, features, segments) {
  if (features.length === 0 || alternatives.length === 0) {
    return { overall: {}, bySegment: {}, keys: [] };
  }

  const stats = computeFeatureStats(alternatives, features);

  // Encode all alternatives once
  const encodedAlts = alternatives.map((alt) => {
    const { vector, keys } = encodeFeatures(alt.features || {}, features, stats);
    return { id: alt.id, vector, keys };
  });

  const dim = encodedAlts[0]?.vector.length || 0;
  const featureKeys = encodedAlts[0]?.keys || [];
  if (dim === 0) return { overall: {}, bySegment: {}, keys: [] };

  // Build the full encoded set (same for every observation in this simple setup)
  const fullSet = encodedAlts.map((e) => e.vector);
  const altIdToIdx = {};
  alternatives.forEach((a, i) => { altIdToIdx[a.id] = i; });

  // Build observations
  const allObs = [];
  const segObs = {};
  const segmentIds = segments.map((s) => s.segmentId);
  segmentIds.forEach((sid) => { segObs[sid] = []; });

  for (const r of responses) {
    if (r.chosen === "NONE") continue;
    const chosenIdx = altIdToIdx[r.chosen];
    if (chosenIdx === undefined) continue;
    const obs = { chosenIdx, encodedSet: fullSet };
    allObs.push(obs);

    const segId = r.agentId?.split("_").slice(0, -1).join("_");
    if (segId && segObs[segId]) {
      segObs[segId].push(obs);
    }
  }

  // Fit overall model
  const beta = allObs.length >= 5 ? fitMNL(allObs, dim) : new Array(dim).fill(0);

  const overallPW = {};
  featureKeys.forEach((k, i) => { overallPW[k] = beta[i]; });

  // Fit per-segment models
  const bySegmentPW = {};
  for (const sid of segmentIds) {
    if (segObs[sid].length >= 5) {
      const segBeta = fitMNL(segObs[sid], dim);
      bySegmentPW[sid] = {};
      featureKeys.forEach((k, i) => { bySegmentPW[sid][k] = segBeta[i]; });
    }
  }

  return { overall: overallPW, bySegment: bySegmentPW, keys: featureKeys };
}

// ─────────────────────────────────────────────────────────────
// 4. CHOICE DRIVERS
// ─────────────────────────────────────────────────────────────

/**
 * Analyse *what drove each choice* by cross-tabulating:
 *  - For each alternative, which reason codes (features) appear most often
 *  - Co-occurrence matrix of reason codes
 *  - Feature × alternative heatmap data
 */
function computeChoiceDrivers(responses, alternatives, features) {
  const altIds = alternatives.map((a) => a.id);
  const featureKeys = features.map((f) => f.key);

  // Feature-per-alternative counts
  const altFeatureCounts = {};
  altIds.forEach((aid) => {
    altFeatureCounts[aid] = {};
    featureKeys.forEach((fk) => { altFeatureCounts[aid][fk] = 0; });
  });

  // Co-occurrence
  const coOccurrence = {};
  featureKeys.forEach((a) => {
    coOccurrence[a] = {};
    featureKeys.forEach((b) => { coOccurrence[a][b] = 0; });
  });

  // Per-feature choose counts (how often feature X was cited AND alt Y was chosen)
  let totalResponses = 0;

  for (const r of responses) {
    if (r.chosen === "NONE") continue;
    totalResponses++;
    const codes = r.reasonCodes || [];

    codes.forEach((code) => {
      if (altFeatureCounts[r.chosen]?.[code] !== undefined) {
        altFeatureCounts[r.chosen][code]++;
      }
    });

    // Co-occurrence pairs
    for (let i = 0; i < codes.length; i++) {
      for (let j = i; j < codes.length; j++) {
        if (coOccurrence[codes[i]]?.[codes[j]] !== undefined) {
          coOccurrence[codes[i]][codes[j]]++;
          if (i !== j) coOccurrence[codes[j]][codes[i]]++;
        }
      }
    }
  }

  // Heatmap: normalise counts to 0-1 per alternative
  const heatmap = {};
  altIds.forEach((aid) => {
    const maxC = Math.max(...Object.values(altFeatureCounts[aid]), 1);
    heatmap[aid] = {};
    featureKeys.forEach((fk) => {
      heatmap[aid][fk] = altFeatureCounts[aid][fk] / maxC;
    });
  });

  // Top driver per alternative
  const topDrivers = {};
  altIds.forEach((aid) => {
    const sorted = Object.entries(altFeatureCounts[aid]).sort((a, b) => b[1] - a[1]);
    topDrivers[aid] = sorted.slice(0, 3).map(([key, count]) => ({
      feature: key,
      count,
      pct: totalResponses > 0 ? count / totalResponses : 0,
    }));
  });

  return { altFeatureCounts, coOccurrence, heatmap, topDrivers };
}

// ─────────────────────────────────────────────────────────────
// 5. WILLINGNESS TO PAY
// ─────────────────────────────────────────────────────────────

/**
 * WTP_k = -β_k / β_price
 *
 * Only meaningful when a continuous "price"-like feature exists.
 * We detect it by looking for a feature with key or label containing
 * "price", "cost", or "fee" (case-insensitive).
 */
function computeWTP(partWorths, features) {
  const priceFeature = features.find((f) =>
    f.type === "continuous" &&
    /price|cost|fee|premium/i.test(f.key + " " + (f.label || "")),
  );

  if (!priceFeature) return null;

  const priceBeta = partWorths.overall[priceFeature.key];
  if (!priceBeta || Math.abs(priceBeta) < 1e-6) return null;

  const wtp = {};
  const keys = Object.keys(partWorths.overall);
  for (const k of keys) {
    if (k === priceFeature.key) continue;
    wtp[k] = -partWorths.overall[k] / priceBeta;
  }

  return {
    priceFeature: priceFeature.key,
    priceUnit: priceFeature.unit || "",
    values: wtp,
  };
}

// ─────────────────────────────────────────────────────────────
// 6. CHOICE-SHARE SIMULATION
// ─────────────────────────────────────────────────────────────

/**
 * Given a β vector and a set of concept feature-vectors, predict
 * choice shares via the MNL formula.
 *
 * P_i = exp(β'x_i) / Σ_j exp(β'x_j)
 */
export function simulateShares(betaMap, conceptAlternatives, features, allAlternatives) {
  const stats = computeFeatureStats(allAlternatives, features);
  const keys = Object.keys(betaMap);
  const beta = keys.map((k) => betaMap[k]);

  const vecs = conceptAlternatives.map((alt) => {
    const { vector } = encodeFeatures(alt.features || {}, features, stats);
    return vector;
  });

  const utils = vecs.map((v) =>
    v.reduce((s, xi, k) => s + xi * beta[k], 0),
  );
  const maxU = Math.max(...utils);
  const exps = utils.map((u) => Math.exp(u - maxU));
  const sumExp = exps.reduce((a, b) => a + b, 0) || 1;

  const shares = {};
  conceptAlternatives.forEach((alt, i) => {
    shares[alt.id || alt.name || `concept_${i}`] = exps[i] / sumExp;
  });
  return shares;
}

// ─────────────────────────────────────────────────────────────
// 7. BOOTSTRAP CONFIDENCE INTERVALS
// ─────────────────────────────────────────────────────────────

/**
 * Resample responses with replacement B times,
 * recompute shares each time, return 90% CI per alternative.
 */
function bootstrapSharesCI(responses, alternatives, segments, B = 200) {
  const altIds = alternatives.map((a) => a.id);
  const draws = {}; // altId -> number[]
  altIds.forEach((id) => { draws[id] = []; });

  for (let b = 0; b < B; b++) {
    // Resample
    const n = responses.length;
    const sample = [];
    for (let i = 0; i < n; i++) {
      sample.push(responses[Math.floor(Math.random() * n)]);
    }
    const shares = computeShares(sample, alternatives, segments);
    altIds.forEach((id) => {
      draws[id].push(shares.overall[id] || 0);
    });
  }

  // Compute 5th / 95th percentile
  const ci = {};
  altIds.forEach((id) => {
    const sorted = draws[id].slice().sort((a, b) => a - b);
    const lo = sorted[Math.floor(B * 0.05)] || 0;
    const hi = sorted[Math.floor(B * 0.95)] || 0;
    const mean = sorted.reduce((s, v) => s + v, 0) / B;
    ci[id] = { lo, hi, mean };
  });
  return ci;
}

// ─────────────────────────────────────────────────────────────
// EXISTING: Choice Shares
// ─────────────────────────────────────────────────────────────

function computeShares(responses, alternatives, segments) {
  const altIds = alternatives.map((a) => a.id);
  const segmentIds = segments.map((s) => s.segmentId);

  const overallCounts = {};
  const segmentCounts = {};

  altIds.forEach((id) => { overallCounts[id] = 0; });
  overallCounts["NONE"] = 0;

  segmentIds.forEach((segId) => {
    segmentCounts[segId] = {};
    altIds.forEach((id) => { segmentCounts[segId][id] = 0; });
    segmentCounts[segId]["NONE"] = 0;
  });

  responses.forEach((response) => {
    const chosen = response.chosen;
    if (overallCounts[chosen] !== undefined) {
      overallCounts[chosen]++;
    }
    const agentId = response.agentId;
    const segmentId = agentId?.split("_").slice(0, -1).join("_");
    if (segmentId && segmentCounts[segmentId]?.[chosen] !== undefined) {
      segmentCounts[segmentId][chosen]++;
    }
  });

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

// ─────────────────────────────────────────────────────────────
// EXISTING: Feature Importance (reason-code frequency)
// ─────────────────────────────────────────────────────────────

function computeFeatureImportance(responses, features, segments) {
  const featureKeys = features.map((f) => f.key);
  const segmentIds = segments.map((s) => s.segmentId);

  const overallCounts = {};
  const segmentCounts = {};

  featureKeys.forEach((key) => { overallCounts[key] = 0; });
  segmentIds.forEach((segId) => {
    segmentCounts[segId] = {};
    featureKeys.forEach((key) => { segmentCounts[segId][key] = 0; });
  });

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

// ─────────────────────────────────────────────────────────────
// MAIN: computeResults
// ─────────────────────────────────────────────────────────────

/**
 * Compute all results from responses.
 *
 * Returns the full ResultsSummary including new conjoint outputs:
 *  - shares
 *  - featureImportance
 *  - partWorths          (β weights overall + by segment)
 *  - choiceDrivers       (what drove each choice)
 *  - wtp                 (willingness-to-pay, if price feature present)
 *  - confidence          (bootstrap CIs for shares)
 *  - responseStats       (summary stats)
 */
export function computeResults({ responses, alternatives, features, segments }) {
  const shares = computeShares(responses, alternatives, segments);
  const featureImportance = computeFeatureImportance(responses, features, segments);
  const partWorths = computePartWorths(responses, alternatives, features, segments);
  const choiceDrivers = computeChoiceDrivers(responses, alternatives, features);
  const wtp = computeWTP(partWorths, features);
  const confidence = bootstrapSharesCI(responses, alternatives, segments, 200);
  const responseStats = getResponseStats(responses);

  return {
    shares,
    featureImportance,
    partWorths,
    choiceDrivers,
    wtp,
    confidence,
    responseStats,
  };
}

/**
 * Get summary statistics
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
