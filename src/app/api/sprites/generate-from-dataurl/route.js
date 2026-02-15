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
import { invoke_llm, Models } from "@/lib/llm";

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
- **Transparent background** outside the circular icon

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
- The 4 frames should tile perfectly when the sheet is divided into quadrants

**CRITICAL:** Do not add any decorative borders, frame numbers, or guides. The output must be game-ready.
`;

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
