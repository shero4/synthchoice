import {
  AnimatedSprite,
  Application,
  Container,
  Graphics,
  Text,
} from "pixi.js";

import { loadAllAssets } from "./assetLoader";
import { createBuilding } from "./buildingFactory";
import { buildSpriteAnimations, createProceduralAnimations } from "./spriteFactory";
import { TileMapRenderer } from "./tileMap";

// ---------------------------------------------------------------------------
// Direction helpers
// ---------------------------------------------------------------------------

/**
 * Given a movement vector, return the dominant direction.
 * Returns "down" | "up" | "left" | "right"
 */
function getDirection(dx, dy) {
  if (Math.abs(dx) > Math.abs(dy)) {
    return dx > 0 ? "right" : "left";
  }
  return dy > 0 ? "down" : "up";
}

// ---------------------------------------------------------------------------
// PixiWorldEngine — v2 with tile-based rendering
// ---------------------------------------------------------------------------
export class PixiWorldEngine {
  constructor(config) {
    this.config = config;
    this.ready = false;
    this.app = null;
    this.containerElement = null;
    this.assets = null;

    this.layers = {
      ground: null,
      paths: null,
      decorations: null,
      buildings: null,
      characters: null,
      ui: null,
    };

    this.characters = new Map();
    this.bubbles = new Map();
    this.stations = new Map();

    this.tick = this.tick.bind(this);
  }

  // -----------------------------------------------------------------------
  // Lifecycle
  // -----------------------------------------------------------------------

  async init(containerElement) {
    if (!containerElement) {
      throw new Error("A container element is required to initialize PixiWorldEngine.");
    }
    this.containerElement = containerElement;

    if (this.app) {
      this.destroy();
    }

    // Start with empty assets so world can render immediately.
    this.assets = {};

    // Create PixiJS application
    this.app = new Application();
    await this.app.init({
      width: this.config.width,
      height: this.config.height,
      background: this.config.background,
      antialias: false,
      resolution: typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1,
      autoDensity: true,
    });

    this.containerElement.innerHTML = "";
    this.app.canvas.style.width = "100%";
    this.app.canvas.style.height = "100%";
    this.app.canvas.style.display = "block";
    this.app.canvas.style.imageRendering = "pixelated";
    this.containerElement.appendChild(this.app.canvas);

    // Create render layers (bottom → top)
    this.layers.ground = new Container();
    this.layers.paths = new Container();
    this.layers.decorations = new Container();
    this.layers.buildings = new Container();
    this.layers.characters = new Container();
    this.layers.ui = new Container();

    this.layers.decorations.sortableChildren = true;
    this.layers.buildings.sortableChildren = true;
    this.layers.characters.sortableChildren = true;
    this.layers.ui.sortableChildren = true;

    this.app.stage.addChild(
      this.layers.ground,
      this.layers.paths,
      this.layers.decorations,
      this.layers.buildings,
      this.layers.characters,
      this.layers.ui,
    );

    // Render world immediately (no asset dependency).
    this._renderWorld();

    // Load assets in the background for buildings/sprites.
    loadAllAssets()
      .then((assets) => {
        this.assets = assets || {};
      })
      .catch((error) => {
        console.warn("Asset loading failed; continuing with procedural fallback.", error);
      });

    // Start tick loop
    this.app.ticker.add(this.tick);
    this.ready = true;
  }

  _renderWorld() {
    const tileMap = new TileMapRenderer();
    const { ground, decorations } = tileMap.render();

    this.layers.ground.addChild(ground);
    this.layers.decorations.addChild(decorations);

    // Draw a fountain/spawn marker at center
    this._drawFountain();
  }

