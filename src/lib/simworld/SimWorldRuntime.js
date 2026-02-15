import {
  CHARACTER_STATES,
  DEFAULT_SIM_OPTIONS,
  SIM_STATUS,
  WORLD_CONFIG,
} from "./config";
import { createCharacterEntity } from "./domain/characterEntity";
import { PixiWorldEngine } from "./engine/PixiWorldEngine";
import { createId } from "./services/id";
import { fetchSpriteMetadata } from "./services/spriteAdapter";
import { TimingController } from "./services/timingController";
import { configureSimStore, simActions } from "./store/simStore";

/** Default positions for auto-laid-out options in the choice plaza */
const OPTION_LAYOUT_SLOTS = [
  { x: 760, y: 250 },
  { x: 920, y: 250 },
  { x: 840, y: 360 },
  { x: 760, y: 430 },
  { x: 920, y: 430 },
];

export class SimWorldRuntime {
  constructor(options = {}) {
    this.options = { ...DEFAULT_SIM_OPTIONS, ...options };
    this.store = configureSimStore();
    this.timing = new TimingController();
    this.timing.setSpeed(2);
    this.engine = new PixiWorldEngine(WORLD_CONFIG);
    this.destroyed = false;

    /** @type {Map<string, {id: string, label: string, x: number, y: number}>} */
    this.optionsMap = new Map();

    /** @type {Set<function>} */
    this.actionListeners = new Set();

    /** Tracks the next auto-layout slot index */
    this._nextSlot = 0;
  }

  // ----------------------------------------------------------------
  // Lifecycle
  // ----------------------------------------------------------------

  async attach(containerElement) {
    await this.engine.init(containerElement);
    this.store.dispatch(simActions.setRuntimeStatus(SIM_STATUS.READY, true));
    this._emitAction(null, "runtime.ready", { message: "Sim world attached." });
  }

  destroy() {
    this.destroyed = true;
    this.engine.destroy();
    this.actionListeners.clear();
  }

  // ----------------------------------------------------------------
  // Event / Action system
  // ----------------------------------------------------------------

  /** Subscribe to action events. Returns unsubscribe function. */
  onAction(callback) {
    this.actionListeners.add(callback);
    return () => this.actionListeners.delete(callback);
  }

  _emitAction(spriteId, type, detail = {}) {
    const event = {
      id: createId("evt"),
      spriteId,
      type,
      detail,
      timestamp: Date.now(),
    };
    this.store.dispatch(simActions.appendEvent(event));
    for (const listener of this.actionListeners) {
      try {
        listener(event);
      } catch {
        // swallow listener errors
      }
    }
    return event;
  }

  // ----------------------------------------------------------------
  // Options management
  // ----------------------------------------------------------------

  /** Add an option (station marker) to the world. */
  addOption(optionConfig) {
    const id = optionConfig.id || createId("opt");
    const slot = optionConfig.position || OPTION_LAYOUT_SLOTS[this._nextSlot % OPTION_LAYOUT_SLOTS.length];
    this._nextSlot++;

    const option = {
      id,
      label: optionConfig.label || id,
      x: slot.x,
      y: slot.y,
    };

    this.optionsMap.set(id, option);
    this.engine.addStation(option);
    this._emitAction(null, "option.added", { optionId: id, label: option.label });
    return option;
  }

  /** Remove an option from the world. */
  removeOption(optionId) {
    if (!this.optionsMap.has(optionId)) {
      return;
    }
    this.optionsMap.delete(optionId);
    this.engine.removeStation(optionId);
    this._emitAction(null, "option.removed", { optionId });
  }

  /** Get all current options. */
  getOptions() {
    return Array.from(this.optionsMap.values());
  }

  // ----------------------------------------------------------------
  // Sprite management
  // ----------------------------------------------------------------

  /**
   * Add a sprite character to the world.
   * @param {object} personality - { id?, name, age?, bio?, persona?, color? }
   * @returns {Promise<object>} the created character entity
   */
  async addSprite(personality = {}) {
    const characterCount = Object.keys(this.store.getState().characters).length;
    const spawnPoint =
      WORLD_CONFIG.spawnPoints[characterCount % WORLD_CONFIG.spawnPoints.length];

    const character = createCharacterEntity(
      {
        id: personality.id || createId("sprite"),
        name: personality.name || "Agent",
        age: personality.age || null,
        bio: personality.bio || null,
        persona: personality.persona || "General",
        segment: personality.segment || "default",
        color: personality.color || this._pickColor(characterCount),
      },
      spawnPoint,
    );

    const spriteMetadata = await fetchSpriteMetadata({
      persona: character.persona,
      color: character.color,
    });

    await this.engine.addCharacter(character, spriteMetadata);
    this.store.dispatch(simActions.upsertCharacter(character));
    this._emitAction(character.id, "sprite.added", {
      name: character.name,
      persona: character.persona,
    });

    return character;
  }

