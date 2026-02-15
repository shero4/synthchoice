import { Assets, Container, Graphics, Rectangle, Texture } from "pixi.js";

function shadeHex(hex, delta = 0) {
  const normalized = hex.replace("#", "");
  const value =
    normalized.length === 3
      ? normalized
          .split("")
          .map((part) => `${part}${part}`)
          .join("")
      : normalized;
  const num = Number.parseInt(value, 16);
  const r = Math.max(0, Math.min(255, ((num >> 16) & 0xff) + delta));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0xff) + delta));
  const b = Math.max(0, Math.min(255, (num & 0xff) + delta));
  return (r << 16) + (g << 8) + b;
}

function createFrameTexture(app, colorHex, frame) {
  const container = new Container();

  const shadow = new Graphics();
  shadow.ellipse(0, 0, 8, 3).fill({ color: 0x0f172a, alpha: 0.22 });
  shadow.x = 12;
  shadow.y = 28;
  container.addChild(shadow);

  const legs = new Graphics();
  legs
    .roundRect(7 + frame.legOffset, 20, 4, 8, 1)
    .fill(shadeHex(colorHex, -10));
  legs
    .roundRect(13 - frame.legOffset, 20, 4, 8, 1)
    .fill(shadeHex(colorHex, -10));
  container.addChild(legs);

  const torso = new Graphics();
  torso.roundRect(6, 10 + frame.bodyBob, 12, 12, 2).fill(shadeHex(colorHex, 0));
  container.addChild(torso);

  const arm = new Graphics();
  arm
    .roundRect(frame.armSide === "left" ? 2 : 18, 13 + frame.bodyBob, 3, 9, 1)
    .fill(shadeHex(colorHex, -18));
  container.addChild(arm);

  const head = new Graphics();
  head.circle(12, 7 + frame.bodyBob, 5).fill(shadeHex(colorHex, 24));
  container.addChild(head);

  const eye = new Graphics();
  eye.circle(frame.lookLeft ? 10 : 14, 7 + frame.bodyBob, 1).fill(0x0f172a);
  container.addChild(eye);

  return app.renderer.generateTexture({
    target: container,
    frame: new Rectangle(0, 0, 24, 32),
    resolution: 1,
  });
}

function createProceduralAnimations(app, baseColor) {
  const idleFrames = [
    createFrameTexture(app, baseColor, {
      legOffset: 0,
      bodyBob: 0,
      armSide: "left",
      lookLeft: false,
    }),
    createFrameTexture(app, baseColor, {
      legOffset: 0,
      bodyBob: -1,
      armSide: "right",
      lookLeft: false,
    }),
  ];

  const walkFrames = [
    createFrameTexture(app, baseColor, {
      legOffset: -1,
      bodyBob: 0,
      armSide: "left",
      lookLeft: true,
    }),
    createFrameTexture(app, baseColor, {
      legOffset: 1,
      bodyBob: -1,
      armSide: "right",
      lookLeft: false,
    }),
    createFrameTexture(app, baseColor, {
      legOffset: -1,
      bodyBob: 0,
      armSide: "left",
      lookLeft: true,
    }),
    createFrameTexture(app, baseColor, {
      legOffset: 1,
      bodyBob: 1,
      armSide: "right",
      lookLeft: false,
    }),
  ];

  const thinkFrames = [
    createFrameTexture(app, baseColor, {
      legOffset: 0,
      bodyBob: 0,
      armSide: "left",
      lookLeft: true,
    }),
    createFrameTexture(app, baseColor, {
      legOffset: 0,
      bodyBob: -1,
      armSide: "left",
      lookLeft: true,
    }),
    createFrameTexture(app, baseColor, {
      legOffset: 0,
      bodyBob: 0,
      armSide: "left",
      lookLeft: true,
    }),
  ];

  const chooseFrames = [
    createFrameTexture(app, baseColor, {
      legOffset: 0,
      bodyBob: 0,
      armSide: "right",
      lookLeft: false,
    }),
    createFrameTexture(app, baseColor, {
      legOffset: 1,
      bodyBob: -1,
      armSide: "right",
      lookLeft: false,
    }),
  ];

  return {
    idle: idleFrames,
    walk: walkFrames,
    think: thinkFrames,
    choose: chooseFrames,
  };
}

async function createFromSheet(metadata) {
  if (!metadata?.spriteUrl) {
    return null;
  }

  const loaded = await Assets.load(metadata.spriteUrl);
  const sourceTexture = loaded?.texture ? loaded.texture : loaded;
  const baseTexture = sourceTexture?.baseTexture || sourceTexture;
  if (!baseTexture) {
    return null;
  }

  const frameWidth = metadata.frameWidth || 24;
  const frameHeight = metadata.frameHeight || 32;
  const columns = Math.max(1, Math.floor(baseTexture.width / frameWidth));
  const rows = Math.max(1, Math.floor(baseTexture.height / frameHeight));
  const maxFrames = columns * rows;

  const toTextures = (indices) =>
    indices
      .map((index) => (index >= 0 && index < maxFrames ? index : null))
      .filter((index) => index !== null)
      .map((index) => {
        const x = (index % columns) * frameWidth;
        const y = Math.floor(index / columns) * frameHeight;
        return new Texture({
          source: baseTexture,
          frame: new Rectangle(x, y, frameWidth, frameHeight),
        });
      });

  return {
    idle: toTextures(metadata.animations?.idle || [0]),
    walk: toTextures(metadata.animations?.walk || [0, 1, 2, 3]),
    think: toTextures(metadata.animations?.think || [4, 5, 6, 7]),
    choose: toTextures(metadata.animations?.choose || [8, 9, 10, 11]),
  };
}

export async function buildSpriteAnimations(app, metadata, fallbackColor) {
  const fromSheet = await createFromSheet(metadata).catch(() => null);
  if (
    fromSheet &&
    fromSheet.idle.length > 0 &&
    fromSheet.walk.length > 0 &&
    fromSheet.think.length > 0
  ) {
    return fromSheet;
  }
  return createProceduralAnimations(
    app,
    metadata?.style?.baseColor || fallbackColor || "#4b5563",
  );
}
