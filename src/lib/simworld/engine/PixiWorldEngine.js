import {
  AnimatedSprite,
  Application,
  Container,
  Graphics,
  Text,
} from "pixi.js";

import { buildSpriteAnimations } from "./spriteFactory";

function makeBlock(width, height, fill, alpha = 1) {
  const shape = new Graphics();
  shape.rect(0, 0, width, height).fill({ color: fill, alpha });
  return shape;
}

function makeStationDot(station, colors) {
  const marker = new Container();

  const base = new Graphics();
  base.circle(0, 0, 26).fill(colors.stationBase).stroke({
    color: colors.stationBorder,
    width: 2,
  });
  marker.addChild(base);

  const dot = new Graphics();
  dot.circle(0, 0, 10).fill(colors.stationDot);
  marker.addChild(dot);

  const label = new Text({
    text: station.id,
    style: {
      fill: colors.stationLabel,
      fontSize: 16,
      fontWeight: "700",
      fontFamily: "monospace",
    },
  });
  label.anchor.set(0.5);
  marker.addChild(label);

  return marker;
}

function getMovementDirection(previousX, nextX) {
  if (nextX < previousX) {
    return "left";
  }
  if (nextX > previousX) {
    return "right";
  }
  return null;
}

const STATION_COLORS = {
  stationBase: "#ffffff",
  stationBorder: "#334155",
  stationDot: "#0ea5e9",
  stationLabel: "#0f172a",
};

export class PixiWorldEngine {
  constructor(config) {
    this.config = config;
    this.ready = false;
    this.app = null;
    this.containerElement = null;
    this.layers = {
      map: null,
      roads: null,
      props: null,
      characters: null,
      ui: null,
    };
    this.characters = new Map();
    this.bubbles = new Map();
    this.stations = new Map();
    this.tick = this.tick.bind(this);
  }

  async init(containerElement) {
    if (!containerElement) {
      throw new Error(
        "A container element is required to initialize PixiWorldEngine.",
      );
    }
    this.containerElement = containerElement;

    if (this.app) {
      this.destroy();
    }

    this.app = new Application();
    await this.app.init({
      width: this.config.width,
      height: this.config.height,
      background: this.config.background,
      antialias: false,
      resolution:
        typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1,
      autoDensity: true,
    });

    this.containerElement.innerHTML = "";
    this.containerElement.appendChild(this.app.canvas);

    this.layers.map = new Container();
    this.layers.roads = new Container();
    this.layers.props = new Container();
    this.layers.characters = new Container();
    this.layers.ui = new Container();
    this.layers.characters.sortableChildren = true;
    this.layers.ui.sortableChildren = true;

    this.app.stage.addChild(
      this.layers.map,
      this.layers.roads,
      this.layers.props,
      this.layers.characters,
      this.layers.ui,
    );

    this._drawDistrict();
    this.app.ticker.add(this.tick);
    this.ready = true;
  }

  _drawDistrict() {
    const { width, height } = this.config;
    const colors = {
      grass: "#dff4df",
      lane: "#d0d8de",
      laneEdge: "#a8b2bb",
      plaza: "#f7f3e8",
      building: "#c7d0dd",
      roof: "#93a0af",
    };

    const park = makeBlock(width, height, colors.grass);
    this.layers.map.addChild(park);

    const mainRoad = makeBlock(width, 92, colors.lane);
    mainRoad.x = 0;
    mainRoad.y = 290;
    this.layers.roads.addChild(mainRoad);

    const mainRoadEdgeTop = makeBlock(width, 3, colors.laneEdge, 0.8);
    mainRoadEdgeTop.y = 290;
    this.layers.roads.addChild(mainRoadEdgeTop);

    const mainRoadEdgeBottom = makeBlock(width, 3, colors.laneEdge, 0.8);
    mainRoadEdgeBottom.y = 379;
    this.layers.roads.addChild(mainRoadEdgeBottom);

    const westRoad = makeBlock(120, height, colors.lane);
    westRoad.x = 560;
    this.layers.roads.addChild(westRoad);

    const choicePlaza = makeBlock(370, 285, colors.plaza);
    choicePlaza.x = 690;
    choicePlaza.y = 170;
    this.layers.props.addChild(choicePlaza);

    const buildingWest = makeBlock(360, 160, colors.building);
    buildingWest.x = 120;
    buildingWest.y = 90;
    const roofWest = makeBlock(360, 24, colors.roof);
    roofWest.x = 120;
    roofWest.y = 90;

    const buildingSouth = makeBlock(360, 140, colors.building);
    buildingSouth.x = 120;
    buildingSouth.y = 560;
    const roofSouth = makeBlock(360, 24, colors.roof);
    roofSouth.x = 120;
    roofSouth.y = 560;

    this.layers.props.addChild(
      buildingWest,
      roofWest,
      buildingSouth,
      roofSouth,
    );
  }

  // --- Dynamic station (option) management ---

  addStation(station) {
    if (!this.ready || !station?.id) {
      return;
    }

    // Remove existing station with same id first
    this.removeStation(station.id);

    const markerContainer = new Container();

    const marker = makeStationDot(station, STATION_COLORS);
    marker.x = station.x;
    marker.y = station.y;
    marker.zIndex = station.y;
    markerContainer.addChild(marker);

    const text = new Text({
      text: station.label || station.id,
      style: {
        fill: "#0f172a",
        fontSize: 12,
        fontWeight: "600",
        fontFamily: "monospace",
      },
    });
    text.anchor.set(0.5, 0);
    text.x = station.x;
    text.y = station.y + 32;
    markerContainer.addChild(text);

    this.layers.props.addChild(markerContainer);
    this.stations.set(station.id, {
      container: markerContainer,
      station,
    });
  }

