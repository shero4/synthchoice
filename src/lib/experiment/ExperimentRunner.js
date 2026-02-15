/**
 * ExperimentRunner — orchestrates a live experiment run in SimWorld.
 *
 * Phases:
 *   1. init()  — load options (buildings), generate agent queue
 *   2. start() — rolling-window execution: spawn → think → decide → move → pick → exit
 *
 * All results are kept in memory. The caller saves to Firebase when ready.
 */

import {
  generateAlternativeSprite,
  generateAlternativeSprites,
  getAgentDecision,
} from "@/app/experiments/[experimentId]/run/actions";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DEFAULT_ACTIVE_CONCURRENCY = 10;
const DEFAULT_DECISION_CONCURRENCY = 6;
const DEFAULT_OPTION_SPRITE_CONCURRENCY = 6;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/** Fisher-Yates shuffle (returns new array). */
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Expand agentPlan segments into a flat list of individual agents.
 *
 * Each agent = { id, name, segmentId, label, modelTag, traits }
 */
function expandSegmentsToAgents(segments) {
  const agents = [];
  const segCounters = {};

  for (const seg of segments) {
    const count = seg.count || 1;
    segCounters[seg.segmentId] = 0;

    for (let i = 0; i < count; i++) {
      segCounters[seg.segmentId]++;
      const idx = segCounters[seg.segmentId];

      // Derive a readable name from segment info
      const personality = seg.traits?.personality || "Agent";
      const location = seg.traits?.location || "";
      const name = location
        ? `${personality} #${idx} (${location})`
        : `${personality} #${idx}`;

      agents.push({
        id: `${seg.segmentId}_${idx}`,
        name,
        segmentId: seg.segmentId,
        label: seg.label,
        modelTag: seg.modelTag || "stub",
        traits: { ...seg.traits },
      });
    }
  }

  return agents;
}

function expandSegmentsToTargetTotal(segments, targetTotal) {
  const desiredTotal = Number.parseInt(targetTotal, 10);
  const baseAgents = expandSegmentsToAgents(segments);
  if (!Number.isFinite(desiredTotal) || desiredTotal <= 0) {
    return baseAgents;
  }
  if (baseAgents.length >= desiredTotal || segments.length === 0) {
    return baseAgents;
  }

  const agents = [...baseAgents];
  const segCounters = {};
  segments.forEach((seg) => {
    segCounters[seg.segmentId] = Number.parseInt(seg.count, 10) || 0;
  });

  let segIndex = 0;
  while (agents.length < desiredTotal) {
    const seg = segments[segIndex % segments.length];
    segIndex++;
    segCounters[seg.segmentId] = (segCounters[seg.segmentId] || 0) + 1;
    const idx = segCounters[seg.segmentId];

    const personality = seg.traits?.personality || "Agent";
    const location = seg.traits?.location || "";
    const name = location
      ? `${personality} #${idx} (${location})`
      : `${personality} #${idx}`;

    agents.push({
      id: `${seg.segmentId}_${idx}`,
      name,
      segmentId: seg.segmentId,
      label: seg.label,
      modelTag: seg.modelTag || "stub",
      traits: { ...seg.traits },
    });
  }

  return agents;
}

function createLimiter(limit) {
  const normalizedLimit = Math.max(1, Number.parseInt(limit, 10) || 1);
  const queue = [];
  let activeCount = 0;

  const pump = () => {
    while (activeCount < normalizedLimit && queue.length > 0) {
      const job = queue.shift();
      activeCount++;

      Promise.resolve()
        .then(job.task)
        .then(job.resolve, job.reject)
        .finally(() => {
          activeCount--;
          pump();
        });
    }
  };

  return {
    run(task) {
      return new Promise((resolve, reject) => {
        queue.push({ task, resolve, reject });
        pump();
      });
    },
    getActiveCount() {
      return activeCount;
    },
  };
}

