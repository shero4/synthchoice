/**
 * Sprite Processing Utilities
 * Server-side image processing for sprite sheets using Sharp
 */

import sharp from "sharp";

/**
 * Extract base64 and mime type from a data URL
 * @param {string} dataUrl
 * @returns {{ mime: string, buffer: Buffer }}
 */
function parseDataUrl(dataUrl) {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    throw new Error("Invalid data URL format");
  }
  return {
    mime: match[1],
    buffer: Buffer.from(match[2], "base64"),
  };
}

/**
 * Convert a buffer to a data URL
 * @param {Buffer} buffer
 * @param {string} mime
 * @returns {string}
 */
function bufferToDataUrl(buffer, mime = "image/png") {
  return `data:${mime};base64,${buffer.toString("base64")}`;
}

/**
 * Remove white background from an image buffer, making it transparent
 * @param {Buffer} inputBuffer - PNG image buffer
 * @param {Object} options
 * @param {number} options.threshold - Color distance threshold for "white" (default: 30)
 * @returns {Promise<Buffer>} PNG buffer with white pixels made transparent
 */
async function removeWhiteBackground(inputBuffer, options = {}) {
  const { threshold = 30 } = options;

  // Get image metadata
  const metadata = await sharp(inputBuffer).metadata();
  const { width, height } = metadata;

  // Get raw RGBA pixel data
  const rawBuffer = await sharp(inputBuffer)
    .ensureAlpha()
    .raw()
    .toBuffer();

  // Process pixels: make white/near-white pixels transparent
  const pixels = new Uint8Array(rawBuffer);
  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];

    // Check if pixel is white or near-white
    // Calculate distance from pure white (255, 255, 255)
    const distFromWhite = Math.sqrt(
      Math.pow(255 - r, 2) + Math.pow(255 - g, 2) + Math.pow(255 - b, 2)
    );

    if (distFromWhite <= threshold) {
      // Make this pixel fully transparent
      pixels[i + 3] = 0;
    }
  }

  // Convert back to PNG buffer
  return sharp(Buffer.from(pixels), {
    raw: {
      width,
      height,
      channels: 4,
    },
  })
    .png()
    .toBuffer();
}

/**
 * Post-process a sprite sheet from model output
 * - Splits input into grid cells
 * - Resizes each cell to target frame size (nearest neighbor for pixel art)
 * - Reassembles into a clean sprite sheet
 * - Optionally removes white background
 * - Quantizes to 8-bit palette
 *
 * @param {string} inputDataUrl - Data URL of the raw model output image
 * @param {Object} options
 * @param {[number, number]} options.grid - [cols, rows] grid layout (default: [2, 2])
 * @param {[number, number]} options.targetFrame - [width, height] of each frame (default: [128, 128])
 * @param {number} options.maxColors - Max colors for palette (default: 256)
 * @param {boolean} options.removeWhiteBg - Remove white background (default: true)
 * @param {number} options.whiteBgThreshold - Threshold for white detection (default: 30)
 * @returns {Promise<string>} Data URL of the processed sprite sheet
 */
