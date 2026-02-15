"use server";

import { invoke_llm, Models, MODEL_TO_PROVIDER } from "@/lib/llm";

// ---------------------------------------------------------------------------
// Model tag resolution
// ---------------------------------------------------------------------------

/**
 * Remap table for old / deprecated / invalid model tags that may still be
 * stored in Firestore experiments. Maps them to valid current model IDs.
 */
const MODEL_REMAP = Object.freeze({
  // Deprecated / invalid OpenRouter Gemini IDs
  "google/gemini-2.0-flash": "google/gemini-2.0-flash-001",
  "google/gemini-2.0-flash-exp": "google/gemini-2.0-flash-001",

  // Old Anthropic OpenRouter IDs (version mismatch)
  "anthropic/claude-sonnet-4.5": "anthropic/claude-sonnet-4",
  "anthropic/claude-opus-4.6": "anthropic/claude-opus-4",

  // Old OpenAI OpenRouter IDs
  "openai/gpt-5.2": "openai/gpt-5",
  "openai/gpt-5.3-codex": "openai/gpt-5",

  // Deprecated direct Gemini models (shutdown March 31, 2026)
  "gemini-2.0-flash": "gemini-2.5-flash",
  "gemini-2.0-flash-001": "gemini-2.5-flash",
});

/**
 * Map a segment modelTag (e.g. "google/gemini-2.5-flash") to a Models constant.
 * Falls back to Gemini 2.5 Flash (direct) for unknown or "stub" tags.
 */
function resolveModel(modelTag) {
  if (!modelTag || modelTag === "stub") {
    return Models.GEMINI_2_5_FLASH;
  }

  // Apply remap for old/invalid IDs stored in Firestore
  const remapped = MODEL_REMAP[modelTag];
  if (remapped) {
    console.log(`[resolveModel] Remapped "${modelTag}" → "${remapped}"`);
    modelTag = remapped;
  }

  // Check if the tag is a known model ID (exists in MODEL_TO_PROVIDER)
  if (MODEL_TO_PROVIDER[modelTag]) {
    return modelTag;
  }

  // Try matching by value in the Models enum
  const allModels = Object.values(Models);
  if (allModels.includes(modelTag)) {
    return modelTag;
  }

  // Default fallback
  console.warn(`[resolveModel] Unknown model "${modelTag}", falling back to Gemini 2.5 Flash`);
  return Models.GEMINI_2_5_FLASH;
}

// ---------------------------------------------------------------------------
// Prompt builder — modular sections
// ---------------------------------------------------------------------------

function buildExperimentContext(experiment) {
  const lines = [];
  lines.push("## Experiment Context");
  lines.push(`**Name:** ${experiment.name || "Unnamed Experiment"}`);
  if (experiment.description) {
    lines.push(`**Description:** ${experiment.description}`);
  }
  return lines.join("\n");
}

function buildFeatureSchemaSection(features) {
  if (!features || features.length === 0) return "";

  const lines = ["## Feature Definitions"];
  for (const f of features) {
    let detail = `- **${f.label || f.key}** (${f.type})`;
    if (f.type === "continuous" && f.unit) {
      detail += ` — range: ${f.min ?? "?"} to ${f.max ?? "?"} ${f.unit}`;
    } else if (f.type === "categorical" && f.categories?.length) {
      detail += ` — options: ${f.categories.join(", ")}`;
    } else if (f.type === "binary") {
      detail += " — Yes / No";
    }
    lines.push(detail);
  }
  return lines.join("\n");
}

function buildAlternativesSection(alternatives, features) {
  const lines = ["## Available Options"];
  lines.push(
    "Below are ALL the options you can choose from. Each option has an ID, a name, and feature values.\n",
  );

  for (const alt of alternatives) {
    lines.push(`### ${alt.name} (ID: ${alt.id})`);
    if (features && features.length > 0) {
      for (const f of features) {
        const value = alt.features?.[f.key];
        if (value !== undefined && value !== null) {
          const label = f.label || f.key;
          let display = String(value);
          if (f.type === "continuous" && f.unit) {
            display = `${value} ${f.unit}`;
          } else if (f.type === "binary") {
            display = value ? "Yes" : "No";
          }
          lines.push(`- ${label}: ${display}`);
        }
      }
    }
    lines.push("");
  }
  return lines.join("\n");
}

function buildPersonaSection(agent) {
  const traits = agent.traits || {};
  const lines = ["## Your Persona"];
  lines.push("You are a synthetic consumer with the following profile:\n");

  if (traits.personality) {
    lines.push(`- **Personality type:** ${traits.personality}`);
  }
  if (traits.location) {
    lines.push(`- **Location:** ${traits.location}`);
  }
  if (traits.priceSensitivity !== undefined) {
    const ps = traits.priceSensitivity;
    const desc =
      ps >= 0.8
        ? "very price-sensitive (budget is a top priority)"
        : ps >= 0.6
          ? "moderately price-sensitive"
          : ps >= 0.4
            ? "somewhat price-aware but willing to pay more for value"
            : "not very price-sensitive (willing to pay premium)";
    lines.push(`- **Price sensitivity:** ${ps} — ${desc}`);
  }
  if (traits.riskTolerance !== undefined) {
    const rt = traits.riskTolerance;
    const desc =
      rt >= 0.7
        ? "high risk tolerance (open to trying new or unconventional options)"
        : rt >= 0.4
          ? "moderate risk tolerance"
          : "low risk tolerance (prefers safe, proven options)";
    lines.push(`- **Risk tolerance:** ${rt} — ${desc}`);
  }
  if (traits.consistency !== undefined) {
    const c = traits.consistency;
    const desc =
      c >= 0.8
        ? "very consistent decision-maker (sticks to logical criteria)"
        : c >= 0.5
          ? "moderately consistent"
          : "spontaneous and easily swayed by different factors";
    lines.push(`- **Consistency:** ${c} — ${desc}`);
  }

  lines.push("");
  lines.push(
    "Stay in character. Let your personality, location, and trait values guide your decision naturally. Do not simply pick the cheapest or most expensive — weigh features according to who you are.",
  );

  return lines.join("\n");
}

