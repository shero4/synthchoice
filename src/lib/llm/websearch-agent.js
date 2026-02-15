/**
 * Simple Product Image Search Agent
 *
 * 1. Uses LLM (invoke_llm) to generate a sprite description from product name
 * 2. Searches for "[product] clip art image" using DuckDuckGo
 * 3. Returns image URLs + sprite description; tries multiple URLs for reliability
 *
 * Input: product name/description/brand name
 * Output: { imageUrl, imageUrls, spriteDescription }
 */

import { invoke_llm } from "./invoke";
import { Models } from "./models";

const REQUEST_TIMEOUT_MS = 30_000;
const IMAGE_FETCH_RETRIES = 2;
const IMAGE_FETCH_RETRY_DELAY_MS = 1000;

/** Models to try for sprite description (first available wins) */
const SPRITE_DESC_MODELS = [
  Models.GEMINI_2_5_FLASH,
  Models.GEMINI_2_5_FLASH_OPENROUTER,
  Models.CLAUDE_HAIKU_4_5_ANTHROPIC,
];

/**
 * Generate a sprite description using invoke_llm (tries configured providers)
 */
async function generateSpriteDescription(productName) {
  const messages = [
    {
      role: "user",
      content: `Generate a brief sprite description for pixel art of: "${productName}"

Describe the visual essence in 2-3 sentences. Focus on:
- Shape and silhouette
- Primary colors
- Distinctive features
- What makes it recognizable at small sizes

Respond with ONLY the description, no preamble.`,
    },
  ];

  for (const model of SPRITE_DESC_MODELS) {
    try {
      const result = await invoke_llm(model, messages, {
        maxRetries: 1,
        maxTokens: 256,
      });
      const text = result?.content?.trim();
      if (text) return text;
    } catch (err) {
      console.warn(`Sprite description (${model}) failed:`, err.message);
    }
  }

  return `A pixel art representation of ${productName}`;
}

/**
 * Search DuckDuckGo images and get the first result
 * Uses DuckDuckGo's image search endpoint
 */
