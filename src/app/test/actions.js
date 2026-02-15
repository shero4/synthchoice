"use server";

import {
  postprocessSpriteSheet,
  createGifFromSpriteSheet,
} from "@/lib/sprites/process";
import {
  invoke_llm,
  Models,
  searchProductForSprite,
  fetchImageFromUrls,
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
- **Grid layout:** 2 columns × 2 rows = 4 frames
- **Each frame size:** 128x128 pixels (256÷2 = 128)
- **NO borders, NO gaps, NO padding** - frames are edge-to-edge
- **Transparent background** outside the circular icon

**EXACT FRAME POSITIONS:**
Frame 1: X=0,   Y=0   (top-left)     | Frame 2: X=128, Y=0   (top-right)
Frame 3: X=0,   Y=128 (bottom-left)  | Frame 4: X=128, Y=128 (bottom-right)

**ICON SHAPE & POSITIONING (CRITICAL):**
- **The icon MUST be circular** (perfect circle or coin-like disc)
- **The icon MUST be horizontally centered** in each 128x128 frame (X = 64px from left edge)
- **Vertical centering varies by animation** (see below), but the icon's horizontal position is ALWAYS X=64px
- The circular icon should be approximately 80-100px in diameter to fit well within the 128x128 frame

**ANIMATION SEQUENCE (bobbing/floating loop):**

- **Frame 1 (top-left):** 
  - Circular icon centered at X=64px, Y=64px (perfect center)
  
- **Frame 2 (top-right):** 
  - Circular icon centered at X=64px, Y=58-60px (moved UP 4-6 pixels)
  - Slight vertical squash (compressed by ~5%)
  - Add 2-3 small golden sparkle stars near top-right of the icon
  
- **Frame 3 (bottom-left):** 
  - Circular icon centered at X=64px, Y=64px (identical to Frame 1)
  
- **Frame 4 (bottom-right):** 
  - Circular icon centered at X=64px, Y=68-70px (moved DOWN 4-6 pixels)
  - Slight vertical stretch (elongated by ~5%)

**EACH FRAME MUST CONTAIN:**
- A **circular coin-like icon** with the logo/design inside
- **Bold dark outline** around the circular edge
- **Complementary background color** inside the circle
- **Small elliptical shadow** directly below the icon:
  - Shadow shrinks when icon moves up (Frame 2)
  - Shadow grows when icon moves down (Frame 4)
  - Shadow always centered at X=64px
- **NO extra borders, backgrounds, padding, or decorative elements** beyond the circular icon itself

**CENTERING RULE:**
- Think of each 128x128 frame as having a center point at (64, 64)
- The circular icon's center point MUST align with X=64 in ALL frames
- Only the Y-coordinate changes for the bobbing animation

**STYLE REQUIREMENTS:**
- Clean pixel art with sharp edges
- Limited palette: 16-32 colors maximum
- Transparent background outside the circular icon
- Visible and readable at 1x scale
- The icon should look like a collectible game coin

**OUTPUT REQUIREMENTS:**
- Return ONLY a single 256x256px PNG sprite sheet
- NO text, NO labels, NO frame dividers, NO mockups
- NO extra spacing or margins beyond the 256x256 canvas
- The 4 frames should tile perfectly when divided into 128x128 quadrants
- Each circular icon must be precisely centered horizontally in its frame

**CRITICAL:** 
- Do not add decorative borders, frame numbers, or guides
- The circular icon must be centered in each frame (X=64px always)
- Only vertical position (Y) changes for animation
- Output must be game-ready and directly usable by slicing into 128x128 tiles
`;

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
