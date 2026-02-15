import { Container, Graphics, Rectangle, Sprite, Text, Texture } from "pixi.js";
import { HOUSE_VARIANTS, SCALE } from "../config";

// Single canonical house from RPG_MAKER_MV Houses (768×768, 48px tiles)
// One complete red-roof house — region in pixels
const SINGLE_HOUSE = { x: 0, y: 96, w: 144, h: 144 };

/**
 * Creates a building sprite from the Serene Village tileset.
 * Uses the houses image (RPG Maker MV) for one consistent building.
 *
 * @param {string} shopType   — one of the HOUSE_VARIANTS keys (cafe, library, etc.)
 * @param {object} position   — { x, y } in pixel coordinates
 * @param {string} label     — display label for the shop sign
 * @param {Texture} tilesetTexture — main 16x16 tileset (fallback)
 * @param {Texture} [housesTexture] — optional RPG Maker MV houses image (preferred)
 * @returns {Container} PixiJS container with the building + sign
 */
export function createBuilding(shopType, position, label, tilesetTexture, housesTexture) {
  const container = new Container();

  let houseSprite;

  if (housesTexture?.source) {
    // Use one clean house from the Houses tileset (Serene Village reference style)
    const houseTexture = new Texture({
      source: housesTexture.source,
      frame: new Rectangle(SINGLE_HOUSE.x, SINGLE_HOUSE.y, SINGLE_HOUSE.w, SINGLE_HOUSE.h),
    });
    houseSprite = new Sprite(houseTexture);
    houseSprite.width = SINGLE_HOUSE.w * (SCALE * 0.5); // 144 -> 144px on screen
    houseSprite.height = SINGLE_HOUSE.h * (SCALE * 0.5);
  } else {
    const variant = HOUSE_VARIANTS[shopType] || HOUSE_VARIANTS.cafe;
    const houseTexture = new Texture({
      source: tilesetTexture.source,
      frame: new Rectangle(variant.x, variant.y, variant.w, variant.h),
    });
    houseSprite = new Sprite(houseTexture);
    houseSprite.width = variant.w * SCALE;
    houseSprite.height = variant.h * SCALE;
  }

  houseSprite.anchor.set(0.5, 0.85);
  container.addChild(houseSprite);

  // --- Shop sign with label text ---
  const signBg = new Graphics();
  const signWidth = Math.max(60, label.length * 7 + 16);
  const signHeight = 20;
  signBg
    .roundRect(-signWidth / 2, 0, signWidth, signHeight, 4)
    .fill({ color: 0xfff8e7, alpha: 0.95 })
    .stroke({ color: 0x8b7355, width: 1.5 });
  signBg.y = houseSprite.height * 0.35;
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
  container.zIndex = position.y + houseSprite.height * 0.3;

  return container;
}