async function runWithConcurrency(items, limit, worker, onSettled) {
  const limiter = createLimiter(limit);
  const jobs = items.map((item, index) =>
    limiter
      .run(() => worker(item, index))
      .then((value) => {
        onSettled?.({ status: "fulfilled", value, item, index });
        return value;
      })
      .catch((reason) => {
        onSettled?.({ status: "rejected", reason, item, index });
        throw reason;
      }),
  );

  return Promise.allSettled(jobs);
}

// ---------------------------------------------------------------------------
// Status enum
// ---------------------------------------------------------------------------

export const RunnerStatus = Object.freeze({
  IDLE: "idle",
  INITIALIZING: "initializing",
  READY: "ready",
  RUNNING: "running",
  COMPLETE: "complete",
  ERROR: "error",
});

// ---------------------------------------------------------------------------
// ExperimentRunner
// ---------------------------------------------------------------------------

export class ExperimentRunner {
  /**
   * @param {object} opts
   * @param {object} opts.runtime       — SimWorldRuntime instance
   * @param {object} opts.experiment    — Experiment document from Firestore
   * @param {object[]} opts.alternatives — Alternative documents from Firestore
   * @param {function} [opts.onProgress] — (progress) => void
   * @param {function} [opts.onAgentUpdate] — (agentEvent) => void
   * @param {function} [opts.onComplete] — (results) => void
   * @param {number} [opts.concurrency]  — rolling window size (default 10)
   */
  constructor({
    runtime,
    experiment,
    alternatives,
    onProgress,
    onAgentUpdate,
    onComplete,
    concurrency = DEFAULT_ACTIVE_CONCURRENCY,
    decisionConcurrency = DEFAULT_DECISION_CONCURRENCY,
    optionSpriteConcurrency = DEFAULT_OPTION_SPRITE_CONCURRENCY,
    initialSpawnWindow = concurrency,
  }) {
    this.runtime = runtime;
    this.experiment = experiment;
    this.alternatives = alternatives || [];
    this.onProgress = onProgress || (() => {});
    this.onAgentUpdate = onAgentUpdate || (() => {});
    this.onComplete = onComplete || (() => {});
    this.concurrency = Math.max(
      1,
      Number.parseInt(concurrency, 10) || DEFAULT_ACTIVE_CONCURRENCY,
    );
    this.initialSpawnWindow = Math.max(
      1,
      Math.min(
        this.concurrency,
        Number.parseInt(initialSpawnWindow, 10) || this.concurrency,
      ),
    );
    this.decisionConcurrency = Math.max(
      1,
      Number.parseInt(decisionConcurrency, 10) || DEFAULT_DECISION_CONCURRENCY,
    );
    this.optionSpriteConcurrency = Math.max(
      1,
      Number.parseInt(optionSpriteConcurrency, 10) ||
        DEFAULT_OPTION_SPRITE_CONCURRENCY,
    );
    this.decisionLimiter = createLimiter(this.decisionConcurrency);

    this.status = RunnerStatus.IDLE;

    /** @type {{ id: string, name: string, segmentId: string, label: string, modelTag: string, traits: object }[]} */
    this.agentQueue = [];

    /** @type {Map<string, string>} alternativeId → runtime optionId */
    this.altToOptionId = new Map();

    /** @type {Map<string, string>} agentDef.id → sprite.id (pre-spawned) */
    this.spriteLookup = new Map();

    /** @type {object[]} collected responses */
    this.responses = [];

    /** @type {object[]} all agents (for reference after run) */
    this.allAgents = [];

    /** Track how many are done */
    this._completedCount = 0;
    this._totalCount = 0;
    this._activeCount = 0;
    this._decidingCount = 0;
    this._spawnCounter = 0;
    this._optionsTotal = 0;
    this._optionsReady = 0;
    this._optionsFailed = 0;
    this._initialSpawnTarget = 0;
    this._initialSpawned = 0;

    /** Abort flag */
    this._aborted = false;
  }

  // -----------------------------------------------------------------------
  // Phase 1 — Initialization
  // -----------------------------------------------------------------------

