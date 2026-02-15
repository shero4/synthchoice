import { Container, Graphics } from "pixi.js";
import { DISPLAY_TILE, MAP_COLS, MAP_ROWS, SPAWN_TILE } from "../config";

const WORLD_W = MAP_COLS * DISPLAY_TILE;
const WORLD_H = MAP_ROWS * DISPLAY_TILE;

function drawTree(x, y, variant = 0) {
  const tree = new Container();

  const palettes = [
    { dark: 0x2f7a3a, mid: 0x459c4e, light: 0x65bd6f },
    { dark: 0x2c724d, mid: 0x3f9562, light: 0x62b985 },
    { dark: 0x2f6f34, mid: 0x4f9f57, light: 0x79c781 },
  ];
  const colors = palettes[variant % palettes.length];

  const shadow = new Graphics();
  shadow.ellipse(0, 5, 22, 7).fill({ color: 0x000000, alpha: 0.18 });
  tree.addChild(shadow);

  const trunk = new Graphics();
  trunk.roundRect(-6, -8, 12, 18, 3).fill(0x7a5031);
  trunk.roundRect(-3, -13, 6, 5, 2).fill(0x5f3d25);
  tree.addChild(trunk);

  const canopy = new Graphics();
  canopy.circle(0, -28, 16).fill(colors.dark);
  canopy.circle(-13, -20, 13).fill(colors.mid);
  canopy.circle(13, -20, 13).fill(colors.mid);
  canopy.circle(0, -14, 15).fill(colors.light);
  canopy.circle(-6, -30, 4).fill({ color: 0xffffff, alpha: 0.16 });
  canopy.circle(7, -25, 3).fill({ color: 0xffffff, alpha: 0.12 });
  tree.addChild(canopy);

  tree.x = x;
  tree.y = y;
  tree.zIndex = y;
  return tree;
}

function drawRock(x, y, scale = 1) {
  const rock = new Graphics();
  rock.ellipse(x, y, 15 * scale, 11 * scale).fill(0x727f86);
  rock.ellipse(x - 4 * scale, y - 1 * scale, 10 * scale, 7 * scale).fill(0x98a6ad);
  rock.ellipse(x + 5 * scale, y + 2 * scale, 8 * scale, 6 * scale).fill(0x5e6a70);
  rock.ellipse(x - 2 * scale, y - 4 * scale, 2.5 * scale, 2 * scale).fill({
    color: 0xffffff,
    alpha: 0.2,
  });
  rock.ellipse(x + 3 * scale, y - 2 * scale, 1.8 * scale, 1.2 * scale).fill({
    color: 0xffffff,
    alpha: 0.16,
  });
  rock.zIndex = y;
  return rock;
}

function drawFlowerPatch(x, y) {
  const patch = new Graphics();
  patch.circle(x - 7, y - 2, 2).fill(0xff9fc4);
  patch.circle(x - 2, y + 1, 2).fill(0xffffff);
  patch.circle(x + 4, y - 1, 2).fill(0x93d5ff);
  patch.circle(x + 8, y + 2, 2).fill(0xfff18f);
  patch.zIndex = y;
  return patch;
}

function drawPond(x, y, w, h) {
  const pond = new Container();

  const shore = new Graphics();
  shore.roundRect(x, y, w, h, 26).fill(0xd4c79b);
  pond.addChild(shore);

  const water = new Graphics();
  water.roundRect(x + 10, y + 10, w - 20, h - 20, 22).fill(0x4aa8de);
  water.roundRect(x + 14, y + 14, w - 28, h - 28, 18).fill({ color: 0x6bc3f0, alpha: 0.6 });
  pond.addChild(water);

  const ripple = new Graphics();
  ripple.ellipse(x + w * 0.35, y + h * 0.48, 22, 9).stroke({
    color: 0xd9f4ff,
    width: 2,
    alpha: 0.8,
  });
  ripple.ellipse(x + w * 0.62, y + h * 0.36, 18, 7).stroke({
    color: 0xd9f4ff,
    width: 2,
    alpha: 0.65,
  });
  ripple.circle(x + w * 0.78, y + h * 0.62, 6).fill({ color: 0x7dd47a, alpha: 0.9 });
  pond.addChild(ripple);

  pond.zIndex = y + h;
  return pond;
}

export class TileMapRenderer {
  constructor() {
    this.groundContainer = new Container();
    this.decorationContainer = new Container();
    this.decorationContainer.sortableChildren = true;
  }