  removeStation(stationId) {
    const entry = this.stations.get(stationId);
    if (!entry) {
      return;
    }
    entry.container.destroy({ children: true });
    this.stations.delete(stationId);
  }

  // --- Character management ---

  async addCharacter(character, spriteMetadata) {
    if (!this.ready) {
      throw new Error("Engine not ready.");
    }

    const animations = await buildSpriteAnimations(
      this.app,
      spriteMetadata,
      character.color || "#64748b",
    );

    const sprite = new AnimatedSprite(animations.idle);
    sprite.anchor.set(0.5, 1);
    sprite.animationSpeed = 0.12;
    sprite.play();
    sprite.x = character.position.x;
    sprite.y = character.position.y;
    sprite.zIndex = sprite.y;

    const label = new Text({
      text: character.name || character.persona,
      style: {
        fill: "#0f172a",
        fontFamily: "monospace",
        fontSize: 11,
        fontWeight: "700",
      },
    });
    label.anchor.set(0.5, 1);
    label.x = sprite.x;
    label.y = sprite.y - 36;
    label.zIndex = sprite.zIndex + 1;

    this.layers.characters.addChild(sprite);
    this.layers.ui.addChild(label);

    this.characters.set(character.id, {
      sprite,
      label,
      animations,
      state: "idle",
      facing: "right",
    });
  }

  removeCharacter(characterId) {
    const entry = this.characters.get(characterId);
    if (!entry) {
      return;
    }

    this.clearSpeechBubble(characterId);
    entry.sprite.destroy();
    entry.label.destroy();
    this.characters.delete(characterId);
  }

  setCharacterState(characterId, state) {
    const entry = this.characters.get(characterId);
    if (!entry || entry.state === state) {
      return;
    }

    entry.state = state;
    const textures =
      state === "thinking"
        ? entry.animations.think
        : state === "choosing"
          ? entry.animations.choose
          : state.includes("walking")
            ? entry.animations.walk
            : entry.animations.idle;

    if (textures.length > 0) {
      entry.sprite.textures = textures;
      entry.sprite.animationSpeed = state.includes("walking") ? 0.2 : 0.12;
      entry.sprite.play();
    }
  }

  setCharacterPosition(characterId, position) {
    const entry = this.characters.get(characterId);
    if (!entry) {
      return;
    }

    const direction = getMovementDirection(entry.sprite.x, position.x);
    if (direction) {
      entry.facing = direction;
      entry.sprite.scale.x = direction === "left" ? -1 : 1;
    }

    entry.sprite.x = position.x;
    entry.sprite.y = position.y;
    entry.sprite.zIndex = position.y;

    entry.label.x = position.x;
    entry.label.y = position.y - 36;
    entry.label.zIndex = position.y + 1;
  }

  showSpeechBubble(characterId, message, durationMs = 1800) {
    const entry = this.characters.get(characterId);
    if (!entry) {
      return;
    }

    this.clearSpeechBubble(characterId);

    const bubble = new Container();
    const text = new Text({
      text: message || "",
      style: {
        fill: "#0f172a",
        fontFamily: "monospace",
        fontSize: 12,
        lineHeight: 16,
        wordWrap: true,
        wordWrapWidth: 220,
      },
    });
    text.anchor.set(0.5, 1);

    const paddingX = 10;
    const paddingY = 8;
    const bubbleWidth = Math.max(80, text.width + paddingX * 2);
    const bubbleHeight = Math.max(34, text.height + paddingY * 2);

    const bg = new Graphics();
    bg.roundRect(-bubbleWidth / 2, -bubbleHeight, bubbleWidth, bubbleHeight, 8)
      .fill(0xffffff)
      .stroke({ color: 0x334155, width: 1 });

    const tail = new Graphics();
    tail
      .poly([
        { x: -6, y: 0 },
        { x: 0, y: 8 },
        { x: 6, y: 0 },
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
      fadeMs: 220,
    });
  }

  clearSpeechBubble(characterId) {
    const bubbleEntry = this.bubbles.get(characterId);
    if (!bubbleEntry) {
      return;
    }

    bubbleEntry.container.destroy({ children: true });
    this.bubbles.delete(characterId);
  }

  tick() {
    for (const [characterId, entry] of this.characters.entries()) {
      entry.sprite.zIndex = entry.sprite.y;
      entry.label.zIndex = entry.sprite.y + 1;

      const bubble = this.bubbles.get(characterId);
      if (!bubble) {
        continue;
      }

      bubble.container.x = entry.sprite.x;
      bubble.container.y = entry.sprite.y - 44;
      bubble.container.zIndex = entry.sprite.y + 10;

      const now = performance.now();
      const fadeInEnd = bubble.startAt + bubble.fadeMs;
      const fadeOutStart = bubble.endAt - bubble.fadeMs;

      if (now <= fadeInEnd) {
        bubble.container.alpha = Math.min(
          1,
          (now - bubble.startAt) / bubble.fadeMs,
        );
      } else if (now >= fadeOutStart) {
        bubble.container.alpha = Math.max(
          0,
          (bubble.endAt - now) / bubble.fadeMs,
        );
      } else {
        bubble.container.alpha = 1;
      }

      if (now >= bubble.endAt) {
        this.clearSpeechBubble(characterId);
      }
    }
  }

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
      map: null,
      roads: null,
      props: null,
      characters: null,
      ui: null,
    };
  }
}