  _drawFountain() {
    const { width, height } = this.config;
    const cx = width / 2;
    const cy = height / 2;

    const fountain = new Container();

    // Stone base plate
    const plate = new Graphics();
    plate.ellipse(0, 8, 42, 18).fill({ color: 0x8c9aa2, alpha: 0.35 });
    fountain.addChild(plate);

    // Outer basin ring
    const basinOuter = new Graphics();
    basinOuter.circle(0, 0, 30).fill({ color: 0xaab4ba, alpha: 0.95 });
    basinOuter.circle(0, 0, 30).stroke({ color: 0x6d7a82, width: 3, alpha: 0.9 });
    fountain.addChild(basinOuter);

    // Inner stone lip
    const basinLip = new Graphics();
    basinLip.circle(0, 0, 24).fill({ color: 0xc1c9ce, alpha: 0.95 });
    basinLip.circle(0, 0, 24).stroke({ color: 0x8b979e, width: 2, alpha: 0.85 });
    fountain.addChild(basinLip);

    // Water bowl
    const water = new Graphics();
    water.circle(0, 0, 19).fill({ color: 0x5eaedf, alpha: 0.9 });
    water.circle(0, 0, 15).fill({ color: 0x8fd3f3, alpha: 0.55 });
    fountain.addChild(water);

    // Ripple rings
    const ripple = new Graphics();
    ripple.ellipse(-4, 2, 8, 3.5).stroke({ color: 0xe8fbff, width: 1.5, alpha: 0.7 });
    ripple.ellipse(6, -3, 6, 2.7).stroke({ color: 0xe8fbff, width: 1.5, alpha: 0.6 });
    fountain.addChild(ripple);

    // Center statue / spout
    const statue = new Graphics();
    statue.roundRect(-4, -16, 8, 13, 2).fill({ color: 0x97a4ac, alpha: 0.95 });
    statue.circle(0, -18, 4.5).fill({ color: 0xa8b4bb, alpha: 0.95 });
    statue.circle(0, -25, 2.2).fill({ color: 0xc6e8ff, alpha: 0.85 });
    statue.circle(0, -20, 1.4).fill({ color: 0xe6f7ff, alpha: 0.9 });
    fountain.addChild(statue);

    fountain.x = cx;
    fountain.y = cy;
    fountain.zIndex = cy;

    this.layers.decorations.addChild(fountain);
  }

  // -----------------------------------------------------------------------
  // Station / building management
  // -----------------------------------------------------------------------

  addStation(station) {
    if (!this.ready || !station?.id) return;

    this.removeStation(station.id);

    const tilesetTexture = this.assets?.tileset;

    if (station.shopType && tilesetTexture) {
      // Create a proper building from the tileset
      const building = createBuilding(
        station.shopType,
        { x: station.x, y: station.y },
        station.label || station.id,
        tilesetTexture,
        this.assets.tilesetHouses,
      );
      this.layers.buildings.addChild(building);
      this.stations.set(station.id, { container: building, station });
    } else {
      // Fallback: simple marker (same as v1 but styled)
      const marker = this._createFallbackMarker(station);
      this.layers.buildings.addChild(marker);
      this.stations.set(station.id, { container: marker, station });
    }
  }

  _createFallbackMarker(station) {
    const container = new Container();

    const bg = new Graphics();
    bg.roundRect(-30, -25, 60, 50, 6)
      .fill({ color: 0xffffff, alpha: 0.9 })
      .stroke({ color: 0x334155, width: 2 });
    container.addChild(bg);

    const dot = new Graphics();
    dot.circle(0, -5, 8).fill(0x0ea5e9);
    container.addChild(dot);

    const label = new Text({
      text: station.label || station.id,
      style: {
        fill: "#0f172a",
        fontSize: 10,
        fontWeight: "700",
        fontFamily: "monospace",
      },
    });
    label.anchor.set(0.5, 0);
    label.y = 8;
    container.addChild(label);

    container.x = station.x;
    container.y = station.y;
    container.zIndex = station.y;
    return container;
  }

  removeStation(stationId) {
    const entry = this.stations.get(stationId);
    if (!entry) return;
    entry.container.destroy({ children: true });
    this.stations.delete(stationId);
  }

  // -----------------------------------------------------------------------
  // Character management
  // -----------------------------------------------------------------------