  async init() {
    this.status = RunnerStatus.INITIALIZING;
    this.responses = [];
    this.altToOptionId = new Map();
    this.spriteLookup = new Map();
    this._completedCount = 0;
    this._activeCount = 0;
    this._decidingCount = 0;
    this._spawnCounter = 0;
    this._optionsTotal = this.alternatives.length;
    this._optionsReady = 0;
    this._optionsFailed = 0;
    this._initialSpawnTarget = 0;
    this._initialSpawned = 0;
    this._emitProgress();

    // 1. Add each alternative as a building/option in SimWorld (spread evenly when < 8)
    this.runtime.setOptionCount(this.alternatives.length);
    for (const alt of this.alternatives) {
      const option = this.runtime.addOption({
        id: alt.id,
        label: alt.name || alt.id,
        visual: alt.visual || null,
      });
      this.altToOptionId.set(alt.id, option.id);
    }

    // 2. Expand segments into individual agents
    const segments = this.experiment?.agentPlan?.segments || [];
    const expandedAgents = expandSegmentsToTargetTotal(
      segments,
      this.experiment?.agentPlan?.totalAgents,
    );

    // Shuffle so segments are interleaved
    this.allAgents = shuffle(expandedAgents);
    this.agentQueue = [...this.allAgents];
    this._totalCount = this.agentQueue.length;
    this._emitProgress();

    // 3. Pre-spawn first batch around the center fountain.
    this._initialSpawnTarget = Math.min(
      this.initialSpawnWindow,
      this.allAgents.length,
    );
    const cx = 656; // SPAWN_POINT.x (center of 1280 world)
    const cy = 400; // SPAWN_POINT.y (center of 800 world)

    for (let i = 0; i < this._initialSpawnTarget; i++) {
      await this._spawnAgent(this.allAgents[i], i, cx, cy, true);
    }

    // 4. Generate product sprites with bounded parallelism.
    let spriteResults = null;
    try {
      spriteResults = await generateAlternativeSprites(
        this.alternatives.map((alt) => ({
          id: alt.id,
          name: alt.name || alt.id,
        })),
        { concurrency: this.optionSpriteConcurrency },
      );
    } catch (batchErr) {
      console.warn(
        "[ExperimentRunner] Batch sprite generation failed, using fallback:",
        batchErr.message,
      );
    }

    if (Array.isArray(spriteResults) && spriteResults.length > 0) {
      for (const result of spriteResults) {
        if (result?.success && result.spriteSheetDataUrl) {
          const optionId = this.altToOptionId.get(result.id);
          if (optionId) {
            this.runtime.updateOptionVisual(optionId, {
              spriteSheetDataUrl: result.spriteSheetDataUrl,
              grid: result.grid,
              frameSize: result.frameSize,
              frameDurationMs: result.frameDurationMs,
            });
          }
          this._optionsReady++;
        } else {
          this._optionsFailed++;
        }
        this._emitProgress();
      }
    } else {
      await runWithConcurrency(
        this.alternatives,
        this.optionSpriteConcurrency,
        async (alt) => {
          try {
            const result = await generateAlternativeSprite(alt.name || alt.id);
            if (result?.success && result.spriteSheetDataUrl) {
              const optionId = this.altToOptionId.get(alt.id);
              if (optionId) {
                this.runtime.updateOptionVisual(optionId, {
                  spriteSheetDataUrl: result.spriteSheetDataUrl,
                  grid: result.grid,
                  frameSize: result.frameSize,
                  frameDurationMs: result.frameDurationMs,
                });
              }
              return { ok: true };
            }
            console.warn(
              `[ExperimentRunner] Sprite gen skipped for "${alt.name}":`,
              result?.error,
            );
            return { ok: false, error: result?.error || "No sprite returned" };
          } catch (err) {
            console.warn(
              `[ExperimentRunner] Sprite gen failed for "${alt.name}":`,
              err.message,
            );
            return { ok: false, error: err.message };
          }
        },
        ({ value }) => {
          if (value?.ok) {
            this._optionsReady++;
          } else {
            this._optionsFailed++;
          }
          this._emitProgress();
        },
      );
    }

    this.status = RunnerStatus.READY;
    this._emitProgress();
  }

