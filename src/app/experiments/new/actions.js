"use server";

import { invoke_llm, Models } from "@/lib/llm";

const FEATURE_SCHEMA_PROMPT = `You are a data schema expert. Parse the user's input and extract a feature schema for a choice experiment.

The input may be in markdown table format, plain text, or any other format describing features/attributes.

For each feature, determine:
1. key: A snake_case identifier (e.g., "price", "warranty_months")
2. label: A human-readable label (e.g., "Price", "Warranty Months")
3. type: One of "continuous", "categorical", or "binary"
   - continuous: Numeric values with a range (e.g., price, weight, duration)
   - categorical: A set of discrete options (e.g., colors, plans, tiers)
   - binary: Yes/No, true/false values
4. For continuous: include "min", "max", and "unit" if determinable
5. For categorical: include "categories" array with all possible values
6. For binary: no additional fields needed

Return ONLY valid JSON in this exact format:
{
  "features": [
    {
      "key": "price",
      "label": "Price",
      "type": "continuous",
      "min": 100,
      "max": 1000,
      "unit": "USD"
    },
    {
      "key": "color",
      "label": "Color",
      "type": "categorical",
      "categories": ["Red", "Blue", "Green"]
    },
    {
      "key": "has_warranty",
      "label": "Has Warranty",
      "type": "binary"
    }
  ]
}

Do not include any explanation, just the JSON.`;

const ALTERNATIVES_PROMPT = `You are a data extraction expert. Parse the user's input and extract alternatives data for a choice experiment.

The user will provide:
1. A feature schema describing the expected features
2. Raw input containing alternatives data (could be markdown, tables, lists, JSON, etc.)

Extract each alternative and map its values to the feature schema. For each alternative:
1. name: The alternative's name/title
2. features: An object mapping feature keys to their values
   - For continuous: use numeric values
   - For categorical: use one of the allowed category values
   - For binary: use true/false

Return ONLY valid JSON in this exact format:
{
  "alternatives": [
    {
      "name": "Option A",
      "features": {
        "price": 499,
        "color": "Red",
        "has_warranty": true
      }
    },
    {
      "name": "Option B",
      "features": {
        "price": 299,
        "color": "Blue",
        "has_warranty": false
      }
    }
  ]
}

Do not include any explanation, just the JSON.`;

/**
 * Parse raw text input into a feature schema using LLM
 * @param {string} rawInput - Raw text describing features
 * @returns {Promise<{features?: Array, error?: string}>}
 */
export async function parseFeatureSchema(rawInput) {
  if (!rawInput?.trim()) {
    return { error: "Input is required" };
  }

  try {
    const messages = [
      { role: "system", content: FEATURE_SCHEMA_PROMPT },
      { role: "user", content: rawInput },
    ];

    const result = await invoke_llm(Models.GPT_4O_MINI, messages, {
      jsonMode: true,
      maxRetries: 2,
    });

    if (!result.content) {
      return { error: "No response from LLM" };
    }

    // Parse the JSON response
    let parsed;
    try {
      parsed = JSON.parse(result.content);
    } catch {
      // Try to extract JSON from the response if it's wrapped in markdown
      const jsonMatch = result.content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[1]);
      } else {
        return { error: "Failed to parse LLM response as JSON" };
      }
    }

    if (!parsed.features || !Array.isArray(parsed.features)) {
      return { error: "Invalid response format: missing features array" };
    }

    // Add unique keys if missing
    const features = parsed.features.map((f, idx) => ({
      key: f.key || `feature_${idx}`,
      label: f.label || f.key || `Feature ${idx + 1}`,
      type: f.type || "continuous",
      ...(f.type === "continuous" && {
        min: f.min ?? 0,
        max: f.max ?? 100,
        unit: f.unit || "",
      }),
      ...(f.type === "categorical" && {
        categories: f.categories || [],
      }),
    }));

    return { features };
  } catch (err) {
    console.error("parseFeatureSchema error:", err);
    return { error: err.message || "Failed to parse feature schema" };
  }
}

/**
 * Parse raw text input into alternatives data using LLM
 * @param {string} rawInput - Raw text describing alternatives
 * @param {Array} featureSchema - The feature schema to map against
 * @returns {Promise<{alternatives?: Array, error?: string}>}
 */
export async function parseAlternatives(rawInput, featureSchema) {
  if (!rawInput?.trim()) {
    return { error: "Input is required" };
  }

  if (!featureSchema || featureSchema.length === 0) {
    return { error: "Feature schema is required. Define features first." };
  }

  try {
    // Build context about the schema
    const schemaDescription = featureSchema
      .map((f) => {
        let desc = `- ${f.key} (${f.label}): ${f.type}`;
        if (f.type === "continuous") {
          desc += ` [${f.min ?? 0} - ${f.max ?? 100}${f.unit ? ` ${f.unit}` : ""}]`;
        } else if (f.type === "categorical") {
          desc += ` [${f.categories?.join(", ") || ""}]`;
        }
        return desc;
      })
      .join("\n");

    const userMessage = `Feature Schema:
${schemaDescription}

Raw Input:
${rawInput}`;

    const messages = [
      { role: "system", content: ALTERNATIVES_PROMPT },
      { role: "user", content: userMessage },
    ];

    const result = await invoke_llm(Models.GPT_4O_MINI, messages, {
      jsonMode: true,
      maxRetries: 2,
    });

    if (!result.content) {
      return { error: "No response from LLM" };
    }

    // Parse the JSON response
    let parsed;
    try {
      parsed = JSON.parse(result.content);
    } catch {
      // Try to extract JSON from the response if it's wrapped in markdown
      const jsonMatch = result.content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[1]);
      } else {
        return { error: "Failed to parse LLM response as JSON" };
      }
    }

    if (!parsed.alternatives || !Array.isArray(parsed.alternatives)) {
      return { error: "Invalid response format: missing alternatives array" };
    }

    // Normalize alternatives to match expected format
    const alternatives = parsed.alternatives.map((alt, idx) => ({
      id: `alt_${Date.now()}_${idx}`,
      name: alt.name || `Alternative ${idx + 1}`,
      rawInput: "",
      features: alt.features || {},
      display: {
        title: alt.name || `Alternative ${idx + 1}`,
        bullets: [],
      },
      sprite: {
        seed: Math.random().toString(36).substring(7),
        style: "pixel",
        storagePath: "",
      },
    }));

    return { alternatives };
  } catch (err) {
    console.error("parseAlternatives error:", err);
    return { error: err.message || "Failed to parse alternatives" };
  }
}
