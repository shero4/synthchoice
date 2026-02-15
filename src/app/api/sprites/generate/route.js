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

/**
 * Convert a File/Blob to base64 data URL
 */
async function fileToDataUrl(file) {
  const buffer = await file.arrayBuffer();
  const base64 = Buffer.from(buffer).toString("base64");
  const mime = file.type || "image/png";
  return `data:${mime};base64,${base64}`;
}

/**
 * Extract base64 image from data URL
 */
function dataUrlToBase64(dataUrl) {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error("Invalid data URL format");
  return { mime: match[1], base64: match[2] };
}

/**
 * Call OpenRouter API for image generation
 */
async function callOpenRouter(apiKey, logoDataUrl, prompt) {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash-image-preview",
      modalities: ["image", "text"],
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", imageUrl: { url: logoDataUrl } },
          ],
        },
      ],
      stream: false,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} - ${error}`);
  }

  const data = await response.json();

  // Extract images from response
  const images = [];
  const choices = data.choices || [];
  if (choices.length > 0) {
    const msg = choices[0].message || {};
    for (const im of msg.images || []) {
      const imageUrlObj = im.image_url || im.imageUrl || {};
      if (imageUrlObj.url) {
        images.push(imageUrlObj.url);
      }
    }
  }

  if (images.length === 0) {
    throw new Error(`No images returned from OpenRouter: ${JSON.stringify(data).slice(0, 500)}`);
  }

  return images[0];
}

/**
 * Call Google Gemini API directly
 */
async function callGemini(apiKey, logoDataUrl, prompt) {
  const { mime, base64 } = dataUrlToBase64(logoDataUrl);

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp-image-generation:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              { text: prompt },
              { inlineData: { mimeType: mime, data: base64 } },
            ],
          },
        ],
        generationConfig: {
          responseModalities: ["Text", "Image"],
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${error}`);
  }

  const data = await response.json();

  // Extract images from response
  const images = [];
  const candidates = data.candidates || [];
  for (const cand of candidates) {
    const content = cand.content || {};
    for (const part of content.parts || []) {
      const inline = part.inlineData;
      if (inline?.data && inline?.mimeType) {
        images.push(`data:${inline.mimeType};base64,${inline.data}`);
      }
    }
  }

  if (images.length === 0) {
    throw new Error(`No images returned from Gemini: ${JSON.stringify(data).slice(0, 500)}`);
  }

  return images[0];
}

/**
 * Call OpenAI Responses API with image_generation tool
 */
async function callOpenAI(apiKey, logoDataUrl, prompt) {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "user",
          content: [
            { type: "input_text", text: prompt },
            { type: "input_image", image_url: logoDataUrl },
          ],
        },
      ],
      tools: [{ type: "image_generation" }],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${error}`);
  }

  const data = await response.json();

  // Extract images from response
  const images = [];
  for (const item of data.output || []) {
    if (item.type === "image_generation_call" && item.result) {
      images.push(`data:image/png;base64,${item.result}`);
    }
  }

  if (images.length === 0) {
    throw new Error(`No images returned from OpenAI: ${JSON.stringify(data).slice(0, 500)}`);
  }

  return images[0];
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

    // Get API key based on provider
    let apiKey;
    switch (provider) {
      case "openrouter":
        apiKey = process.env.OPENROUTER_API_KEY;
        if (!apiKey) {
          return NextResponse.json(
            { error: "OPENROUTER_API_KEY not configured" },
            { status: 500 }
          );
        }
        break;
      case "gemini":
        apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
          return NextResponse.json(
            { error: "GEMINI_API_KEY not configured" },
            { status: 500 }
          );
        }
        break;
      case "openai":
        apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
          return NextResponse.json(
            { error: "OPENAI_API_KEY not configured" },
            { status: 500 }
          );
        }
        break;
      default:
        return NextResponse.json(
          { error: `Unknown provider: ${provider}` },
          { status: 400 }
        );
    }

    // Convert logo to data URL
    const logoDataUrl = await fileToDataUrl(logo);

    // Call the appropriate provider
    let rawImageDataUrl;
    switch (provider) {
      case "openrouter":
        rawImageDataUrl = await callOpenRouter(apiKey, logoDataUrl, SPRITE_PROMPT);
        break;
      case "gemini":
        rawImageDataUrl = await callGemini(apiKey, logoDataUrl, SPRITE_PROMPT);
        break;
      case "openai":
        rawImageDataUrl = await callOpenAI(apiKey, logoDataUrl, SPRITE_PROMPT);
        break;
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