  /** Remove a sprite from the world. */
  removeSprite(spriteId) {
    this.engine.removeCharacter(spriteId);
    // Mark character as removed in store
    const characters = { ...this.store.getState().characters };
    delete characters[spriteId];
    // Dispatch a fresh state (we can't delete via upsert, so hydrate)
    this.store.dispatch(
      simActions.hydrateSimulation({
        ...this.store.getState(),
        characters,
      }),
    );
    this._emitAction(spriteId, "sprite.removed", { spriteId });
  }

  /** Get all current sprites. */
  getSprites() {
    return Object.values(this.store.getState().characters);
  }

  // ----------------------------------------------------------------
  // Actions
  // ----------------------------------------------------------------

  /**
   * Make a sprite say something (speech bubble).
   * @param {string} spriteId
   * @param {string} message
   */
  async say(spriteId, message) {
    const text = message || "...";
    this.engine.showSpeechBubble(spriteId, text, WORLD_CONFIG.bubbleDurationMs.reason);
    this._emitAction(spriteId, "say", { message: text });
    await this.timing.wait(WORLD_CONFIG.bubbleDurationMs.reason);
  }

  /**
   * Move a sprite to an option's position.
   * @param {string} spriteId
   * @param {string} optionId
   */
  async moveTo(spriteId, optionId) {
    const option = this.optionsMap.get(optionId);
    if (!option) {
      throw new Error(`Option "${optionId}" not found.`);
    }

    const character = this.store.getState().characters[spriteId];
    if (!character) {
      throw new Error(`Sprite "${spriteId}" not found.`);
    }

    // Set walking animation
    this.engine.setCharacterState(spriteId, CHARACTER_STATES.WALKING_TO_STATION);
    this._emitAction(spriteId, "move", { optionId, optionLabel: option.label });

    const from = character.position;
    const to = { x: option.x, y: option.y + 26 };

    await this.timing.tween({
      from,
      to,
      durationMs: WORLD_CONFIG.moveDurationMs.toStation,
      onUpdate: (position) => {
        this._updatePosition(spriteId, position);
      },
    });

    // Return to idle
    this.engine.setCharacterState(spriteId, CHARACTER_STATES.IDLE);
  }

  /**
   * Exit a sprite from the world (walk off bottom, then remove).
   * @param {string} spriteId
   */
  async exit(spriteId) {
    const character = this.store.getState().characters[spriteId];
    if (!character) {
      throw new Error(`Sprite "${spriteId}" not found.`);
    }

    this.engine.setCharacterState(spriteId, CHARACTER_STATES.WALKING_TO_CHOICE);
    this._emitAction(spriteId, "exit", { name: character.name });

    const from = character.position;
    const to = { x: from.x, y: WORLD_CONFIG.height + 40 };

    await this.timing.tween({
      from,
      to,
      durationMs: WORLD_CONFIG.moveDurationMs.toSpawn,
      onUpdate: (position) => {
        this._updatePosition(spriteId, position);
      },
    });

    this.removeSprite(spriteId);
  }

  // ----------------------------------------------------------------
  // Internal helpers
  // ----------------------------------------------------------------

  _updatePosition(spriteId, position) {
    const current = this.store.getState().characters[spriteId];
    if (!current) {
      return;
    }
    const updated = { ...current, position };
    this.store.dispatch(simActions.upsertCharacter(updated));
    this.engine.setCharacterPosition(spriteId, position);
  }

  _pickColor(index) {
    const palette = [
      "#2563eb",
      "#059669",
      "#b45309",
      "#dc2626",
      "#7c3aed",
      "#0891b2",
      "#c026d3",
      "#65a30d",
    ];
    return palette[index % palette.length];
  }
}

/** Factory function */
export function createSimWorld(options = {}) {
  return new SimWorldRuntime(options);
}
