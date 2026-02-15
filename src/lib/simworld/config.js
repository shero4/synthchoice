export const SIMWORLD_SCHEMA_VERSION = "1.0.0";

export const WORLD_CONFIG = {
  width: 1200,
  height: 720,
  background: "#e8f5e9",
  districtName: "SynthChoice Central",
  spawnPoints: [
    { id: "spawn-nw", x: 190, y: 560 },
    { id: "spawn-ne", x: 330, y: 560 },
    { id: "spawn-sw", x: 470, y: 560 },
  ],
  stations: {
    A: { id: "A", x: 760, y: 250, label: "Option A" },
    B: { id: "B", x: 920, y: 250, label: "Option B" },
    C: { id: "C", x: 840, y: 360, label: "Option C" },
    NONE: { id: "NONE", x: 840, y: 490, label: "None" },
  },
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
};

export const DEFAULT_SIM_OPTIONS = {
  seed: "simworld-seed-001",
  runIdPrefix: "run",
  persistSnapshots: false,
};

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
