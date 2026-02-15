import { Container, Graphics, Rectangle, Texture } from "pixi.js";

/**
 * Frame dimensions for the Pixel Crawler Body_A sprite sheets.
 * Each sheet is a horizontal strip of 64×64 frames.
 */
const FRAME_W = 64;
const FRAME_H = 64;

// Walk sheets: 384×64 → 6 frames
const WALK_FRAMES = 6;
// Idle sheets: 256×64 → 4 frames
const IDLE_FRAMES = 4;

/**
 * Slice a horizontal sprite sheet into an array of Texture frames.
 */
function sliceSheet(texture, frameCount, frameWidth = FRAME_W, frameHeight = FRAME_H) {
  const frames = [];
  for (let i = 0; i < frameCount; i++) {
    frames.push(
      new Texture({
        source: texture.source,
        frame: new Rectangle(i * frameWidth, 0, frameWidth, frameHeight),
      }),
    );
  }
  return frames;
}

/**
 * Build 4-directional animations.
 * When app is provided, uses a procedural clothed character (red shirt, brown pants) to match Serene Village style.
 *
 * @param {object} assets — loaded asset textures from assetLoader
 * @param {object} [app] — PixiJS Application; if provided, uses clothed procedural sprites
 * @returns {{ idleDown, idleSide, idleUp, walkDown, walkSide, walkUp }}
 */
export function buildSpriteAnimations(assets, app) {
  // Prefer procedural clothed character when we have a renderer (matches reference image)
  if (app) {
    return createProceduralAnimations(app, true);
  }
  if (assets?.charWalkDown && assets?.charIdleDown) {
    return {
      idleDown: sliceSheet(assets.charIdleDown, IDLE_FRAMES),
      idleSide: sliceSheet(assets.charIdleSide, IDLE_FRAMES),
      idleUp: sliceSheet(assets.charIdleUp, IDLE_FRAMES),
      walkDown: sliceSheet(assets.charWalkDown, WALK_FRAMES),
      walkSide: sliceSheet(assets.charWalkSide, WALK_FRAMES),
      walkUp: sliceSheet(assets.charWalkUp, WALK_FRAMES),
    };
  }
  return createProceduralAnimations(null, true);
}

// ---------------------------------------------------------------------------
// Procedural fallback — simple pixel-art character in 4 directions
// ---------------------------------------------------------------------------

function makeTexture(drawFn) {
  const container = new Container();
  drawFn(container);
  // We can't generate textures without a renderer,
  // so return the container's children's graphics as a placeholder
  return null;
}

// Clothed character colors (Serene Village / Pokemon reference)
const SHIRT = 0xb71c1c;      // red
const SHIRT_DARK = 0x8b0000;
const PANTS = 0x5d4037;      // brown
const PANTS_DARK = 0x3e2723;
const SKIN = 0xe8b896;
const SKIN_DARK = 0xc49a6c;
const HAIR = 0x3e2723;
const HAIR_LIGHT = 0x5d4037;

/**
 * Draw a single 16×24 frame of a clothed character (red shirt, brown pants, hair).
 */
function drawClothedCharacterFrame(opts = {}) {
  const {
    bodyBob = 0,
    legOffset = 0,
    armSide = "left",
    lookDir = "down",
  } = opts;

  const g = new Graphics();

  // Shadow
  g.ellipse(8, 20, 6, 2.5).fill({ color: 0x000000, alpha: 0.25 });

  // Legs (pants)
  g.roundRect(5 + legOffset, 14, 3, 8, 1).fill(PANTS);
  g.roundRect(9 - legOffset, 14, 3, 8, 1).fill(PANTS);
  g.roundRect(5 + legOffset, 14, 3, 2, 1).fill(PANTS_DARK);
  g.roundRect(9 - legOffset, 14, 3, 2, 1).fill(PANTS_DARK);

  // Body (shirt)
  g.roundRect(3, 5 + bodyBob, 11, 10, 2).fill(SHIRT);
  g.roundRect(3, 5 + bodyBob, 11, 3, 2).fill(SHIRT_DARK);

  // Arms (shirt sleeves or skin)
  const armX = armSide === "left" ? 0 : 13;
  g.roundRect(armX, 6 + bodyBob, 2, 8, 1).fill(SHIRT_DARK);

  // Head (skin)
  g.circle(8, 4 + bodyBob, 5).fill(SKIN);
  g.circle(8, 3 + bodyBob, 5).fill(SKIN_DARK);

  // Hair (cap on top of head, short brown hair like reference)
  g.ellipse(8, 0 + bodyBob, 5, 3.5).fill(HAIR);
  g.roundRect(3, -1 + bodyBob, 10, 5, 1).fill(HAIR);

  // Face (eyes on top of hair so they stay visible)
  if (lookDir === "down") {
    g.circle(6, 4 + bodyBob, 1).fill(0x1a1a1a);
    g.circle(10, 4 + bodyBob, 1).fill(0x1a1a1a);
  } else if (lookDir !== "up") {
    g.circle(lookDir === "left" ? 5 : 11, 4 + bodyBob, 1).fill(0x1a1a1a);
  }

  return g;
}

