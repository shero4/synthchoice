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
import { SPRITE_PROMPT } from "@/lib/sprites/prompt";
import { invoke_llm, Models } from "@/lib/llm";

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
