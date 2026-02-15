import {
  CHARACTER_STATES,
  DEFAULT_SIM_OPTIONS,
  getOptionSlotIndices,
  SHOP_POSITIONS,
  SHOP_TYPES,
  SIM_STATUS,
  SPAWN_POINT,
  WORLD_CONFIG,
} from "./config";
import { createCharacterEntity } from "./domain/characterEntity";
import { PixiWorldEngine } from "./engine/PixiWorldEngine";
import { getPath, getPathToNearestExit } from "./engine/pathSystem";
import { createId } from "./services/id";
import { TimingController } from "./services/timingController";
import { configureSimStore, simActions } from "./store/simStore";

export class SimWorldRuntime {
  constructor(options = {}) {
    this.options = { ...DEFAULT_SIM_OPTIONS, ...options };
    this.store = configureSimStore();
    this.timing = new TimingController();
    this.timing.setSpeed(2);
    this.engine = new PixiWorldEngine(WORLD_CONFIG);
    this.destroyed = false;

    /** @type {Map<string, {id: string, label: string, shopType?: string, visual?: object, x: number, y: number, slotIndex: number}>} */
    this.optionsMap = new Map();

    /** @type {Set<function>} */
    this.actionListeners = new Set();

    /** Tracks which shop positions are occupied (index → optionId) */
    this._slotAssignments = new Map();

    /** Next slot index to try */
    this._nextSlot = 0;

    /** When set, options use evenly spaced slots (diagonal spread) for this count */
    this._optionCount = null;
    /** Index into _spreadSlots when _optionCount is set */
    this._spreadSlotIndex = 0;
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
  // Options / shop management
  // ----------------------------------------------------------------

  /**
   * Set the total number of options that will be added. When n < 8, options
   * are placed in evenly spaced (diagonal) positions instead of consecutive.
   * Call before addOption in a loop.
   * @param {number} n - Total option count (1–8)
   */
  setOptionCount(n) {
    this._optionCount = Math.max(0, Math.min(8, Math.floor(Number(n) || 0)));
    this._spreadSlotIndex = 0;
  }

  /**
   * Add an option (shop building) to the world.
   * @param {object} optionConfig - { id?, label, shopType?, visual? }
   */
  addOption(optionConfig) {
    const id = optionConfig.id || createId("opt");

    let slotIndex;
    if (
      this._optionCount != null &&
      this._optionCount > 0 &&
      this._spreadSlotIndex < this._optionCount
    ) {
      const spreadSlots = getOptionSlotIndices(this._optionCount);
      slotIndex = spreadSlots[this._spreadSlotIndex];
      this._spreadSlotIndex++;
      // If that slot is already taken (shouldn't happen with spread), fall back
      if (this._slotAssignments.has(slotIndex)) {
        slotIndex = -1;
      }
    } else {
      slotIndex = -1;
    }

    if (slotIndex === -1) {
      // Fallback: find next available slot (original behavior)
      for (let i = 0; i < SHOP_POSITIONS.length; i++) {
        const candidate = (this._nextSlot + i) % SHOP_POSITIONS.length;
        if (!this._slotAssignments.has(candidate)) {
          slotIndex = candidate;
          break;
        }
      }
      if (slotIndex === -1) {
        slotIndex = this._nextSlot % SHOP_POSITIONS.length;
      }
      this._nextSlot = slotIndex + 1;
    }

    const slot = SHOP_POSITIONS[slotIndex];
    const visual = optionConfig.visual?.spriteSheetDataUrl
      ? {
          spriteSheetDataUrl: optionConfig.visual.spriteSheetDataUrl,
          gifDataUrl: optionConfig.visual.gifDataUrl || null,
          grid: Array.isArray(optionConfig.visual.grid)
            ? [
                Number.parseInt(optionConfig.visual.grid[0], 10) || 2,
                Number.parseInt(optionConfig.visual.grid[1], 10) || 2,
              ]
            : [2, 2],
          frameSize: Number.parseInt(optionConfig.visual.frameSize, 10) || 128,
          frameDurationMs:
            Number.parseInt(optionConfig.visual.frameDurationMs, 10) || 150,
        }
      : null;
    const assignedShopType =
      optionConfig.shopType ||
      SHOP_TYPES[slotIndex % SHOP_TYPES.length]?.id ||
      null;

    const option = {
      id,
      label: optionConfig.label || id,
      shopType: assignedShopType,
      visual,
      x: slot.x,
      y: slot.y,
      slotIndex,
    };

    this.optionsMap.set(id, option);
    this._slotAssignments.set(slotIndex, id);

    this.engine.addStation({
      id,
      label: option.label,
      shopType: option.shopType,
      visual: option.visual,
      x: slot.x,
      y: slot.y,
    });

    this._emitAction(null, "option.added", {
      optionId: id,
      label: option.label,
      shopType: option.shopType,
      hasVisual: Boolean(option.visual),
    });
    return option;
  }

  removeOption(optionId) {
    const option = this.optionsMap.get(optionId);
    if (!option) return;

    this._slotAssignments.delete(option.slotIndex);
    this.optionsMap.delete(optionId);
    this.engine.removeStation(optionId);
    this._emitAction(null, "option.removed", { optionId });
  }

  getOptions() {
    return Array.from(this.optionsMap.values());
  }

  /**
   * Attach or update the visual (product sprite) on an existing option/building.
   * Call this after the option has been added to overlay a generated sprite.
   *
   * @param {string} optionId — option ID returned from addOption
   * @param {{ spriteSheetDataUrl: string, grid?: number[], frameSize?: number, frameDurationMs?: number }} visual
   */
  updateOptionVisual(optionId, visual) {
    const option = this.optionsMap.get(optionId);
    if (!option || !visual?.spriteSheetDataUrl) return;

    const normalizedVisual = {
      spriteSheetDataUrl: visual.spriteSheetDataUrl,
      gifDataUrl: visual.gifDataUrl || null,
      grid: Array.isArray(visual.grid)
        ? [
            Number.parseInt(visual.grid[0], 10) || 2,
            Number.parseInt(visual.grid[1], 10) || 2,
          ]
        : [2, 2],
      frameSize: Number.parseInt(visual.frameSize, 10) || 128,
      frameDurationMs: Number.parseInt(visual.frameDurationMs, 10) || 150,
    };

    // Update in optionsMap
    option.visual = normalizedVisual;

    // Update in engine station and trigger overlay attachment
    const entry = this.engine.stations.get(optionId);
    if (entry) {
      entry.station.visual = normalizedVisual;
      this.engine._attachStationOverlay(optionId).catch((err) => {
        console.warn(`Failed to attach overlay for ${optionId}:`, err);
      });
    }

    this._emitAction(null, "option.visual_updated", {
      optionId,
      label: option.label,
    });
  }

  // ----------------------------------------------------------------
  // Sprite management
  // ----------------------------------------------------------------

  async addSprite(personality = {}) {
    const characterCount = Object.keys(this.store.getState().characters).length;

    const character = createCharacterEntity(
      {
        id: personality.id || createId("sprite"),
        name: personality.name || "Agent",
        age: personality.age || null,
        bio: personality.bio || null,
        persona: personality.persona || "General",
        segment: personality.segment || "default",
        color: personality.color || this._pickColor(characterCount),
        position: personality.position || null,
      },
      SPAWN_POINT,
    );

    await this.engine.addCharacter(character);
    this.store.dispatch(simActions.upsertCharacter(character));
    this._emitAction(character.id, "sprite.added", {
      name: character.name,
      persona: character.persona,
    });

    return character;
  }

  removeSprite(spriteId) {
    this.engine.removeCharacter(spriteId);
    const characters = { ...this.store.getState().characters };
    delete characters[spriteId];
    this.store.dispatch(
      simActions.hydrateSimulation({
        ...this.store.getState(),
        characters,
      }),
    );
    this._emitAction(spriteId, "sprite.removed", { spriteId });
  }

  getSprites() {
    return Object.values(this.store.getState().characters);
  }

  // ----------------------------------------------------------------
  // Actions
  // ----------------------------------------------------------------

  /**
   * Wander around the current area with short cardinal steps.
   * Keeps movement readable and avoids jittery random motion.
   */
  async wander(spriteId, options = {}) {
    const character = this.store.getState().characters[spriteId];
    if (!character) {
      throw new Error(`Sprite "${spriteId}" not found.`);
    }

    const steps = Math.max(1, Number.parseInt(options.steps, 10) || 2);
    const minDistance = Math.max(
      10,
      Number.parseInt(options.minDistance, 10) || 24,
    );
    const maxDistance = Math.max(
      minDistance + 4,
      Number.parseInt(options.maxDistance, 10) || 56,
    );
    const margin = 28;
    const directions = [
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 },
    ];

    this._emitAction(spriteId, "wander", { steps });

    let current = { ...character.position };

    for (let i = 0; i < steps; i++) {
      const dir = directions[Math.floor(Math.random() * directions.length)];
      const distance =
        minDistance + Math.random() * (maxDistance - minDistance);
      const target = {
        x: Math.max(
          margin,
          Math.min(WORLD_CONFIG.width - margin, current.x + dir.x * distance),
        ),
        y: Math.max(
          margin,
          Math.min(WORLD_CONFIG.height - margin, current.y + dir.y * distance),
        ),
      };

      const waypoints = getPath(current, target);
      if (!waypoints.length) continue;

      await this._walkAlongPath(
        spriteId,
        current,
        waypoints,
        CHARACTER_STATES.WALKING_TO_STATION,
      );
      current = { ...target };
    }

    this.engine.setCharacterState(spriteId, CHARACTER_STATES.IDLE, "down");
  }