async function searchDuckDuckGoImages(query) {
  // Step 1: Get the vqd token from initial search page
  const searchUrl = `https://duckduckgo.com/?q=${encodeURIComponent(query)}&iax=images&ia=images`;

  const pageRes = await fetch(searchUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  const pageText = await pageRes.text();

  // Extract vqd token
  let vqd = null;
  const vqdMatch = pageText.match(/vqd=["']([^"']+)["']/);
  if (vqdMatch) {
    vqd = vqdMatch[1];
  } else {
    // Try alternative pattern
    const vqdMatch2 = pageText.match(/vqd=(\d+-\d+)/);
    if (vqdMatch2) {
      vqd = vqdMatch2[1];
    }
  }

  if (!vqd) {
    throw new Error("Could not extract DuckDuckGo search token");
  }

  // Step 2: Fetch images using the vqd token
  const imagesUrl = `https://duckduckgo.com/i.js?l=us-en&o=json&q=${encodeURIComponent(query)}&vqd=${vqd}&f=,,,,,&p=1`;

  const imagesRes = await fetch(imagesUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "application/json",
      Referer: "https://duckduckgo.com/",
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  const imagesData = await imagesRes.json();

  if (!imagesData.results || imagesData.results.length === 0) {
    return null;
  }

  // Return multiple results for reliability (try each until one fetches)
  const results = imagesData.results.slice(0, 8).map((r) => ({
    imageUrl: r.image,
    thumbnail: r.thumbnail,
    title: r.title,
    source: r.source,
  }));

  return results;
}

/**
 * Fallback: Use a simple Google Images scrape (less reliable)
 */
async function searchGoogleImagesFallback(query) {
  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&tbm=isch&safe=active`;

  const res = await fetch(searchUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html",
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  const html = await res.text();

  // Try to extract image URLs from the HTML
  // Google embeds base64 thumbnails and links to full images
  const imgMatches = html.match(
    /\["(https:\/\/[^"]+\.(jpg|jpeg|png|webp))",[0-9]+,[0-9]+\]/gi,
  );

  if (imgMatches && imgMatches.length > 0) {
    const results = [];
    for (let i = 0; i < Math.min(5, imgMatches.length); i++) {
      const urlMatch = imgMatches[i].match(/"(https:\/\/[^"]+)"/);
      if (urlMatch) {
        results.push({
          imageUrl: urlMatch[1],
          thumbnail: null,
          title: query,
          source: "google",
        });
      }
    }
    return results.length > 0 ? results : null;
  }

  return null;
}

/**
 * Search for product image using query + "clip art image"
 * Returns array of { imageUrl, ... } for multiple fetch attempts
 */
async function searchProductImage(productName) {
  const query = `${productName} clip art image png transparent`;

  try {
    const results = await searchDuckDuckGoImages(query);
    if (results && results.length > 0) {
      return results;
    }
  } catch (err) {
    console.warn("DuckDuckGo search failed:", err.message);
  }

  try {
    const results = await searchGoogleImagesFallback(query);
    if (results && results.length > 0) {
      return results;
    }
  } catch (err) {
    console.warn("Google fallback search failed:", err.message);
  }

  return null;
}

/**
 * Simple Product Search Agent
 *
 * @param {string} productQuery - Product name, description, or brand name
 * @param {Object} options
 * @returns {Promise<{
 *   imageUrl: string | null,
 *   spriteDescription: string,
 *   productName: string,
 *   confidence: 'high' | 'medium' | 'low',
 *   searchResults: Array
 * }>}
 */
export async function searchProductForSprite(productQuery, _options = {}) {
  if (!productQuery || typeof productQuery !== "string") {
    throw new Error("productQuery is required and must be a string");
  }

  const productName = productQuery.trim();

  // Step 1: Generate sprite description using LLM (tries Gemini, OpenRouter, Anthropic)
  let spriteDescription = "";
  try {
    spriteDescription = await generateSpriteDescription(productName);
  } catch (err) {
    console.warn("Failed to generate sprite description:", err.message);
    spriteDescription = `A pixel art representation of ${productName}`;
  }

  // Step 2: Search for clip art image (returns multiple URLs for reliability)
  let imageResults = null;
  try {
    imageResults = await searchProductImage(productName);
  } catch (err) {
    console.warn("Image search failed:", err.message);
  }

  const imageUrls = imageResults?.map((r) => r.imageUrl).filter(Boolean) ?? [];

  return {
    imageUrl: imageUrls[0] || null,
    imageUrls,
    spriteDescription,
    productName,
    confidence: imageUrls.length > 0 ? "medium" : "low",
    searchResults: imageResults?.slice(0, 5).map((r) => ({
      title: r.title || productName,
      url: r.imageUrl,
      snippet: `Source: ${r.source || "image search"}`,
    })) ?? [],
  };
}

/**
 * Download image from URL and convert to base64 data URL (with retries)
 */
export async function fetchImageAsDataUrl(imageUrl, options = {}) {
  if (!imageUrl) {
    throw new Error("imageUrl is required");
  }

  const { retries = IMAGE_FETCH_RETRIES } = options;
  let lastError;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(imageUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "image/*",
          Referer: "https://www.google.com/",
        },
        signal: AbortSignal.timeout(15_000),
      });

      if (!res.ok) {
        throw new Error(`Failed to fetch image: ${res.status}`);
      }

      let contentType = res.headers.get("content-type") || "image/png";
      contentType = contentType.split(";")[0].trim();
      if (!contentType.startsWith("image/")) {
        contentType = "image/png";
      }

      const buffer = await res.arrayBuffer();
      const base64 = Buffer.from(buffer).toString("base64");
      return `data:${contentType};base64,${base64}`;
    } catch (err) {
      lastError = err;
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, IMAGE_FETCH_RETRY_DELAY_MS));
      }
    }
  }

  throw lastError;
}

/**
 * Try fetching from multiple URLs; returns first successful data URL
 */
export async function fetchImageFromUrls(imageUrls) {
  if (!imageUrls?.length) {
    throw new Error("imageUrls is required and must be non-empty");
  }

  const errors = [];
  for (const url of imageUrls) {
    try {
      return await fetchImageAsDataUrl(url);
    } catch (err) {
      errors.push({ url, error: err.message });
      console.warn(`Image fetch failed for ${url.slice(0, 50)}...:`, err.message);
    }
  }

  throw new Error(
    `All ${imageUrls.length} image URLs failed. Last: ${errors[errors.length - 1]?.error}`,
  );
}

/**
 * Complete workflow: search for product and fetch image as data URL
 * Tries all imageUrls until one succeeds
 */
export async function searchAndFetchProductImage(productQuery, options = {}) {
  const result = await searchProductForSprite(productQuery, options);

  let imageDataUrl = null;
  const urls = result.imageUrls?.length
    ? result.imageUrls
    : result.imageUrl
      ? [result.imageUrl]
      : [];
  if (urls.length > 0) {
    try {
      imageDataUrl = await fetchImageFromUrls(urls);
    } catch (err) {
      console.warn("Failed to fetch image from any URL:", err.message);
    }
  }

  return {
    ...result,
    imageDataUrl,
  };
}
