/**
 * Simple Product Image Search Agent
 *
 * 1. Uses Claude to generate a sprite description from product name
 * 2. Searches for "[product] clip art image" using DuckDuckGo
 * 3. Returns the first image result + sprite description
 *
 * Input: product name/description/brand name
 * Output: { imageUrl, spriteDescription }
 */

import { getApiKeyForProvider, Provider } from "./providers";

const REQUEST_TIMEOUT_MS = 30_000;

/**
 * Generate a sprite description using Claude (no web search, just text)
 */
async function generateSpriteDescription(apiKey, productName) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-3-5-haiku-20241022",
      max_tokens: 256,
      messages: [
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
      ],
    }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(
      data?.error?.message || `Anthropic API error: ${res.status}`,
    );
  }

  const text = data.content?.[0]?.text || "";
  return text.trim();
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

  // Return the first image result
  const firstResult = imagesData.results[0];
  return {
    imageUrl: firstResult.image,
    thumbnail: firstResult.thumbnail,
    title: firstResult.title,
    source: firstResult.source,
  };
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
    // Extract the URL from the first match
    const urlMatch = imgMatches[0].match(/"(https:\/\/[^"]+)"/);
    if (urlMatch) {
      return {
        imageUrl: urlMatch[1],
        thumbnail: null,
        title: query,
        source: "google",
      };
    }
  }

  return null;
}

/**
 * Search for product image using query + "clip art image"
 */
async function searchProductImage(productName) {
  const query = `${productName} clip art image png transparent`;

  try {
    // Try DuckDuckGo first
    const result = await searchDuckDuckGoImages(query);
    if (result) {
      return result;
    }
  } catch (err) {
    console.warn("DuckDuckGo search failed:", err.message);
  }

  try {
    // Fallback to Google
    const result = await searchGoogleImagesFallback(query);
    if (result) {
      return result;
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

  // Step 1: Generate sprite description using Claude
  let spriteDescription = "";
  try {
    const apiKey = getApiKeyForProvider(Provider.ANTHROPIC);
    spriteDescription = await generateSpriteDescription(apiKey, productName);
  } catch (err) {
    console.warn("Failed to generate sprite description:", err.message);
    spriteDescription = `A pixel art representation of ${productName}`;
  }

  // Step 2: Search for clip art image
  let imageResult = null;
  try {
    imageResult = await searchProductImage(productName);
  } catch (err) {
    console.warn("Image search failed:", err.message);
  }

  return {
    imageUrl: imageResult?.imageUrl || null,
    spriteDescription,
    productName,
    confidence: imageResult ? "medium" : "low",
    searchResults: imageResult
      ? [
          {
            title: imageResult.title || productName,
            url: imageResult.imageUrl,
            snippet: `Source: ${imageResult.source || "image search"}`,
          },
        ]
      : [],
  };
}

/**
 * Download image from URL and convert to base64 data URL
 */
export async function fetchImageAsDataUrl(imageUrl) {
  if (!imageUrl) {
    throw new Error("imageUrl is required");
  }

  const res = await fetch(imageUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "image/*",
    },
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch image: ${res.status}`);
  }

  // Get content type and strip any extra parameters (e.g., "image/png; charset=utf-8" -> "image/png")
  let contentType = res.headers.get("content-type") || "image/png";
  contentType = contentType.split(";")[0].trim();

  // Ensure it's a valid image type
  if (!contentType.startsWith("image/")) {
    contentType = "image/png";
  }

  const buffer = await res.arrayBuffer();
  const base64 = Buffer.from(buffer).toString("base64");

  return `data:${contentType};base64,${base64}`;
}

/**
 * Complete workflow: search for product and fetch image as data URL
 */
export async function searchAndFetchProductImage(productQuery, options = {}) {
  const result = await searchProductForSprite(productQuery, options);

  let imageDataUrl = null;
  if (result.imageUrl) {
    try {
      imageDataUrl = await fetchImageAsDataUrl(result.imageUrl);
    } catch (err) {
      console.warn(
        `Failed to fetch image from ${result.imageUrl}:`,
        err.message,
      );
    }
  }

  return {
    ...result,
    imageDataUrl,
  };
}
