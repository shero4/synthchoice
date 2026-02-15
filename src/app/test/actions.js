"use server";

import {
  postprocessSpriteSheet,
  createGifFromSpriteSheet,
} from "@/lib/sprites/process";
import { SPRITE_PROMPT } from "@/lib/sprites/prompt";
import {
  invoke_llm,
  Models,
  searchProductForSprite,
  fetchImageFromUrls,
} from "@/lib/llm";

const PROVIDER_TO_MODEL = {
  openrouter: Models.GEMINI_2_5_FLASH_IMAGE_PREVIEW,
  gemini: Models.GEMINI_2_5_FLASH_IMAGE,
  openai: Models.GPT_4_1_MINI,
};

async function fileToDataUrl(file) {
  const buffer = await file.arrayBuffer();
  const base64 = Buffer.from(buffer).toString("base64");
  const mime = file.type || "image/png";
  return `data:${mime};base64,${base64}`;
}

/**
 * Server action: generate sprite using invoke_llm
 */
export async function generateSprite(formData) {
  const logo = formData.get("logo");
  const provider = formData.get("provider") || "openrouter";
  const gridStr = formData.get("grid") || "2x2";
  const frameSize = Number.parseInt(formData.get("frameSize") || "128", 10);
  const generateGif = formData.get("generateGif") === "true";

  if (!logo || !(logo instanceof File)) {
    return { error: "Logo file is required" };
  }

  const gridParts = gridStr.toLowerCase().split("x");
  if (gridParts.length !== 2) {
    return { error: "Invalid grid format. Use COLSxROWS (e.g., 2x2)" };
  }
  const cols = Number.parseInt(gridParts[0], 10);
  const rows = Number.parseInt(gridParts[1], 10);

  const model = PROVIDER_TO_MODEL[provider];
  if (!model) {
    return { error: `Unknown provider: ${provider}` };
  }

  try {
    const logoDataUrl = await fileToDataUrl(logo);
    const messages = [
      {
        role: "user",
        content: [
          { type: "text", text: SPRITE_PROMPT },
          { type: "image_url", image_url: { url: logoDataUrl } },
        ],
      },
    ];

    const result = await invoke_llm(model, messages, { maxRetries: 3 });
    if (!result.images?.length) {
      return { error: "No images returned from model" };
    }
    const rawImageDataUrl = result.images[0];

    const spriteSheetDataUrl = await postprocessSpriteSheet(rawImageDataUrl, {
      grid: [cols, rows],
      targetFrame: [frameSize, frameSize],
      maxColors: 256,
    });

    const totalWidth = cols * frameSize;
    const totalHeight = rows * frameSize;

    let gifDataUrl = null;
    if (generateGif) {
      gifDataUrl = await createGifFromSpriteSheet(spriteSheetDataUrl, {
        grid: [cols, rows],
        frameDurationMs: 150,
        scale: 1,
      });
    }

    return {
      rawImage: rawImageDataUrl,
      spriteSheet: spriteSheetDataUrl,
      gif: gifDataUrl,
      metadata: {
        grid: `${cols}x${rows}`,
        frameSize,
        totalSize: `${totalWidth}x${totalHeight}`,
        provider,
      },
    };
  } catch (err) {
    console.error("Sprite generation error:", err);
    return { error: err.message || "Failed to generate sprite" };
  }
}

/**
 * Step 1: Search for product image using web search agent
 */
export async function searchProduct(productQuery) {
  if (!productQuery || typeof productQuery !== "string") {
    return { error: "Product query is required" };
  }

  try {
    const result = await searchProductForSprite(productQuery.trim(), {
      maxSearches: 5,
    });

    return {
      step: "search",
      success: true,
      imageUrl: result.imageUrl,
      imageUrls: result.imageUrls ?? [],
      spriteDescription: result.spriteDescription,
      productName: result.productName,
      confidence: result.confidence,
      searchResults: result.searchResults.slice(0, 5), // Limit for UI
    };
  } catch (err) {
    console.error("Product search error:", err);
    return { error: err.message || "Failed to search for product" };
  }
}

/**
 * Step 2: Fetch the product image and convert to data URL
 * Tries multiple URLs (imageUrl + imageUrls) until one succeeds for reliability
 */
export async function fetchProductImage(imageUrl, options = {}) {
  const { imageUrls = [] } = options;
  const urlsToTry = [
    ...(imageUrl ? [imageUrl] : []),
    ...imageUrls.filter((u) => u && u !== imageUrl),
  ];

  if (urlsToTry.length === 0) {
    return { error: "Image URL is required" };
  }

  try {
    const imageDataUrl = await fetchImageFromUrls(urlsToTry);

    return {
      step: "fetch",
      success: true,
      imageDataUrl,
      imageUrl: urlsToTry[0],
    };
  } catch (err) {
    console.error("Image fetch error:", err);
    return { error: err.message || "Failed to fetch image" };
  }
}

/**
 * Step 3: Generate sprite from the fetched image
 * (Uses the existing generateSprite but with a data URL instead of file)
 */
export async function generateSpriteFromDataUrl(
  imageDataUrl,
  provider = "gemini",
  gridStr = "2x2",
  frameSize = 128,
  shouldGenerateGif = true,
) {
  if (!imageDataUrl) {
    return { error: "Image data URL is required" };
  }

  const gridParts = gridStr.toLowerCase().split("x");
  if (gridParts.length !== 2) {
    return { error: "Invalid grid format" };
  }
  const cols = Number.parseInt(gridParts[0], 10);
  const rows = Number.parseInt(gridParts[1], 10);

  const model = PROVIDER_TO_MODEL[provider];
  if (!model) {
    return { error: `Unknown provider: ${provider}` };
  }

  try {
    // Validate that we have a proper base64 data URL
    if (!imageDataUrl.startsWith("data:image/")) {
      console.error(
        "Invalid image data URL format:",
        imageDataUrl.slice(0, 100),
      );
      return { error: "Invalid image format - expected base64 data URL" };
    }

    console.log("Generating sprite with model:", model);
    console.log("Image data URL prefix:", imageDataUrl.slice(0, 50));

    const messages = [
      {
        role: "user",
        content: [
          { type: "text", text: SPRITE_PROMPT },
          { type: "image_url", image_url: { url: imageDataUrl } },
        ],
      },
    ];

    const result = await invoke_llm(model, messages, { maxRetries: 3 });
    if (!result.images?.length) {
      return { error: "No images returned from model" };
    }
    const rawImageDataUrl = result.images[0];

    const spriteSheetDataUrl = await postprocessSpriteSheet(rawImageDataUrl, {
      grid: [cols, rows],
      targetFrame: [frameSize, frameSize],
      maxColors: 256,
    });

    const totalWidth = cols * frameSize;
    const totalHeight = rows * frameSize;

    let gifDataUrl = null;
    if (shouldGenerateGif) {
      gifDataUrl = await createGifFromSpriteSheet(spriteSheetDataUrl, {
        grid: [cols, rows],
        frameDurationMs: 150,
        scale: 1,
      });
    }

    return {
      step: "generate",
      success: true,
      rawImage: rawImageDataUrl,
      spriteSheet: spriteSheetDataUrl,
      gif: gifDataUrl,
      metadata: {
        grid: `${cols}x${rows}`,
        frameSize,
        totalSize: `${totalWidth}x${totalHeight}`,
        provider,
      },
    };
  } catch (err) {
    console.error("Sprite generation error:", err);
    return { error: err.message || "Failed to generate sprite" };
  }
}
