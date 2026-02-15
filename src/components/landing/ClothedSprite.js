"use client";

import { useEffect, useState, useMemo } from "react";

/**
 * Color utility functions
 */
function darken(hex, amount) {
  const num = typeof hex === "string" ? parseInt(hex.replace("#", ""), 16) : hex;
  const r = Math.max(0, ((num >> 16) & 0xff) - amount);
  const g = Math.max(0, ((num >> 8) & 0xff) - amount);
  const b = Math.max(0, (num & 0xff) - amount);
  return (r << 16) + (g << 8) + b;
}

function toHexString(num) {
  return `#${num.toString(16).padStart(6, "0")}`;
}

// Default skin tones
const SKIN = 0xe8b896;
const SKIN_DARK = 0xc49a6c;
const HAIR = 0x3e2723;

/**
 * Draw a clothed character frame on a canvas context
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Object} opts - Drawing options
 */
function drawClothedCharacter(ctx, opts = {}) {
  const {
    bodyBob = 0,
    legOffset = 0,
    armSide = "left",
    lookDir = "down",
    shirtColor = 0xb71c1c,
    pantsColor = 0x5d4037,
    hairColor = HAIR,
    offsetX = 0,
    offsetY = 0,
  } = opts;

  const shirtDark = darken(shirtColor, 40);
  const pantsDark = darken(pantsColor, 30);
  const skinDark = SKIN_DARK;

  // Helper to draw rounded rect
  const roundRect = (x, y, w, h, r, color) => {
    ctx.fillStyle = toHexString(color);
    ctx.beginPath();
    ctx.roundRect(x + offsetX, y + offsetY, w, h, r);
    ctx.fill();
  };

  // Helper to draw circle
  const circle = (x, y, radius, color, alpha = 1) => {
    ctx.fillStyle = typeof color === "string" ? color : toHexString(color);
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(x + offsetX, y + offsetY, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  };

  // Helper to draw ellipse
  const ellipse = (x, y, rx, ry, color, alpha = 1) => {
    ctx.fillStyle = typeof color === "string" ? color : toHexString(color);
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.ellipse(x + offsetX, y + offsetY, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  };

  // Shadow
  ellipse(8, 22, 6, 2.5, 0x000000, 0.25);

  // Legs (pants)
  roundRect(5 + legOffset, 14, 3, 8, 1, pantsColor);
  roundRect(9 - legOffset, 14, 3, 8, 1, pantsColor);
  roundRect(5 + legOffset, 14, 3, 2, 1, pantsDark);
  roundRect(9 - legOffset, 14, 3, 2, 1, pantsDark);

  // Body (shirt)
  roundRect(3, 5 + bodyBob, 11, 10, 2, shirtColor);
  roundRect(3, 5 + bodyBob, 11, 3, 2, shirtDark);

  // Arms (shirt sleeves)
  const armX = armSide === "left" ? 0 : 13;
  roundRect(armX, 6 + bodyBob, 3, 8, 1, shirtDark);

  // Head (skin)
  circle(8, 4 + bodyBob, 5, SKIN);
  circle(8, 3 + bodyBob, 5, skinDark);

  // Hair
  ellipse(8, 0 + bodyBob, 5, 3.5, hairColor);
  roundRect(3, -1 + bodyBob, 10, 5, 1, hairColor);

  // Face (eyes)
  if (lookDir === "down") {
    circle(6, 4 + bodyBob, 1, 0x1a1a1a);
    circle(10, 4 + bodyBob, 1, 0x1a1a1a);
  } else if (lookDir !== "up") {
    circle(lookDir === "left" ? 5 : 11, 4 + bodyBob, 1, 0x1a1a1a);
  }
}

/**
 * Generate all animation frames for a clothed character
 */
function generateFrames(shirtColor, pantsColor, hairColor) {
  const frameW = 16;
  const frameH = 24;
  const frames = {};

  const createFrameCanvas = (drawOpts) => {
    const canvas = document.createElement("canvas");
    canvas.width = frameW;
    canvas.height = frameH;
    const ctx = canvas.getContext("2d");
    drawClothedCharacter(ctx, { ...drawOpts, shirtColor, pantsColor, hairColor });
    return canvas.toDataURL();
  };

  // Idle animations (2 frames each)
  frames.idleDown = [
    createFrameCanvas({ bodyBob: 0, lookDir: "down" }),
    createFrameCanvas({ bodyBob: -1, lookDir: "down" }),
  ];
  frames.idleSide = [
    createFrameCanvas({ bodyBob: 0, lookDir: "right" }),
    createFrameCanvas({ bodyBob: -1, lookDir: "right" }),
  ];
  frames.idleUp = [
    createFrameCanvas({ bodyBob: 0, lookDir: "up" }),
    createFrameCanvas({ bodyBob: -1, lookDir: "up" }),
  ];

  // Walk animations (4 frames each)
  frames.walkDown = [
    createFrameCanvas({ legOffset: -2, bodyBob: 0, lookDir: "down" }),
    createFrameCanvas({ legOffset: 2, bodyBob: -1, lookDir: "down" }),
    createFrameCanvas({ legOffset: -2, bodyBob: 0, lookDir: "down" }),
    createFrameCanvas({ legOffset: 2, bodyBob: 1, lookDir: "down" }),
  ];
  frames.walkSide = [
    createFrameCanvas({ legOffset: -2, bodyBob: 0, armSide: "left", lookDir: "right" }),
    createFrameCanvas({ legOffset: 2, bodyBob: -1, armSide: "right", lookDir: "right" }),
    createFrameCanvas({ legOffset: -2, bodyBob: 0, armSide: "left", lookDir: "right" }),
    createFrameCanvas({ legOffset: 2, bodyBob: 1, armSide: "right", lookDir: "right" }),
  ];
  frames.walkUp = [
    createFrameCanvas({ legOffset: -2, bodyBob: 0, lookDir: "up" }),
    createFrameCanvas({ legOffset: 2, bodyBob: -1, lookDir: "up" }),
    createFrameCanvas({ legOffset: -2, bodyBob: 0, lookDir: "up" }),
    createFrameCanvas({ legOffset: 2, bodyBob: 1, lookDir: "up" }),
  ];

  return frames;
}

/**
 * ClothedSprite - Renders an animated clothed character
 *
 * Props:
 * - shirtColor: Hex color for the shirt (e.g., 0x3b82f6 or "#3b82f6")
 * - pantsColor: Hex color for the pants
 * - hairColor: Hex color for the hair
 * - animation: "idle" | "walk"
 * - direction: "down" | "up" | "left" | "right"
 * - scale: Scale factor for rendering (default: 3)
 * - fps: Frames per second (default: 6)
 */
export function ClothedSprite({
  shirtColor = 0x3b82f6,
  pantsColor = 0x5d4037,
  hairColor = 0x3e2723,
  animation = "idle",
  direction = "down",
  scale = 3,
  fps = 6,
  style = {},
}) {
  const [currentFrame, setCurrentFrame] = useState(0);
  const [frames, setFrames] = useState(null);

  // Generate frames on mount or when colors change
  useEffect(() => {
    const shirtHex = typeof shirtColor === "string" ? parseInt(shirtColor.replace("#", ""), 16) : shirtColor;
    const pantsHex = typeof pantsColor === "string" ? parseInt(pantsColor.replace("#", ""), 16) : pantsColor;
    const hairHex = typeof hairColor === "string" ? parseInt(hairColor.replace("#", ""), 16) : hairColor;
    
    const generatedFrames = generateFrames(shirtHex, pantsHex, hairHex);
    setFrames(generatedFrames);
  }, [shirtColor, pantsColor, hairColor]);

  // Get current animation frames
  const currentFrames = useMemo(() => {
    if (!frames) return [];
    
    const animKey = animation === "walk" ? "walk" : "idle";
    let dirKey = direction;
    if (direction === "left" || direction === "right") {
      dirKey = "Side";
    } else {
      dirKey = direction.charAt(0).toUpperCase() + direction.slice(1);
    }
    
    return frames[`${animKey}${dirKey}`] || frames.idleDown || [];
  }, [frames, animation, direction]);

  // Animation loop
  useEffect(() => {
    if (currentFrames.length === 0) return;

    const interval = setInterval(() => {
      setCurrentFrame((prev) => (prev + 1) % currentFrames.length);
    }, 1000 / fps);

    return () => clearInterval(interval);
  }, [currentFrames.length, fps]);

  if (!frames || currentFrames.length === 0) {
    return <div style={{ width: 16 * scale, height: 24 * scale }} />;
  }

  const frameDataUrl = currentFrames[currentFrame % currentFrames.length];
  const flipX = direction === "left";

  return (
    <div
      style={{
        width: 16 * scale,
        height: 24 * scale,
        backgroundImage: `url(${frameDataUrl})`,
        backgroundSize: "100% 100%",
        backgroundRepeat: "no-repeat",
        imageRendering: "pixelated",
        transform: flipX ? "scaleX(-1)" : "none",
        ...style,
      }}
    />
  );
}
