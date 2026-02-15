/**
 * ExperimentRunner — orchestrates a live experiment run in SimWorld.
 *
 * Phases:
 *   1. init()  — load options (buildings), generate agent queue
 *   2. start() — rolling-window execution: spawn → think → decide → move → pick → exit
 *
 * All results are kept in memory. The caller saves to Firebase when ready.
 */

import { getAgentDecision } from "@/app/experiments/[experimentId]/run/actions";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
    concurrency = 10,
  }) {
    this.runtime = runtime;
    this.experiment = experiment;
    this.alternatives = alternatives || [];
    this.onProgress = onProgress || (() => {});
    this.onAgentUpdate = onAgentUpdate || (() => {});
    this.onComplete = onComplete || (() => {});
    this.concurrency = concurrency;

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

    /** Abort flag */
    this._aborted = false;
  }

  // -----------------------------------------------------------------------
  // Phase 1 — Initialization
  // -----------------------------------------------------------------------

  async init() {
    this.status = RunnerStatus.INITIALIZING;

    // 1. Add each alternative as a building/option in SimWorld
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
    const expandedAgents = expandSegmentsToAgents(segments);

    // Shuffle so segments are interleaved
    this.allAgents = shuffle(expandedAgents);
    this.agentQueue = [...this.allAgents];
    this._totalCount = this.agentQueue.length;
    this._completedCount = 0;

    // 3. Pre-spawn ALL agents around the central fountain area
    //    Scatter them in a cluster so they look like a crowd
    const cx = 656; // SPAWN_POINT.x (center of 1280 world)
    const cy = 400; // SPAWN_POINT.y (center of 800 world)

    for (let i = 0; i < this.allAgents.length; i++) {
      const agentDef = this.allAgents[i];

      // Arrange in concentric rings around center
      const ring = Math.floor(i / 8); // 8 agents per ring
      const slot = i % 8;
      const angle = (slot / 8) * 2 * Math.PI + ring * 0.4; // stagger each ring
      const radius = 30 + ring * 22; // start 30px out, each ring 22px further
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
      } catch (err) {
        console.warn(`[ExperimentRunner] Failed to spawn ${agentDef.name}:`, err);
      }
    }

    this.status = RunnerStatus.READY;

    this._emitProgress();
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

        const p = this._processAgent(agentDef)
          .catch((err) => {
            console.error(`[ExperimentRunner] Agent ${agentDef.name} failed:`, err);
            this.responses.push({
              agentId: agentDef.id,
              segmentId: agentDef.segmentId,
              traits: agentDef.traits,
              chosenAlternativeId: null,
              chosenAlternativeName: null,
              reason: `Error: ${err.message}`,
              confidence: 0,
              reasonCodes: [],
              error: true,
              timings: { startedAt: Date.now(), endedAt: Date.now() },
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
   * think → LLM decision → say → moveTo → pick → exit
   * (agents are already spawned during init)
   */
  async _processAgent(agentDef) {
    const startedAt = Date.now();

    // Look up the pre-spawned sprite
    const spriteId = this.spriteLookup.get(agentDef.id) || agentDef.id;

    this.onAgentUpdate({
      type: "agent.processing",
      agentId: agentDef.id,
      name: agentDef.name,
    });

    // 1. Show thinking indicator
    this.runtime.showThinking(spriteId);

    // 2. Call LLM for decision
    const decision = await getAgentDecision({
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
    });

    // 3. Clear thinking
    this.runtime.clearThinking(spriteId);

    const chosenAlt = this.alternatives.find(
      (a) => a.id === decision.chosenAlternativeId,
    );
    const chosenOptionId = chosenAlt
      ? this.altToOptionId.get(chosenAlt.id)
      : null;

    this.onAgentUpdate({
      type: "agent.decided",
      agentId: agentDef.id,
      name: agentDef.name,
      chosen: chosenAlt?.name || "None",
      reason: decision.reason,
      confidence: decision.confidence,
      error: decision.error || null,
    });

    if (decision.error || !chosenOptionId) {
      // LLM failed — say error, then exit
      await this.runtime.say(spriteId, decision.error || "Could not decide...");
      await this.runtime.exit(spriteId);

      this.responses.push({
        agentId: agentDef.id,
        segmentId: agentDef.segmentId,
        traits: agentDef.traits,
        chosenAlternativeId: null,
        chosenAlternativeName: null,
        reason: decision.error || "No decision",
        confidence: 0,
        reasonCodes: [],
        error: true,
        timings: { startedAt, endedAt: Date.now() },
      });
      return;
    }

    // 4. Say the reason
    const reasonText =
      decision.reason.length > 60
        ? `${decision.reason.slice(0, 57)}...`
        : decision.reason;
    await this.runtime.say(spriteId, reasonText);

    // 5. Move to chosen building
    await this.runtime.moveTo(spriteId, chosenOptionId);

    // 6. Pick item if visual exists
    const option = this.runtime.optionsMap.get(chosenOptionId);
    if (option?.visual?.spriteSheetDataUrl) {
      try {
        await this.runtime.pick(spriteId, chosenOptionId);
      } catch {
        // pick can fail if range is slightly off — not critical
      }
    }

    // 7. Exit the world
    await this.runtime.exit(spriteId);

    // 8. Record the response
    const endedAt = Date.now();
    this.responses.push({
      agentId: agentDef.id,
      segmentId: agentDef.segmentId,
      traits: agentDef.traits,
      chosenAlternativeId: chosenAlt.id,
      chosenAlternativeName: chosenAlt.name,
      chosen: chosenAlt.id, // alias for aggregate compat
      reason: decision.reason,
      confidence: decision.confidence,
      reasonCodes: decision.reasonCodes || [],
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
      pending: this.agentQueue.length,
    });
  }
}
