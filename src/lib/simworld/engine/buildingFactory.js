import { Container, Graphics, Text } from "pixi.js";

/**
 * Creates a building sprite from the Serene Village tileset.
 * Uses the houses image (RPG Maker MV) for one consistent building.
 *
 * @param {string} shopType   — one of the HOUSE_VARIANTS keys (cafe, library, etc.)
 * @param {object} position   — { x, y } in pixel coordinates
 * @param {string} label     — display label for the shop sign
 * @param {Texture} tilesetTexture — unused
 * @param {Texture} [housesTexture] — unused
 * @returns {Container} PixiJS container with the building + sign
 */
export function createBuilding(
  shopType,
  position,
  label,
  tilesetTexture,
  housesTexture,
) {
  const container = new Container();
  container.overlayAnchor = { x: 0, y: -84 };

  // --- Custom full house (prevents broken crop/slicing) ---
  const house = new Container();

  // roof shadow
  const roofShadow = new Graphics();
  roofShadow
    .roundRect(-60, -100, 120, 22, 6)
    .fill({ color: 0x5e1b14, alpha: 0.5 });
  house.addChild(roofShadow);

  // roof
  const roof = new Graphics();
  roof.roundRect(-62, -108, 124, 28, 6).fill(0xd14d3f);
  roof.roundRect(-58, -103, 116, 7, 4).fill({ color: 0xeb7b67, alpha: 0.9 });
  for (let x = -50; x <= 50; x += 20) {
    roof.rect(x, -108, 3, 28).fill({ color: 0xb23e32, alpha: 0.85 });
  }
  house.addChild(roof);

  // walls
  const wall = new Graphics();
  wall.roundRect(-54, -80, 108, 70, 4).fill(0xe8d8bc);
  wall.roundRect(-54, -80, 108, 10, 4).fill(0xdcc6a6);
  wall.roundRect(-54, -20, 108, 10, 3).fill(0xcbb390);
  house.addChild(wall);

  // door
  const door = new Graphics();
  door.roundRect(-12, -62, 24, 44, 3).fill(0x96553a);
  door.roundRect(-10, -60, 20, 10, 2).fill(0xb46a47);
  door.circle(7, -40, 2).fill(0xf5d178);
  house.addChild(door);

  // windows
  const win = new Graphics();
  win.roundRect(-42, -62, 22, 18, 2).fill(0x93c9ea);
  win.roundRect(20, -62, 22, 18, 2).fill(0x93c9ea);
  win.rect(-31, -62, 2, 18).fill(0x6b9fbe);
  win.rect(31, -62, 2, 18).fill(0x6b9fbe);
  win.rect(-42, -54, 22, 2).fill(0x6b9fbe);
  win.rect(20, -54, 22, 2).fill(0x6b9fbe);
  house.addChild(win);

  // porch
  const porch = new Graphics();
  porch.roundRect(-28, -18, 56, 16, 3).fill(0xbaa17f);
  porch.roundRect(-36, -2, 72, 12, 3).fill(0xcab291);
  porch.roundRect(-40, 8, 80, 10, 3).fill(0xb79d7a);
  house.addChild(porch);

  // little shrubs
  const shrubs = new Graphics();
  shrubs.circle(-48, -4, 7).fill(0x4f9f56);
  shrubs.circle(-40, -5, 6).fill(0x60b668);
  shrubs.circle(48, -4, 7).fill(0x4f9f56);
  shrubs.circle(40, -5, 6).fill(0x60b668);
  house.addChild(shrubs);

  house.zIndex = 1;
  container.addChild(house);

  // --- Shop sign with label text ---
  const signBg = new Graphics();
  const signWidth = Math.max(60, label.length * 7 + 16);
  const signHeight = 20;
  signBg
    .roundRect(-signWidth / 2, 0, signWidth, signHeight, 4)
    .fill({ color: 0xfff8e7, alpha: 0.95 })
    .stroke({ color: 0x8b7355, width: 1.5 });
  signBg.y = 24;
  container.addChild(signBg);

  const signText = new Text({
    text: label,
    style: {
      fill: "#4a3728",
      fontSize: 10,
      fontWeight: "700",
      fontFamily: "monospace",
    },
  });
  signText.anchor.set(0.5, 0);
  signText.x = 0;
  signText.y = signBg.y + 3;
  container.addChild(signText);

  // Position the entire container at the tile position
  container.x = position.x;
  container.y = position.y;
  container.zIndex = position.y + 24;

  return container;
}
