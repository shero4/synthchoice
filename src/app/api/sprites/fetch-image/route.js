/**
 * POST /api/sprites/fetch-image
 * Fetch image from URL(s) and return as base64 data URL.
 * Tries multiple URLs until one succeeds (avoids RSC serialization limits).
 *
 * Request body (JSON):
 *   - imageUrls: string[] - URLs to try in order
 *
 * Response:
 *   - imageDataUrl: string - base64 data URL of the fetched image
 *   - imageUrl: string - the URL that succeeded
 */

import { NextResponse } from "next/server";
import { fetchImageFromUrls } from "@/lib/llm";

export async function POST(request) {
  try {
    const { imageUrls = [] } = await request.json();

    if (!Array.isArray(imageUrls) || imageUrls.length === 0) {
      return NextResponse.json(
        { error: "imageUrls array is required" },
        { status: 400 }
      );
    }

    const imageDataUrl = await fetchImageFromUrls(imageUrls);

    return NextResponse.json({
      imageDataUrl,
      imageUrl: imageUrls[0],
    });
  } catch (error) {
    console.error("Image fetch error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch image" },
      { status: 500 }
    );
  }
}