/**
 * Legacy single-color frame (used if clothed=false).
 */
function drawCharacterFrame(color, opts = {}) {
  const {
    bodyBob = 0,
    legOffset = 0,
    armSide = "left",
    lookDir = "down",
  } = opts;

  const g = new Graphics();
  g.ellipse(8, 14, 5, 2).fill({ color: 0x000000, alpha: 0.2 });
  g.roundRect(5 + legOffset, 10, 3, 5, 1).fill(darken(color, 30));
  g.roundRect(9 - legOffset, 10, 3, 5, 1).fill(darken(color, 30));
  g.roundRect(4, 4 + bodyBob, 9, 8, 2).fill(color);
  const armX = armSide === "left" ? 1 : 12;
  g.roundRect(armX, 6 + bodyBob, 2, 6, 1).fill(darken(color, 20));
  g.circle(8, 3 + bodyBob, 4).fill(lighten(color, 20));
  if (lookDir === "down") {
    g.circle(6, 3 + bodyBob, 1).fill(0x0f172a);
    g.circle(10, 3 + bodyBob, 1).fill(0x0f172a);
  } else if (lookDir !== "up") {
    g.circle(lookDir === "left" ? 5 : 10, 3 + bodyBob, 1).fill(0x0f172a);
  }
  return g;
}

function darken(hex, amount) {
  const num = typeof hex === "string" ? Number.parseInt(hex.replace("#", ""), 16) : hex;
  const r = Math.max(0, ((num >> 16) & 0xff) - amount);
  const gVal = Math.max(0, ((num >> 8) & 0xff) - amount);
  const b = Math.max(0, (num & 0xff) - amount);
  return (r << 16) + (gVal << 8) + b;
}

function lighten(hex, amount) {
  return darken(hex, -amount);
}

const CLOTHED_FRAME_H = 24;

/**
 * Generate procedural animations. When clothed=true, uses red shirt / brown pants / hair.
 */
export function createProceduralAnimations(app, clothed = false, baseColor = 0x4488cc) {
  if (!app) {
    return {
      idleDown: [],
      idleSide: [],
      idleUp: [],
      walkDown: [],
      walkSide: [],
      walkUp: [],
    };
  }

  const draw = clothed
    ? (opts) => drawClothedCharacterFrame(opts)
    : (opts) => drawCharacterFrame(baseColor, opts);
  const frameH = clothed ? CLOTHED_FRAME_H : 16;

  const genTexture = (graphics) =>
    app.renderer.generateTexture({
      target: graphics,
      frame: new Rectangle(0, 0, 16, frameH),
      resolution: 2,
    });

  const idleDown = [
    genTexture(draw({ bodyBob: 0, lookDir: "down" })),
    genTexture(draw({ bodyBob: -1, lookDir: "down" })),
  ];
  const idleSide = [
    genTexture(draw({ bodyBob: 0, lookDir: "right" })),
    genTexture(draw({ bodyBob: -1, lookDir: "right" })),
  ];
  const idleUp = [
    genTexture(draw({ bodyBob: 0, lookDir: "up" })),
    genTexture(draw({ bodyBob: -1, lookDir: "up" })),
  ];
  const walkDown = [
    genTexture(draw({ legOffset: -2, bodyBob: 0, lookDir: "down" })),
    genTexture(draw({ legOffset: 2, bodyBob: -1, lookDir: "down" })),
    genTexture(draw({ legOffset: -2, bodyBob: 0, lookDir: "down" })),
    genTexture(draw({ legOffset: 2, bodyBob: 1, lookDir: "down" })),
  ];
  const walkSide = [
    genTexture(draw({ legOffset: -2, bodyBob: 0, armSide: "left", lookDir: "right" })),
    genTexture(draw({ legOffset: 2, bodyBob: -1, armSide: "right", lookDir: "right" })),
    genTexture(draw({ legOffset: -2, bodyBob: 0, armSide: "left", lookDir: "right" })),
    genTexture(draw({ legOffset: 2, bodyBob: 1, armSide: "right", lookDir: "right" })),
  ];
  const walkUp = [
    genTexture(draw({ legOffset: -2, bodyBob: 0, lookDir: "up" })),
    genTexture(draw({ legOffset: 2, bodyBob: -1, lookDir: "up" })),
    genTexture(draw({ legOffset: -2, bodyBob: 0, lookDir: "up" })),
    genTexture(draw({ legOffset: 2, bodyBob: 1, lookDir: "up" })),
  ];

  return { idleDown, idleSide, idleUp, walkDown, walkSide, walkUp };
}
