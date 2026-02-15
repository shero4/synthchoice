/**
 * POST /api/sprites/generate
 * Generate a pixel-art sprite sheet from a brand logo using LLM image generation.
 *
 * Providers supported:
 *   - openrouter (default): Gemini Flash Image Preview via OpenRouter
 *   - gemini: Direct Google Gemini API
 *   - openai: OpenAI Responses API with image_generation tool
 *
 * Request body (multipart/form-data):
 *   - logo: File - the brand logo image
 *   - provider: string - "openrouter" | "gemini" | "openai" (default: "openrouter")
 *   - grid: string - "2x2" format (default: "2x2")
 *   - frameSize: number - size of each frame in pixels (default: 128)
 *
 * Response:
 *   - rawImage: base64 data URL of raw model output
 *   - spriteSheet: base64 data URL of processed sprite sheet
 *   - gif: base64 data URL of animated GIF (optional)
 *   - metadata: { grid, frameSize, totalSize }
 */

import { NextResponse } from "next/server";
import {
  postprocessSpriteSheet,
  createGifFromSpriteSheet,
} from "@/lib/sprites/process";
import { invoke_llm, Models } from "@/lib/llm";

// Sprite generation prompt template
const SPRITE_PROMPT = `You are a skilled pixel artist creating game collectible sprites (like Mario coins or Pokemon items).

GOAL: Create a 2x2 sprite sheet (4 frames) showing a floating/bobbing animation.

Subject:
- Use the attached logo/image as reference.
- Create a recognizable pixel-art icon version.
- Place the icon INSIDE a circular or elliptical colored background/border (like game collectibles).
- The circular background should have a subtle gradient or shine to look 3D and collectible.

Sprite sheet layout (MUST follow exactly):
- Grid: 2 rows x 2 columns (4 frames total).
- Each frame: 128x128 pixels.
- Total sheet: 256x256 pixels.
- NO gaps between frames. Frames touch edge-to-edge.

Animation frames (creates a floating/bobbing loop):
- Frame 1 (top-left): Base position (center)
- Frame 2 (top-right): Moved UP ~4-6 pixels, slight squash, with some golden glittery stars on top right of the icon (to depict floating)
- Frame 3 (bottom-left): Back to center position
- Frame 4 (bottom-right): Moved DOWN ~4-6 pixels, slight stretch

Each frame should have:
- The circular/elliptical background container
- A small elliptical shadow underneath that changes size with the bobbing
- The icon centered inside the circle

Style:
- Clean pixel art, visible at 1x scale.
- Bold dark outline around the circular container.
- Limited palette (16-32 colors).
- Transparent background OUTSIDE the circular container.

Output:
- Return ONLY the 256x256 sprite sheet PNG.
- No text labels, no mockups.
`;

/** Provider string from form -> model for image generation */
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

export async function POST(request) {
  try {
    const formData = await request.formData();
    const logo = formData.get("logo");
    const provider = formData.get("provider") || "openrouter";
    const gridStr = formData.get("grid") || "2x2";
    const frameSize = Number.parseInt(formData.get("frameSize") || "128", 10);
    const generateGif = formData.get("generateGif") === "true";

    if (!logo || !(logo instanceof File)) {
      return NextResponse.json(
        { error: "Logo file is required" },
        { status: 400 }
      );
    }

    // Parse grid
    const gridParts = gridStr.toLowerCase().split("x");
    if (gridParts.length !== 2) {
      return NextResponse.json(
        { error: "Invalid grid format. Use COLSxROWS (e.g., 2x2)" },
        { status: 400 }
      );
    }
    const cols = Number.parseInt(gridParts[0], 10);
    const rows = Number.parseInt(gridParts[1], 10);

    const model = PROVIDER_TO_MODEL[provider];
    if (!model) {
      return NextResponse.json(
        { error: `Unknown provider: ${provider}` },
        { status: 400 }
      );
    }

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

    let rawImageDataUrl;
    try {
      const result = await invoke_llm(model, messages, { maxRetries: 3 });
      if (!result.images?.length) {
        throw new Error("No images returned from model");
      }
      rawImageDataUrl = result.images[0];
    } catch (err) {
      const msg = err.message || "LLM invocation failed";
      if (msg.includes("not configured")) {
        return NextResponse.json({ error: msg }, { status: 500 });
      }
      throw err;
    }

    // Post-process the sprite sheet
    const spriteSheetDataUrl = await postprocessSpriteSheet(rawImageDataUrl, {
      grid: [cols, rows],
      targetFrame: [frameSize, frameSize],
      maxColors: 256,
    });

    // Calculate total size
    const totalWidth = cols * frameSize;
    const totalHeight = rows * frameSize;

    // Generate GIF if requested
    let gifDataUrl = null;
    if (generateGif) {
      gifDataUrl = await createGifFromSpriteSheet(spriteSheetDataUrl, {
        grid: [cols, rows],
        frameDurationMs: 150,
        scale: 1,
      });
    }

    return NextResponse.json({
      rawImage: rawImageDataUrl,
      spriteSheet: spriteSheetDataUrl,
      gif: gifDataUrl,
      metadata: {
        grid: `${cols}x${rows}`,
        frameSize,
        totalSize: `${totalWidth}x${totalHeight}`,
        provider,
      },
    });
  } catch (error) {
    console.error("Sprite generation error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate sprite" },
      { status: 500 }
    );
  }
}