export async function postprocessSpriteSheet(inputDataUrl, options = {}) {
  const {
    grid = [2, 2],
    targetFrame = [128, 128],
    maxColors = 256,
    removeWhiteBg = true,
    whiteBgThreshold = 30,
  } = options;

  const [cols, rows] = grid;
  const [targetW, targetH] = targetFrame;

  // Parse input
  const { buffer: inputBuffer } = parseDataUrl(inputDataUrl);

  // Get input image metadata
  const metadata = await sharp(inputBuffer).metadata();
  const { width: W, height: H } = metadata;

  const cellW = Math.floor(W / cols);
  const cellH = Math.floor(H / rows);

  // Output dimensions
  const outW = cols * targetW;
  const outH = rows * targetH;

  // Extract and resize each cell
  const cells = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * cellW;
      const y = r * cellH;

      // Extract cell and resize with nearest neighbor
      const cellBuffer = await sharp(inputBuffer)
        .extract({ left: x, top: y, width: cellW, height: cellH })
        .resize(targetW, targetH, {
          kernel: sharp.kernel.nearest,
          fit: "fill",
        })
        .toBuffer();

      cells.push({
        input: cellBuffer,
        left: c * targetW,
        top: r * targetH,
      });
    }
  }

  // Composite all cells onto a transparent canvas
  let sheetBuffer = await sharp({
    create: {
      width: outW,
      height: outH,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(cells)
    .png()
    .toBuffer();

  // Remove white background if enabled
  if (removeWhiteBg) {
    sheetBuffer = await removeWhiteBackground(sheetBuffer, {
      threshold: whiteBgThreshold,
    });
  }

  // Final quantization to palette
  const finalBuffer = await sharp(sheetBuffer)
    .png({
      palette: true,
      colors: Math.min(maxColors, 256),
      effort: 10,
    })
    .toBuffer();

  return bufferToDataUrl(finalBuffer, "image/png");
}

/**
 * Create an animated GIF from a sprite sheet using Sharp
 * Reads frames left-to-right, top-to-bottom and assembles into a looping GIF
 *
 * @param {string} spriteSheetDataUrl - Data URL of the sprite sheet
 * @param {Object} options
 * @param {[number, number]} options.grid - [cols, rows] grid layout (default: [2, 2])
 * @param {number} options.frameDurationMs - Duration of each frame in ms (default: 150)
 * @param {number} options.scale - Scale factor for output (default: 1)
 * @param {boolean} options.loop - Whether to loop (default: true)
 * @returns {Promise<string>} Data URL of the animated GIF
 */
export async function createGifFromSpriteSheet(spriteSheetDataUrl, options = {}) {
  const {
    grid = [2, 2],
    frameDurationMs = 150,
    scale = 1,
  } = options;

  const [cols, rows] = grid;

  // Parse input
  const { buffer: sheetBuffer } = parseDataUrl(spriteSheetDataUrl);

  // Get sheet dimensions
  const metadata = await sharp(sheetBuffer).metadata();
  const { width: W, height: H } = metadata;

  const frameW = Math.floor(W / cols);
  const frameH = Math.floor(H / rows);

  const outputW = frameW * scale;
  const outputH = frameH * scale;

  // Extract each frame as a buffer
  const frameBuffers = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * frameW;
      const y = r * frameH;

      // Extract frame, scale if needed
      let frameSharp = sharp(sheetBuffer).extract({
        left: x,
        top: y,
        width: frameW,
        height: frameH,
      });

      if (scale > 1) {
        frameSharp = frameSharp.resize(outputW, outputH, {
          kernel: sharp.kernel.nearest,
          fit: "fill",
        });
      }

      // Convert to PNG buffer for GIF composition
      const frameBuffer = await frameSharp.png().toBuffer();
      frameBuffers.push(frameBuffer);
    }
  }

  // Create animated GIF using sharp
  // Stack frames vertically for sharp's GIF input
  const stackedHeight = outputH * frameBuffers.length;

  // Composite all frames into a vertical strip
  const frameComposites = frameBuffers.map((buf, i) => ({
    input: buf,
    top: i * outputH,
    left: 0,
  }));

  const stackedBuffer = await sharp({
    create: {
      width: outputW,
      height: stackedHeight,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(frameComposites)
    .raw()
    .toBuffer();

  // Create animated GIF with sharp
  // Sharp expects raw pixel data for animated GIF creation
  const gifBuffer = await sharp(stackedBuffer, {
    raw: {
      width: outputW,
      height: stackedHeight,
      channels: 4,
    },
  })
    .gif({
      delay: frameDurationMs,
      loop: 0, // 0 = loop forever
    })
    .toBuffer();

  return bufferToDataUrl(gifBuffer, "image/gif");
}

/**
 * Extract individual frames from a sprite sheet
 * @param {string} spriteSheetDataUrl - Data URL of the sprite sheet
 * @param {Object} options
 * @param {[number, number]} options.grid - [cols, rows] grid layout (default: [2, 2])
 * @returns {Promise<string[]>} Array of data URLs for each frame
 */
export async function extractFrames(spriteSheetDataUrl, options = {}) {
  const { grid = [2, 2] } = options;

  const [cols, rows] = grid;

  // Parse input
  const { buffer: sheetBuffer } = parseDataUrl(spriteSheetDataUrl);

  // Get sheet dimensions
  const metadata = await sharp(sheetBuffer).metadata();
  const { width: W, height: H } = metadata;

  const frameW = Math.floor(W / cols);
  const frameH = Math.floor(H / rows);

  const frames = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * frameW;
      const y = r * frameH;

      const frameBuffer = await sharp(sheetBuffer)
        .extract({ left: x, top: y, width: frameW, height: frameH })
        .png()
        .toBuffer();

      frames.push(bufferToDataUrl(frameBuffer, "image/png"));
    }
  }

  return frames;
}