  async addCharacter(character) {
    if (!this.ready) {
      throw new Error("Engine not ready.");
    }

    const animations = buildSpriteAnimations(this.assets, this.app);

    // Determine which textures to use initially (idle facing down)
    const initialTextures =
      animations.idleDown?.length > 0
        ? animations.idleDown
        : animations.walkDown?.length > 0
          ? animations.walkDown
          : null;

    if (!initialTextures || initialTextures.length === 0) {
      // Try procedural fallback (clothed)
      const fallback = createProceduralAnimations(this.app, true, character.color || 0x4488cc);
      if (fallback.idleDown.length > 0) {
        Object.assign(animations, fallback);
      } else {
        console.warn("No sprite textures available for character", character.id);
        return;
      }
    }

    const sprite = new AnimatedSprite(
      animations.idleDown.length > 0 ? animations.idleDown : animations.walkDown,
    );
    sprite.anchor.set(0.5, 1);
    sprite.animationSpeed = 0.12;
    sprite.play();
    sprite.x = character.position.x;
    sprite.y = character.position.y;
    sprite.zIndex = sprite.y;

    // Name label
    const label = new Text({
      text: character.name || character.persona,
      style: {
        fill: "#0f172a",
        fontFamily: "monospace",
        fontSize: 10,
        fontWeight: "700",
      },
    });
    label.anchor.set(0.5, 1);
    label.x = sprite.x;
    label.y = sprite.y - sprite.height - 4;
    label.zIndex = sprite.zIndex + 1;

    this.layers.characters.addChild(sprite);
    this.layers.ui.addChild(label);

    this.characters.set(character.id, {
      sprite,
      label,
      animations,
      state: "idle",
      facing: "down",
    });
  }

  removeCharacter(characterId) {
    const entry = this.characters.get(characterId);
    if (!entry) return;

    this.clearSpeechBubble(characterId);
    entry.sprite.destroy();
    entry.label.destroy();
    this.characters.delete(characterId);
  }

  /**
   * Set character animation state and direction.
   * @param {string} characterId
   * @param {string} state — "idle" | "walking_to_station" | "walking_to_choice" | etc.
   * @param {string} [direction] — "down" | "up" | "left" | "right"
   */
  setCharacterState(characterId, state, direction) {
    const entry = this.characters.get(characterId);
    if (!entry) return;

    const dir = direction || entry.facing;
    const isWalking = state.includes("walking") || state.includes("returning");
    const prevState = entry.state;
    const prevFacing = entry.facing;

    entry.state = state;
    entry.facing = dir;

    // Determine textures based on state + direction
    let textures;
    if (isWalking) {
      if (dir === "up") textures = entry.animations.walkUp;
      else if (dir === "left" || dir === "right") textures = entry.animations.walkSide;
      else textures = entry.animations.walkDown;
    } else {
      if (dir === "up") textures = entry.animations.idleUp;
      else if (dir === "left" || dir === "right") textures = entry.animations.idleSide;
      else textures = entry.animations.idleDown;
    }

    // Handle left/right mirroring (side sheet is right-facing)
    entry.sprite.scale.x = dir === "left" ? -1 : 1;

    if (textures && textures.length > 0) {
      const stateKey = `${state}-${dir}`;
      const prevKey = `${prevState}-${prevFacing}`;
      if (stateKey !== prevKey) {
        entry.sprite.textures = textures;
        entry.sprite.animationSpeed = isWalking ? 0.18 : 0.1;
        entry.sprite.play();
      }
    }
  }

  /**
   * Update character position and auto-detect direction.
   */
  setCharacterPosition(characterId, position, prevPosition) {
    const entry = this.characters.get(characterId);
    if (!entry) return;

    // Auto-detect direction from movement delta
    if (prevPosition) {
      const dx = position.x - prevPosition.x;
      const dy = position.y - prevPosition.y;
      if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
        const dir = getDirection(dx, dy);
        if (dir !== entry.facing) {
          entry.facing = dir;
          // Update mirroring
          entry.sprite.scale.x = dir === "left" ? -1 : 1;
          // Update animation textures for new direction
          this.setCharacterState(characterId, entry.state, dir);
        }
      }
    }

    entry.sprite.x = position.x;
    entry.sprite.y = position.y;
    entry.sprite.zIndex = position.y;