  /**
   * Spawn a single agent at a position offset from the fountain center.
   * @param {object} agentDef
   * @param {number} index — used for ring/slot positioning
   * @param {number} cx — center x
   * @param {number} cy — center y
   * @param {boolean} trackInitSpawn — update init counters when true
   */
  async _spawnAgent(
    agentDef,
    index,
    cx = 656,
    cy = 400,
    trackInitSpawn = false,
  ) {
    const ring = Math.floor(index / 8);
    const slot = index % 8;
    const angle = (slot / 8) * 2 * Math.PI + ring * 0.4;
    const radius = 30 + ring * 22;
    const jitterX = (Math.random() - 0.5) * 14;
    const jitterY = (Math.random() - 0.5) * 14;

    const position = {
      x: cx + Math.cos(angle) * radius + jitterX,
      y: cy + Math.sin(angle) * radius + jitterY,
    };

    try {
      const sprite = await this.runtime.addSprite({
        id: agentDef.id,
        name: agentDef.name,
        persona: agentDef.traits?.personality || "Agent",
        segment: agentDef.segmentId,
        position,
      });
      this.spriteLookup.set(agentDef.id, sprite.id);
      this.onAgentUpdate({
        type: "agent.spawned",
        agentId: agentDef.id,
        spriteId: sprite.id,
        name: agentDef.name,
      });
      if (trackInitSpawn) {
        this._initialSpawned++;
        this._emitProgress();
      }
      return sprite.id;
    } catch (err) {
      console.warn(`[ExperimentRunner] Failed to spawn ${agentDef.name}:`, err);
      return null;
    }
  }

  // -----------------------------------------------------------------------
  // Phase 2 — Run
  // -----------------------------------------------------------------------

  async start() {
    if (this.status !== RunnerStatus.READY) {
      throw new Error(`Cannot start from status "${this.status}".`);
    }

    if (this._totalCount === 0) {
      // Nothing to run
      this.status = RunnerStatus.COMPLETE;
      this._emitProgress();
      this.onComplete(this.getResults());
      return;
    }

    this.status = RunnerStatus.RUNNING;
    this._aborted = false;
    this._decidingCount = 0;
    this._emitProgress();

    // Rolling concurrency via a shared promise that resolves when everything is done.
    return new Promise((resolveAll) => {
      const inFlight = new Set();

      const maybeFinish = () => {
        if (inFlight.size === 0 && this.agentQueue.length === 0) {
          this.status = RunnerStatus.COMPLETE;
          this._emitProgress();
          this.onComplete(this.getResults());
          resolveAll();
        }
      };

      const launchOne = () => {
        if (this._aborted || this.agentQueue.length === 0) return;

        const agentDef = this.agentQueue.shift();
        if (!agentDef) return;

        this._activeCount++;
        this._emitProgress();
        const startedAt = Date.now();

        const p = this._processAgent(agentDef, startedAt)
          .catch((err) => {
            console.error(
              `[ExperimentRunner] Agent ${agentDef.name} failed:`,
              err,
            );
            this.responses.push({
              agentId: agentDef.id,
              segmentId: agentDef.segmentId,
              traits: agentDef.traits,
              chosenAlternativeId: null,
              chosenAlternativeName: null,
              chosen: "NONE",
              reason: `Error: ${err.message}`,
              confidence: 0,
              reasonCodes: [],
              error: true,
              timings: { startedAt, endedAt: Date.now() },
            });
          })
          .finally(() => {
            this._completedCount++;
            this._activeCount--;
            inFlight.delete(p);
            this._emitProgress();

            // Launch replacement from queue
            launchOne();
            maybeFinish();
          });

        inFlight.add(p);
      };

      // Seed the initial batch
      const batchSize = Math.min(this.concurrency, this.agentQueue.length);
      for (let i = 0; i < batchSize; i++) {
        launchOne();
      }

      // Edge case: if batch was 0
      maybeFinish();
    });
  }