  render() {
    this._renderGround();
    this._renderDecorations();
    return {
      ground: this.groundContainer,
      decorations: this.decorationContainer,
    };
  }

  _renderGround() {
    const cx = SPAWN_TILE.col * DISPLAY_TILE + DISPLAY_TILE / 2;
    const cy = SPAWN_TILE.row * DISPLAY_TILE + DISPLAY_TILE / 2;

    const grass = new Graphics();
    grass.rect(0, 0, WORLD_W, WORLD_H).fill(0x5aa65b);
    this.groundContainer.addChild(grass);

    const grassTexture = new Graphics();
    for (let y = 16; y < WORLD_H; y += 38) {
      grassTexture.rect(0, y, WORLD_W, 2).fill({ color: 0x6db86e, alpha: 0.24 });
    }
    for (let x = 24; x < WORLD_W; x += 72) {
      grassTexture.rect(x, 0, 1, WORLD_H).fill({ color: 0x4f9651, alpha: 0.1 });
    }
    this.groundContainer.addChild(grassTexture);

    // Main Pokemon-style road cross
    const road = new Graphics();
    road.rect(0, cy - 32, WORLD_W, 64).fill(0xd7c18f);
    road.rect(cx - 32, 0, 64, WORLD_H).fill(0xd7c18f);
    road.roundRect(cx - 88, cy - 88, 176, 176, 14).fill(0xe3d2a8);
    this.groundContainer.addChild(road);

    // Path edging + subtle stone seams
    const edges = new Graphics();
    edges.rect(0, cy - 32, WORLD_W, 2).fill({ color: 0xb79f6d, alpha: 0.8 });
    edges.rect(0, cy + 30, WORLD_W, 2).fill({ color: 0xb79f6d, alpha: 0.8 });
    edges.rect(cx - 32, 0, 2, WORLD_H).fill({ color: 0xb79f6d, alpha: 0.8 });
    edges.rect(cx + 30, 0, 2, WORLD_H).fill({ color: 0xb79f6d, alpha: 0.8 });
    this.groundContainer.addChild(edges);

    const seams = new Graphics();
    for (let x = 20; x < WORLD_W; x += 58) {
      seams.rect(x, cy - 32, 2, 64).fill({ color: 0xc9b17f, alpha: 0.55 });
    }
    for (let y = 20; y < WORLD_H; y += 58) {
      seams.rect(cx - 32, y, 64, 2).fill({ color: 0xc9b17f, alpha: 0.55 });
    }
    // Plaza tile seams
    for (let x = cx - 72; x <= cx + 72; x += 24) {
      seams.rect(x, cy - 72, 1, 144).fill({ color: 0xcbb78f, alpha: 0.55 });
    }
    for (let y = cy - 72; y <= cy + 72; y += 24) {
      seams.rect(cx - 72, y, 144, 1).fill({ color: 0xcbb78f, alpha: 0.55 });
    }
    this.groundContainer.addChild(seams);
  }

  _renderDecorations() {
    // Pond (upper-left quadrant)
    this.decorationContainer.addChild(drawPond(120, 170, 230, 140));

    // Trees around map edges (custom, consistent look)
    const trees = [
      drawTree(110, 140, 0),
      drawTree(190, 190, 1),
      drawTree(1020, 140, 2),
      drawTree(940, 190, 1),
      drawTree(1110, 250, 0),
      drawTree(120, 690, 1),
      drawTree(190, 640, 2),
      drawTree(1020, 700, 0),
      drawTree(940, 640, 1),
      drawTree(1110, 580, 2),
    ];
    for (const tree of trees) this.decorationContainer.addChild(tree);

    // Rock clusters near pond and lower corners
    const rocks = [
      drawRock(362, 145, 1.2),
      drawRock(392, 188, 1.05),
      drawRock(346, 236, 1.15),
      drawRock(980, 120, 1.25),
      drawRock(1060, 650, 1.3),
      drawRock(190, 610, 1.1),
      drawRock(900, 260, 1),
      drawRock(250, 560, 1),
    ];
    for (const rock of rocks) this.decorationContainer.addChild(rock);

    // Flower patches for color detail
    const flowers = [
      drawFlowerPatch(410, 390),
      drawFlowerPatch(870, 390),
      drawFlowerPatch(410, 510),
      drawFlowerPatch(870, 510),
      drawFlowerPatch(330, 330),
      drawFlowerPatch(950, 330),
    ];
    for (const patch of flowers) this.decorationContainer.addChild(patch);
  }
}
