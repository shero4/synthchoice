import { Assets } from "pixi.js";

/**
 * All asset paths served from public/.
 * Keys become the PixiJS asset aliases.
 */
const ASSET_MANIFEST = {
  // World tilesets (Serene Village)
  tileset: "/tilesets/serene_village_16x16.png",
  tilesetHouses: "/tilesets/serene_village_houses.png",
  tilesetOutside: "/tilesets/serene_village_outside.png",
  tilesetTerrains: "/tilesets/serene_village_terrains.png",

  // Character sprites (Pixel Crawler Body_A)
  charIdleDown: "/sprites/char_idle_down.png",
  charIdleSide: "/sprites/char_idle_side.png",
  charIdleUp: "/sprites/char_idle_up.png",
  charWalkDown: "/sprites/char_walk_down.png",
  charWalkSide: "/sprites/char_walk_side.png",
  charWalkUp: "/sprites/char_walk_up.png",
};

let _loaded = null;
let _loadingPromise = null;

/**
 * Load all game assets via PixiJS Assets.
 * Returns a map of alias → Texture. Caches after first call.
 */
export async function loadAllAssets() {
  if (_loaded) return _loaded;
  if (_loadingPromise) return _loadingPromise;

  _loadingPromise = (async () => {
    const entries = Object.entries(ASSET_MANIFEST);
    const loadedEntries = await Promise.all(
      entries.map(async ([key, path]) => {
        const texture = await Assets.load(path);
        return [key, texture];
      }),
    );

    _loaded = Object.fromEntries(loadedEntries);
    return _loaded;
  })();

  try {
    return await _loadingPromise;
  } finally {
    _loadingPromise = null;
  }
}

/**
 * Get already-loaded assets (throws if not yet loaded).
 */
export function getAssets() {
  if (!_loaded) {
    throw new Error("Assets not loaded yet. Call loadAllAssets() first.");
  }
  return _loaded;
}