  /**
   * Process a single agent through the full cycle:
   * spawn (if needed) → think → LLM decision → say → moveTo → pick → exit
   */
  async _processAgent(agentDef, startedAt = Date.now()) {
    // Spawn the agent if it wasn't pre-spawned during init
    let spriteId = this.spriteLookup.get(agentDef.id);
    if (!spriteId) {
      // Rolling spawn window around center.
      const idx = this._spawnCounter++;
      const spawnedId = await this._spawnAgent(agentDef, idx);
      spriteId = spawnedId || this.spriteLookup.get(agentDef.id) || agentDef.id;
    }

    this.onAgentUpdate({
      type: "agent.processing",
      agentId: agentDef.id,
      name: agentDef.name,
    });

    // 1. Simple short wander before decision.
    try {
      this.onAgentUpdate({
        type: "agent.wander",
        agentId: agentDef.id,
        spriteId,
        name: agentDef.name,
      });
      await this.runtime.wander(spriteId, {
        steps: 1 + Math.floor(Math.random() * 2),
      });
    } catch (err) {
      console.warn(
        `[ExperimentRunner] Wander failed for ${agentDef.name}:`,
        err,
      );
    }

    // 2. Show thinking indicator
    this.runtime.showThinking(spriteId);
    this.onAgentUpdate({
      type: "agent.thinking",
      agentId: agentDef.id,
      spriteId,
      name: agentDef.name,
    });

    let decision;
    try {
      // 3. Call LLM for decision (max 6 in parallel by default)
      decision = await this._runDecision(() =>
        getAgentDecision({
          agent: agentDef,
          alternatives: this.alternatives.map((a) => ({
            id: a.id,
            name: a.name,
            features: a.features || {},
          })),
          experiment: {
            name: this.experiment.name,
            description: this.experiment.description,
            featureSchema: this.experiment.featureSchema,
          },
          modelTag: agentDef.modelTag,
        }),
      );
    } finally {
      // 4. Clear thinking regardless of decision outcome
      this.runtime.clearThinking(spriteId);
    }

    const normalizedDecision = this._normalizeDecision(decision);

    const chosenAlt = this.alternatives.find(
      (a) => a.id === normalizedDecision.chosenAlternativeId,
    );
    const chosenOptionId = chosenAlt
      ? this.altToOptionId.get(chosenAlt.id)
      : null;

    if (normalizedDecision.error) {
      await this.runtime.say(
        spriteId,
        this._truncateText(normalizedDecision.reason || "Could not decide..."),
      );
      await this.runtime.exit(spriteId);
      this.responses.push({
        agentId: agentDef.id,
        segmentId: agentDef.segmentId,
        traits: agentDef.traits,
        chosenAlternativeId: null,
        chosenAlternativeName: null,
        chosen: "NONE",
        reason: normalizedDecision.reason || "No decision",
        confidence: 0,
        reasonCodes: [],
        error: true,
        timings: { startedAt, endedAt: Date.now() },
      });
      return;
    }

    if (normalizedDecision.chosenAlternativeId === "NONE") {
      this.onAgentUpdate({
        type: "agent.decided_none",
        agentId: agentDef.id,
        spriteId,
        name: agentDef.name,
        chosen: "None",
        reason: normalizedDecision.reason,
        confidence: normalizedDecision.confidence,
      });

      await this.runtime.say(
        spriteId,
        this._truncateText(normalizedDecision.reason),
      );
      await this.runtime.exit(spriteId);

      this.responses.push({
        agentId: agentDef.id,
        segmentId: agentDef.segmentId,
        traits: agentDef.traits,
        chosenAlternativeId: null,
        chosenAlternativeName: null,
        chosen: "NONE",
        reason: normalizedDecision.reason,
        confidence: normalizedDecision.confidence,
        reasonCodes: normalizedDecision.reasonCodes,
        error: false,
        timings: { startedAt, endedAt: Date.now() },
      });
      return;
    }

    this.onAgentUpdate({
      type: "agent.decided",
      agentId: agentDef.id,
      spriteId,
      name: agentDef.name,
      chosen:
        chosenAlt?.name || normalizedDecision.chosenAlternativeId || "None",
      reason: normalizedDecision.reason,
      confidence: normalizedDecision.confidence,
      warning: normalizedDecision.warning,
    });

    if (!chosenOptionId) {
      await this.runtime.say(
        spriteId,
        this._truncateText(
          `Could not map choice "${normalizedDecision.chosenAlternativeId}".`,
        ),
      );
      await this.runtime.exit(spriteId);

      this.responses.push({
        agentId: agentDef.id,
        segmentId: agentDef.segmentId,
        traits: agentDef.traits,
        chosenAlternativeId: null,
        chosenAlternativeName: null,
        chosen: "NONE",
        reason: `Invalid mapped choice: ${normalizedDecision.chosenAlternativeId}`,
        confidence: 0,
        reasonCodes: [],
        error: true,
        timings: { startedAt, endedAt: Date.now() },
      });
      return;
    }

    // 5. Say the reason
    await this.runtime.say(
      spriteId,
      this._truncateText(normalizedDecision.reason),
    );

    // 6. Move to chosen building
    await this.runtime.moveTo(spriteId, chosenOptionId);

    // 7. Pick from chosen building
    try {
      await this.runtime.pick(spriteId, chosenOptionId);
    } catch {
      // pick can fail if range is slightly off — not critical
    }

    // 8. Exit the world
    await this.runtime.exit(spriteId);

    // 9. Record the response
    const endedAt = Date.now();
    this.responses.push({
      agentId: agentDef.id,
      segmentId: agentDef.segmentId,
      traits: agentDef.traits,
      chosenAlternativeId: chosenAlt.id,
      chosenAlternativeName: chosenAlt.name,
      chosen: chosenAlt.id, // alias for aggregate compat
      reason: normalizedDecision.reason,
      confidence: normalizedDecision.confidence,
      reasonCodes: normalizedDecision.reasonCodes,
      error: false,
      timings: { startedAt, endedAt },
    });
  }

