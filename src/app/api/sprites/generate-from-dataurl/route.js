/**
 * POST /api/sprites/generate-from-dataurl
 * Generate sprite from base64 data URL (avoids RSC serialization limits).
 *
 * Request body (JSON):
 *   - imageDataUrl: string - base64 data URL of the source image
 *   - provider: "openrouter" | "gemini" | "openai"
 *   - grid: "2x2" format
 *   - frameSize: number
 *   - generateGif: boolean
 */

import { NextResponse } from "next/server";
import {
  postprocessSpriteSheet,
  createGifFromSpriteSheet,
} from "@/lib/sprites/process";
import { SPRITE_PROMPT } from "@/lib/sprites/prompt";
import { invoke_llm, Models } from "@/lib/llm";

const PROVIDER_TO_MODEL = {
  openrouter: Models.GEMINI_2_5_FLASH_IMAGE_PREVIEW,
  gemini: Models.GEMINI_2_5_FLASH_IMAGE,
  openai: Models.GPT_4_1_MINI,
};

export const maxDuration = 60;

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      imageDataUrl,
      provider = "gemini",
      grid: gridStr = "2x2",
      frameSize = 128,
      generateGif = true,
    } = body;

    if (!imageDataUrl || !imageDataUrl.startsWith("data:image/")) {
      return NextResponse.json(
        { error: "imageDataUrl (base64 data URL) is required" },
        { status: 400 }
      );
    }

    const gridParts = String(gridStr).toLowerCase().split("x");
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
      return NextResponse.json(
        { error: "No images returned from model" },
        { status: 500 }
      );
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