    entry.label.x = position.x;
    entry.label.y = position.y - entry.sprite.height - 4;
    entry.label.zIndex = position.y + 1;
  }

  // -----------------------------------------------------------------------
  // Speech bubbles
  // -----------------------------------------------------------------------

  showSpeechBubble(characterId, message, durationMs = 1800) {
    const entry = this.characters.get(characterId);
    if (!entry) return;

    this.clearSpeechBubble(characterId);

    const bubble = new Container();
    const text = new Text({
      text: message || "",
      style: {
        fill: "#0f172a",
        fontFamily: "monospace",
        fontSize: 11,
        lineHeight: 14,
        wordWrap: true,
        wordWrapWidth: 200,
      },
    });
    text.anchor.set(0.5, 1);

    const paddingX = 10;
    const paddingY = 8;
    const bubbleWidth = Math.max(70, text.width + paddingX * 2);
    const bubbleHeight = Math.max(30, text.height + paddingY * 2);

    const bg = new Graphics();
    bg.roundRect(-bubbleWidth / 2, -bubbleHeight, bubbleWidth, bubbleHeight, 8)
      .fill(0xffffff)
      .stroke({ color: 0x334155, width: 1 });

    const tail = new Graphics();
    tail
      .poly([
        { x: -5, y: 0 },
        { x: 0, y: 7 },
        { x: 5, y: 0 },
      ])
      .fill(0xffffff)
      .stroke({ color: 0x334155, width: 1 });

    text.x = 0;
    text.y = -paddingY;

    bubble.addChild(bg, tail, text);
    bubble.alpha = 0;
    bubble.zIndex = entry.sprite.zIndex + 10;
    this.layers.ui.addChild(bubble);

    this.bubbles.set(characterId, {
      container: bubble,
      startAt: performance.now(),
      endAt: performance.now() + durationMs,
      fadeMs: 200,
    });
  }

  clearSpeechBubble(characterId) {
    const bubbleEntry = this.bubbles.get(characterId);
    if (!bubbleEntry) return;

    bubbleEntry.container.destroy({ children: true });
    this.bubbles.delete(characterId);
  }

  // -----------------------------------------------------------------------
  // Tick loop
  // -----------------------------------------------------------------------

  tick() {
    for (const [characterId, entry] of this.characters.entries()) {
      entry.sprite.zIndex = entry.sprite.y;
      entry.label.zIndex = entry.sprite.y + 1;

      const bubble = this.bubbles.get(characterId);
      if (!bubble) continue;

      bubble.container.x = entry.sprite.x;
      bubble.container.y = entry.sprite.y - entry.sprite.height - 12;
      bubble.container.zIndex = entry.sprite.y + 10;

      const now = performance.now();
      const fadeInEnd = bubble.startAt + bubble.fadeMs;
      const fadeOutStart = bubble.endAt - bubble.fadeMs;

      if (now <= fadeInEnd) {
        bubble.container.alpha = Math.min(1, (now - bubble.startAt) / bubble.fadeMs);
      } else if (now >= fadeOutStart) {
        bubble.container.alpha = Math.max(0, (bubble.endAt - now) / bubble.fadeMs);
      } else {
        bubble.container.alpha = 1;
      }

      if (now >= bubble.endAt) {
        this.clearSpeechBubble(characterId);
      }
    }
  }

  // -----------------------------------------------------------------------
  // Cleanup
  // -----------------------------------------------------------------------

  destroy() {
    if (this.app) {
      this.app.ticker.remove(this.tick);
    }

    for (const characterId of this.characters.keys()) {
      this.removeCharacter(characterId);
    }
    for (const stationId of this.stations.keys()) {
      this.removeStation(stationId);
    }

    if (this.app) {
      this.app.destroy(true, {
        children: true,
        texture: true,
        textureSource: true,
      });
      this.app = null;
    }

    if (this.containerElement) {
      this.containerElement.innerHTML = "";
    }

    this.ready = false;
    this.characters.clear();
    this.bubbles.clear();
    this.stations.clear();
    this.layers = {
      ground: null,
      paths: null,
      decorations: null,
      buildings: null,
      characters: null,
      ui: null,
    };
  }
}
