"use server";

import {
  postprocessSpriteSheet,
  createGifFromSpriteSheet,
} from "@/lib/sprites/process";
import {
  invoke_llm,
  Models,
  searchProductForSprite,
  fetchImageAsDataUrl,
} from "@/lib/llm";

const SPRITE_PROMPT = `
You are a skilled pixel artist creating game collectible sprites (like Mario coins or Pokemon items).

**GOAL:** Create a single 256x256px sprite sheet containing 4 animation frames in a 2x2 grid.

**SUBJECT:**
- Use the attached logo/image as reference
- Create a recognizable pixel-art icon version
- Style it like a 3D game collectible (e.g., Mario coin)

**SPRITE SHEET STRUCTURE (CRITICAL):**
- **Total canvas size:** 256x256 pixels (this is your entire working area)
- **Grid layout:** 2 columns x 2 rows = 4 frames
- **Each frame size:** 128x128 pixels (256÷2 = 128)
- **NO borders, NO gaps, NO padding** - frames are edge-to-edge
- The sprite sheet should be a transparent background.

**EXACT FRAME POSITIONS:**
Frame 1: X=0,   Y=0   (top-left)     | Frame 2: X=128, Y=0   (top-right)
Frame 3: X=0,   Y=128 (bottom-left)  | Frame 4: X=128, Y=128 (bottom-right)

**ANIMATION SEQUENCE (bobbing/floating loop):**

- **Frame 1 (top-left):** Icon at center vertical position
- **Frame 2 (top-right):** Icon moved UP 4-6 pixels + slight squash + 2-3 small golden sparkle stars near top-right
- **Frame 3 (bottom-left):** Icon back to center position (identical to Frame 1)
- **Frame 4 (bottom-right):** Icon moved DOWN 4-6 pixels + slight stretch

**EACH FRAME MUST CONTAIN:**
- A circular/coin-like container with the icon inside
- The frame should just be a coin, no extra borders, no extra background, no extra padding, no extra spacing, no extra margin, no extra anything.
- Bold dark outline around the container
- Small elliptical shadow below the icon (shadow shrinks when icon moves up, grows when icon moves down)
- The icon centered within its 128x128 frame space

**STYLE REQUIREMENTS:**
- Clean pixel art, sharp edges
- Limited palette: 16-32 colors maximum
- Transparent background outside the circular container
- Visible and readable at 1x scale

**OUTPUT REQUIREMENTS:**
- Return ONLY a single 256x256px PNG sprite sheet
- NO text, NO labels, NO frame dividers, NO mockups
- NO extra spacing or margins beyond the 256x256 canvas
- The 4 frames should tile perfectly when the sheet is divided into quadrants

**CRITICAL:** Do not add any decorative borders, frame numbers, or guides. The output must be game-ready and directly usable by slicing it into 128x128 tiles.
`;

const PROVIDER_TO_MODEL = {
  openrouter: Models.GEMINI_2_5_FLASH_IMAGE_PREVIEW,
  gemini: Models.GEMINI_2_FLASH_IMAGE,
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
 */
export async function fetchProductImage(imageUrl) {
  if (!imageUrl) {
    return { error: "Image URL is required" };
  }

  try {
    const imageDataUrl = await fetchImageAsDataUrl(imageUrl);

    return {
      step: "fetch",
      success: true,
      imageDataUrl,
      imageUrl,
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
      console.error("Invalid image data URL format:", imageDataUrl.slice(0, 100));
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