  async say(spriteId, message) {
    const text = message || "...";
    this.engine.showSpeechBubble(
      spriteId,
      text,
      WORLD_CONFIG.bubbleDurationMs.reason,
    );
    this._emitAction(spriteId, "say", { message: text });
    await this.timing.wait(WORLD_CONFIG.bubbleDurationMs.reason);
  }

  /**
   * Move a sprite to an option's position using waypoint pathfinding.
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

    // Set walking state
    this.engine.setCharacterState(
      spriteId,
      CHARACTER_STATES.WALKING_TO_STATION,
    );
    this._emitAction(spriteId, "move", { optionId, optionLabel: option.label });

    // Get waypoint path from current position to shop
    const from = character.position;
    const to = { x: option.x, y: option.y + 20 };
    const waypoints = getPath(from, to);

    // Walk along each waypoint segment
    await this._walkAlongPath(
      spriteId,
      from,
      waypoints,
      CHARACTER_STATES.WALKING_TO_STATION,
    );

    // Arrive — return to idle
    this.engine.setCharacterState(spriteId, CHARACTER_STATES.IDLE, "down");
  }

  /**
   * Pick an option's product sprite when the character is at that option.
   */
  async pick(spriteId, optionId) {
    const option = this.optionsMap.get(optionId);
    if (!option) {
      throw new Error(`Option "${optionId}" not found.`);
    }

    const character = this.store.getState().characters[spriteId];
    if (!character) {
      throw new Error(`Sprite "${spriteId}" not found.`);
    }

    // Must be at the house entrance area (same target offset used by moveTo).
    const pickTarget = { x: option.x, y: option.y + 20 };
    const dx = character.position.x - pickTarget.x;
    const dy = character.position.y - pickTarget.y;
    const distance = Math.hypot(dx, dy);
    if (distance > WORLD_CONFIG.pickRangePx) {
      throw new Error(
        `Agent must be at "${option.label}" to pick (within ${WORLD_CONFIG.pickRangePx}px).`,
      );
    }

    const previousOptionId = character.pickedOptionId || null;

    // Only show visual pickup if the option has a product sprite
    if (option.visual?.spriteSheetDataUrl) {
      await this.engine.setCharacterPickup(spriteId, option.visual, {
        optionId,
      });
    }

    const updated = {
      ...character,
      pickedOptionId: option.id,
      pickedAt: Date.now(),
    };
    this.store.dispatch(simActions.upsertCharacter(updated));

    this._emitAction(spriteId, "pick", {
      optionId: option.id,
      optionLabel: option.label,
      replacedPrevious: Boolean(
        previousOptionId && previousOptionId !== option.id,
      ),
      previousOptionId,
    });

    return {
      spriteId,
      optionId: option.id,
      previousOptionId,
    };
  }

