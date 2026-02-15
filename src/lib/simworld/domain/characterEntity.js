import { CHARACTER_STATES, WORLD_CONFIG } from "../config";
import { createId } from "../services/id";

export function createCharacterEntity(
  config = {},
  fallbackSpawn = WORLD_CONFIG.spawnPoints[0],
) {
  return {
    id: config.id || createId("agent"),
    name: config.name || "Agent",
    age: config.age || null,
    bio: config.bio || null,
    persona: config.persona || "General",
    segment: config.segment || "default",
    location: config.location || "Unknown",
    modelTag: config.modelTag || "rule-v1",
    color: config.color || "#64748b",
    noise: Number.isFinite(config.noise) ? config.noise : 0.15,
    spriteTag: config.spriteTag || "default",
    state: CHARACTER_STATES.IDLE,
    home: config.home || { x: fallbackSpawn.x, y: fallbackSpawn.y },
    position: config.position || { x: fallbackSpawn.x, y: fallbackSpawn.y },
    choiceHistory: [],
  };
}