  // -----------------------------------------------------------------------
  // Abort
  // -----------------------------------------------------------------------

  abort() {
    this._aborted = true;
    this.status = RunnerStatus.ERROR;
    this._emitProgress();
  }

  // -----------------------------------------------------------------------
  // Results
  // -----------------------------------------------------------------------

  getResults() {
    return {
      responses: this.responses,
      agents: this.allAgents,
      alternatives: this.alternatives,
      experiment: this.experiment,
      totalAgents: this._totalCount,
      completedAgents: this._completedCount,
    };
  }

  // -----------------------------------------------------------------------
  // Internal
  // -----------------------------------------------------------------------

  _emitProgress() {
    this.onProgress({
      status: this.status,
      total: this._totalCount,
      completed: this._completedCount,
      active: this._activeCount,
      deciding: this._decidingCount,
      pending: this.agentQueue.length,
      optionsTotal: this._optionsTotal,
      optionsReady: this._optionsReady,
      optionsFailed: this._optionsFailed,
      initialSpawnTarget: this._initialSpawnTarget,
      initialSpawned: this._initialSpawned,
    });
  }

  async _runDecision(decisionTask) {
    return this.decisionLimiter.run(async () => {
      this._decidingCount++;
      this._emitProgress();
      try {
        return await decisionTask();
      } finally {
        this._decidingCount = Math.max(0, this._decidingCount - 1);
        this._emitProgress();
      }
    });
  }

  _normalizeDecision(decision) {
    const confidence = clamp(
      Number.parseFloat(decision?.confidence) || 0.5,
      0,
      1,
    );
    const reason = (decision?.reason || "I made a decision.").trim();
    const reasonCodes = Array.isArray(decision?.reasonCodes)
      ? decision.reasonCodes.filter((code) => typeof code === "string")
      : [];
    return {
      chosenAlternativeId: decision?.chosenAlternativeId || "NONE",
      reason,
      confidence,
      reasonCodes,
      error: decision?.error || null,
      warning: decision?.warning || null,
    };
  }

  _truncateText(text, maxLength = 60) {
    if (!text) return "...";
    if (text.length <= maxLength) return text;
    return `${text.slice(0, maxLength - 3)}...`;
  }
}