  // ----------------------------------------------------------------
  // Thinking indicator
  // ----------------------------------------------------------------

  /**
   * Show a persistent thinking indicator (speech bubble with "...") on a sprite.
   * Stays visible until clearThinking() is called.
   */
  showThinking(spriteId) {
    this.engine.showSpeechBubble(spriteId, "...", 999_999);
    this._emitAction(spriteId, "thinking.start", { message: "Thinking..." });
  }

  /**
   * Clear the thinking indicator from a sprite.
   */
  clearThinking(spriteId) {
    this.engine.clearSpeechBubble(spriteId);
    this._emitAction(spriteId, "thinking.end", { message: "Done thinking." });
  }

  /**
   * Exit a sprite from the world — walk to nearest exit, then remove.
   */
  async exit(spriteId) {
    const character = this.store.getState().characters[spriteId];
    if (!character) {
      throw new Error(`Sprite "${spriteId}" not found.`);
    }

    this.engine.setCharacterState(spriteId, CHARACTER_STATES.WALKING_TO_CHOICE);
    this._emitAction(spriteId, "exit", { name: character.name });

    const from = character.position;
    const waypoints = getPathToNearestExit(from);

    await this._walkAlongPath(
      spriteId,
      from,
      waypoints,
      CHARACTER_STATES.WALKING_TO_CHOICE,
    );

    this.removeSprite(spriteId);
  }