function buildInstructionsSection(alternativeIds) {
  const idList = alternativeIds.map((id) => `"${id}"`).join(", ");

  return `## Decision Instructions

Evaluate each option based on your persona. Think about which features matter most to someone like you, then choose the ONE option that best fits.

Respond with ONLY a valid JSON object (no markdown fences, no commentary outside the JSON):

{
  "chosenAlternativeId": "<one of: ${idList}>",
  "reason": "<1–2 sentence explanation of WHY you chose this, in first person>",
  "confidence": <number between 0.0 and 1.0>,
  "reasonCodes": ["<feature_key_1>", "<feature_key_2>"]
}

- **chosenAlternativeId**: must be one of the provided IDs exactly.
- **reason**: brief, in-character explanation.
- **confidence**: how sure you are (0.0 = random guess, 1.0 = absolutely certain).
- **reasonCodes**: the 1–3 feature keys that most influenced your decision.`;
}

// ---------------------------------------------------------------------------
// Main server action
// ---------------------------------------------------------------------------

/**
 * Get an LLM-powered decision for a synthetic agent.
 *
 * @param {object} params
 * @param {object} params.agent       — { segmentId, label, traits: { personality, location, priceSensitivity, riskTolerance, consistency } }
 * @param {object[]} params.alternatives — [{ id, name, features: {...} }]
 * @param {object} params.experiment  — { name, description, featureSchema: { features: [...] } }
 * @param {string} params.modelTag    — segment model tag (e.g. "google/gemini-2.5-flash")
 * @returns {Promise<{ chosenAlternativeId: string, reason: string, confidence: number, reasonCodes: string[], error?: string }>}
 */
export async function getAgentDecision({ agent, alternatives, experiment, modelTag }) {
  if (!alternatives || alternatives.length === 0) {
    return { error: "No alternatives provided", chosenAlternativeId: null, reason: "", confidence: 0, reasonCodes: [] };
  }

  const features = experiment?.featureSchema?.features || [];
  const alternativeIds = alternatives.map((a) => a.id);

  // Build prompt sections
  const systemPrompt = [
    "You are a synthetic consumer persona participating in a choice experiment. Your job is to evaluate the available options and pick the one that best fits your profile.",
    "",
    buildExperimentContext(experiment),
    "",
    buildFeatureSchemaSection(features),
    "",
    buildAlternativesSection(alternatives, features),
    "",
    buildPersonaSection(agent),
    "",
    buildInstructionsSection(alternativeIds),
  ].join("\n");

  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: "Make your choice now." },
  ];

  const model = resolveModel(modelTag);

  try {
    const result = await invoke_llm(model, messages, {
      jsonMode: true,
      maxRetries: 2,
    });

    if (!result.content) {
      return { error: "Empty LLM response", chosenAlternativeId: null, reason: "", confidence: 0, reasonCodes: [] };
    }

    // Parse the response
    let parsed;
    try {
      parsed = JSON.parse(result.content);
    } catch {
      // Try extracting JSON from markdown fences
      const jsonMatch = result.content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[1]);
      } else {
        return {
          error: `Failed to parse LLM JSON: ${result.content.slice(0, 200)}`,
          chosenAlternativeId: null,
          reason: "",
          confidence: 0,
          reasonCodes: [],
        };
      }
    }

    // Validate chosenAlternativeId
    const chosenId = parsed.chosenAlternativeId || parsed.chosen_alternative_id || parsed.chosen;
    if (!chosenId || !alternativeIds.includes(chosenId)) {
      // Try fuzzy match — the LLM may have returned the name instead of ID
      const matchByName = alternatives.find(
        (a) => a.name.toLowerCase() === (chosenId || "").toLowerCase(),
      );
      if (matchByName) {
        parsed.chosenAlternativeId = matchByName.id;
      } else {
        return {
          error: `Invalid choice "${chosenId}". Valid IDs: ${alternativeIds.join(", ")}`,
          chosenAlternativeId: null,
          reason: parsed.reason || "",
          confidence: 0,
          reasonCodes: [],
        };
      }
    } else {
      parsed.chosenAlternativeId = chosenId;
    }

    return {
      chosenAlternativeId: parsed.chosenAlternativeId,
      reason: parsed.reason || "Made a choice based on overall evaluation.",
      confidence: Math.min(1, Math.max(0, Number(parsed.confidence) || 0.5)),
      reasonCodes: Array.isArray(parsed.reasonCodes) ? parsed.reasonCodes : [],
    };
  } catch (err) {
    console.error("[getAgentDecision] LLM error:", err);
    return {
      error: err.message || "LLM invocation failed",
      chosenAlternativeId: null,
      reason: "",
      confidence: 0,
      reasonCodes: [],
    };
  }
}
