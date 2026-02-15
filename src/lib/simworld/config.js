export const SIMWORLD_SCHEMA_VERSION = "2.0.0";

// ---------------------------------------------------------------------------
// Tile / World dimensions
// ---------------------------------------------------------------------------
export const TILE_SIZE = 16; // native tile pixels (Serene Village 16x16)
export const SCALE = 2; // render scale (16px tile → 32px on screen)
export const DISPLAY_TILE = TILE_SIZE * SCALE; // 32

export const MAP_COLS = 40;
export const MAP_ROWS = 25;
export const WORLD_WIDTH = MAP_COLS * DISPLAY_TILE; // 1280
export const WORLD_HEIGHT = MAP_ROWS * DISPLAY_TILE; // 800

// ---------------------------------------------------------------------------
// Spawn / Center
// ---------------------------------------------------------------------------
export const SPAWN_TILE = { col: 20, row: 12 };
export const SPAWN_POINT = {
  x: SPAWN_TILE.col * DISPLAY_TILE + DISPLAY_TILE / 2,
  y: SPAWN_TILE.row * DISPLAY_TILE + DISPLAY_TILE / 2,
};

// ---------------------------------------------------------------------------
// Exit gates (pixel positions at map edges)
// ---------------------------------------------------------------------------
export const EXIT_POINTS = {
  north: { x: SPAWN_POINT.x, y: -20 },
  south: { x: SPAWN_POINT.x, y: WORLD_HEIGHT + 20 },
  east: { x: WORLD_WIDTH + 20, y: SPAWN_POINT.y },
  west: { x: -20, y: SPAWN_POINT.y },
};

// ---------------------------------------------------------------------------
// Shop types (the 8 possible building types)
// ---------------------------------------------------------------------------
export const SHOP_TYPES = [
  { id: "cafe", label: "Cafe", icon: "☕", personalities: ["ENFP", "ESFJ"] },
  {
    id: "library",
    label: "Library",
    icon: "📚",
    personalities: ["INTJ", "INTP"],
  },
  { id: "gym", label: "Gym", icon: "💪", personalities: ["ESTP", "ESFP"] },
  {
    id: "gallery",
    label: "Art Gallery",
    icon: "🎨",
    personalities: ["INFP", "ISFP"],
  },
  {
    id: "office",
    label: "Office",
    icon: "💼",
    personalities: ["ESTJ", "ENTJ"],
  },
  {
    id: "tech",
    label: "Tech Shop",
    icon: "💻",
    personalities: ["ISTP", "INTP"],
  },
  {
    id: "meditation",
    label: "Meditation",
    icon: "🧘",
    personalities: ["INFJ", "ISFJ"],
  },
  {
    id: "music",
    label: "Music Hall",
    icon: "🎵",
    personalities: ["ENFP", "ESFP"],
  },
];

// ---------------------------------------------------------------------------
// Shop positions — 8 slots arranged in a circle around the center plaza
// Each position is in tile coords + its nearest exit for sprite departure
// ---------------------------------------------------------------------------
const R = 7; // radius in tiles from center
const cx = SPAWN_TILE.col;
const cy = SPAWN_TILE.row;

function shopSlot(angleDeg, nearestExit) {
  const rad = (angleDeg * Math.PI) / 180;
  const col = Math.round(cx + R * Math.sin(rad));
  const row = Math.round(cy - R * Math.cos(rad));
  return {
    col,
    row,
    x: col * DISPLAY_TILE + DISPLAY_TILE / 2,
    y: row * DISPLAY_TILE + DISPLAY_TILE / 2,
    nearestExit,
  };
}

export const SHOP_POSITIONS = [
  shopSlot(0, "north"), // N   — slot 0
  shopSlot(45, "north"), // NE  — slot 1
  shopSlot(90, "east"), // E   — slot 2
  shopSlot(135, "south"), // SE  — slot 3
  shopSlot(180, "south"), // S   — slot 4
  shopSlot(225, "south"), // SW  — slot 5
  shopSlot(270, "west"), // W   — slot 6
  shopSlot(315, "north"), // NW  — slot 7
];

// ---------------------------------------------------------------------------
// House visual config — maps shop type to Serene Village house variant
// Pixel rects in the 16x16 tileset (Serene_Village_16x16.png, 304×720)
// ---------------------------------------------------------------------------
export const HOUSE_VARIANTS = {
  cafe: { x: 0, y: 272, w: 80, h: 80, roofColor: "red" },
  library: { x: 0, y: 464, w: 80, h: 80, roofColor: "blue" },
  gym: { x: 0, y: 368, w: 80, h: 80, roofColor: "green" },
  gallery: { x: 96, y: 272, w: 96, h: 80, roofColor: "red" },
  office: { x: 96, y: 464, w: 96, h: 80, roofColor: "blue" },
  tech: { x: 96, y: 368, w: 96, h: 80, roofColor: "green" },
  meditation: { x: 0, y: 544, w: 80, h: 80, roofColor: "blue" },
  music: { x: 96, y: 336, w: 96, h: 96, roofColor: "red" },
};

// ---------------------------------------------------------------------------
// Timing / animation config (preserved from v1)
// ---------------------------------------------------------------------------
export const WORLD_CONFIG = {
  width: WORLD_WIDTH,
  height: WORLD_HEIGHT,
  background: "#4a8c3f",
  speedPresets: [0.5, 1, 2, 3],
  moveDurationMs: {
    toStation: 2200,
    toChoice: 1200,
    toSpawn: 2100,
  },
  bubbleDurationMs: {
    intro: 1800,
    reason: 2500,
  },
  actionTimeoutMs: 15000,
  pickRangePx: 36,
};

// ---------------------------------------------------------------------------
// Character state machine (preserved from v1)
// ---------------------------------------------------------------------------
export const CHARACTER_STATES = {
  IDLE: "idle",
  INTRO_MESSAGE: "intro_message",
  WALKING_TO_STATION: "walking_to_station",
  THINKING: "thinking",
  CHOOSING: "choosing",
  REASON_MESSAGE: "reason_message",
  WALKING_TO_CHOICE: "walking_to_choice",
  RETURNING: "returning",
};

export const SIM_STATUS = {
  IDLE: "idle",
  READY: "ready",
  RUNNING: "running",
  PAUSED: "paused",
  COMPLETED: "completed",
};

export const DEFAULT_SIM_OPTIONS = {
  seed: "simworld-seed-001",
  runIdPrefix: "run",
  persistSnapshots: false,
};