  // ----------------------------------------------------------------
  // Internal helpers
  // ----------------------------------------------------------------

  /**
   * Walk a sprite along a sequence of waypoints.
   * For each segment, tween from current to next waypoint and
   * update animation direction based on movement.
   */
  async _walkAlongPath(spriteId, startPos, waypoints, walkState) {
    let currentPos = { ...startPos };

    for (const wp of waypoints) {
      const dx = wp.x - currentPos.x;
      const dy = wp.y - currentPos.y;
      const segDist = Math.hypot(dx, dy);

      if (segDist < 1) continue;

      // Determine direction for this segment
      let dir;
      if (Math.abs(dx) > Math.abs(dy)) {
        dir = dx > 0 ? "right" : "left";
      } else {
        dir = dy > 0 ? "down" : "up";
      }

      this.engine.setCharacterState(spriteId, walkState, dir);

      // Duration proportional to distance (pixels/sec ≈ 120)
      const segDuration = Math.max(300, (segDist / 120) * 1000);
      const from = { ...currentPos };

      await this.timing.tween({
        from,
        to: wp,
        durationMs: segDuration,
        onUpdate: (position) => {
          this._updatePosition(spriteId, position, from);
          from.x = position.x;
          from.y = position.y;
        },
      });

      currentPos = { ...wp };
    }
  }

  _updatePosition(spriteId, position, prevPosition) {
    const current = this.store.getState().characters[spriteId];
    if (!current) return;
    const updated = { ...current, position };
    this.store.dispatch(simActions.upsertCharacter(updated));
    this.engine.setCharacterPosition(spriteId, position, prevPosition);
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
