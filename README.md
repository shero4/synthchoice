Name: SynthChoice
Tagline: Simulate minds, Predict decisions.

# LLM Choice Simulation + Conjoint (Frontend-only) — Build Plan (Next.js + Firebase)

This repo is a **frontend-only** Next.js app that lets users:

1. **Setup an experiment** (feature schema + alternatives normalization + agent segments + task plan)
2. **Run the experiment** (simulate agents picking between alternatives, show sprites)
3. **View results** (shares, segment breakdown, feature importance, validation metrics)

Backend: **Firebase (Firestore + Storage + Auth)**.  
No TypeScript (JavaScript only).

---

## 1) Concept Overview (What we are building)

We’re building a **choice-based experiment simulator**.

- Users define “things” (alternatives) with **features** (price, warranty, etc).
- Users define “agents” (personas: ENTJ, SF/Delhi, price sensitivity, etc).
- System generates **choice tasks** (A/B or A/B/C with optional None).
- Agents (LLM or stub utility engine) produce **choices** + optional reason codes.
- We aggregate responses and compute **decision outputs**:
  - choice shares
  - feature importance
  - segment differences
  - holdout accuracy and repeat consistency (validation)

This is inspired by discrete choice modeling / conjoint analysis, but **v1 is a clean simulator + basic analytics**. A proper logit/HB model can be added later.

---

## 2) Terminology (Shared language)

**Experiment**

- One complete study configuration.
- Contains schema, alternatives, agents plan, task plan.

**Alternative / Thing**

- A single option that agents can choose (Plan A, UI Variant B).
- Stored as a row of typed features.

**Feature Schema**

- Defines each feature: name, type, constraints.
- Types: `continuous`, `categorical`, `binary`.

**Normalization**

- Converting raw alternative data (text/json/csv paste) into structured features matching schema.
- v1 supports manual mapping and/or LLM normalization (BYO API key client-side).

**Agent**

- A simulated respondent with traits (location, personality, priceSensitivity, etc).
- Also has a sprite seed/style.

**Segment**

- A group of agents (e.g., “Delhi price-sensitive”, “SF early adopter”).
- Segments define agent counts and trait defaults.

**Task / Choice Task**

- One question shown to an agent: choose between A/B (or A/B/C, optional None).
- A task references alternatives and their display order.

**Response**

- The agent’s choice result for a task:
  - chosen alternative (or NONE)
  - confidence (optional)
  - reasonCodes (optional)
  - short explanation (optional)

**Run**

- One execution of an experiment producing responses.
- You can run the same experiment multiple times.

**Results**

- Aggregations computed from responses:
  - shares overall + by segment
  - feature importance
  - validation metrics

**Sprite**

- Visual representation of agent and/or alternative.
- Deterministic via seed + style; optionally stored image in Firebase Storage.

---

## 3) Product Flow (3 Pages)

### Page 1 — Experiment Setup

Route: `/experiments/new`

Goal: create an Experiment:

- Basics: name, choice format
- Feature schema builder
- Alternatives input + normalization into table
- Agent segments (counts + traits)
- Task plan: tasks/agent, holdouts, repeats, randomization

Saved to Firestore:

- experiment doc
- alternatives subcollection
- (optional) agents subcollection OR generate agents at run time

---

### Page 2 — Experiment Runner

Route: `/experiments/[experimentId]/run`

Goal: create a Run and generate responses:

- Create run doc
- Generate tasks
- For each agent:
  - show agent sprite “thinking”
  - pick between alternatives for each task
  - store response

Decision engine:

- v1: **stubbed** (rule-based or utility scoring)
- v1.5+: LLM calls with BYO API key (client-side)

Saved to Firestore:

- run doc
- tasks subcollection
- responses subcollection

---

### Page 3 — Results

Route: `/experiments/[experimentId]/results/[runId]`

Goal: show analysis:

- Shares overall + by segment
- Feature importance (simple v1; advanced later)
- Validation metrics:
  - holdout accuracy
  - repeat consistency

Saved to Firestore (optional):

- results summary doc for caching

---

## 4) Implementation Principles (Keep it simple, reproducible)

### Strict structured outputs

Even if using an LLM, responses must conform to:

- `chosen`: alternativeId or "NONE"
- `confidence`: 0..1 (optional)
- `reasonCodes`: array of feature keys (optional)
- `explanation`: short string (optional)

### Randomization to avoid bias

- Randomize alternative order in tasks (prevents “left option” bias)
- Include repeats to measure consistency
- Include holdouts to measure generalization

### Reproducibility

Store:

- experiment config snapshot in run doc
- sprite seeds
- task definitions
  So you can rerun and compare.

---

## 5) Next.js App Structure (JavaScript, App Router)

> This matches a clean 3-person async workflow: Setup / Runner+Sprites / Results.

### Suggested folder tree

/app
/layout.js
/page.js # Home: list experiments + create new
/experiments
/new
/page.js # Page 1: setup + normalization
/[experimentId]
/page.js # Experiment overview
/run
/page.js # Page 2: runner
/results
/[runId]
/page.js # Page 3: results

/components
/ui # generic UI atoms: Button, Card, Modal, etc.
/experiment
FeatureSchemaBuilder.js
AlternativesInput.js
AlternativesTable.js
AgentSegmentsBuilder.js
TaskPlanPanel.js
/runner
RunnerController.js
AgentSprite.js
ThingSprite.js
TaskPreview.js
ProgressBar.js
/results
SharesPanel.js
SegmentBreakdown.js
FeatureImportancePanel.js
ValidationPanel.js

/lib
/firebase
client.js # firebase init
auth.js # auth helpers (anon login)
db.js # Firestore helpers (CRUD)
storage.js # Storage helpers for sprites/assets
/domain
schema.js # feature schema helpers
normalize.js # raw -> structured alternatives + validation
encode.js # convert categorical/binary to model-friendly formats (future)
taskgen.js # generate tasks (A/B or A/B/C)
simulate.js # stub decision engine (v1)
aggregate.js # compute shares + importance + validation
validate.js # checks for schema, features, responses
/sprites
seed.js # deterministic seed helpers
generator.js # sprite params generation (no image)
render.js # optional canvas render -> png
/state
experimentStore.js # optional (Zustand) for page state
runnerStore.js
resultsStore.js

/public
/sprites # optional static assets
/icons

/docs
PLAN.md # this file (copy/paste)

### Ownership split (async-friendly)

- **Member A (Setup):** `/app/experiments/new` + `/components/experiment` + `/lib/domain/normalize.js`
- **Member B (Runner + Sprites):** `/app/.../run` + `/components/runner` + `/lib/sprites/*` + `/lib/domain/simulate.js`
- **Member C (Results):** `/app/.../results` + `/components/results` + `/lib/domain/aggregate.js`

---

## 6) Firebase Data Model (Firestore + Storage)

Use:

- Firestore for configs, tasks, responses, results
- Storage for sprite images (optional)
- Auth anonymous for v1 (upgrade later)

### Collections layout

#### `experiments/{experimentId}`

```js
{
  name: "Pricing Plan Test",
  description: "",
  ownerUid: "uid",
  status: "draft" | "ready" | "archived",
  choiceFormat: "AB" | "ABC" | "AB_NONE" | "ABC_NONE",

  featureSchema: {
    version: 1,
    features: [
      {
        key: "price",
        label: "Price",
        type: "continuous",          // continuous | categorical | binary
        unit: "INR",
        min: 0,
        max: 100000
      },
      {
        key: "warranty",
        label: "Warranty",
        type: "categorical",
        categories: ["6m","12m","24m"]
      },
      {
        key: "has_api",
        label: "Has API",
        type: "binary"
      }
    ]
  },

  normalization: {
    mode: "manual" | "llm",
    notes: "",
    lastNormalizedAt: null
  },

  agentPlan: {
    totalAgents: 60,
    segments: [
      {
        segmentId: "delhi_price_sensitive",
        label: "Delhi price-sensitive",
        count: 20,
        traits: {
          location: "Delhi",
          personality: "ENTJ",
          priceSensitivity: 0.9,     // 0..1
          riskTolerance: 0.3,        // 0..1
          consistency: 0.7          // 0..1
        },
        modelTag: "gpt"
      }
    ]
  },

  taskPlan: {
    tasksPerAgent: 20,
    randomizeOrder: true,
    includeHoldouts: 2,             // count
    includeRepeats: 2               // count
  },

  createdAt: timestamp,
  updatedAt: timestamp
}
experiments/{experimentId}/alternatives/{alternativeId}
{
  name: "Plan A",
  rawInput: "original text block",
  features: {
    price: 499,
    warranty: "12m",
    has_api: true
  },
  display: {
    title: "Plan A",
    bullets: ["Fast setup", "12m warranty", "API included"]
  },
  sprite: {
    seed: "abc123",
    style: "pixel",
    storagePath: "experiments/X/sprites/things/Y.png"
  },
  createdAt: timestamp,
  updatedAt: timestamp
}
experiments/{experimentId}/agents/{agentId} (optional in v1)
{
  segmentId: "delhi_price_sensitive",
  label: "Agent #12",
  traits: {
    location: "Delhi",
    personality: "ENTJ",
    priceSensitivity: 0.9,
    riskTolerance: 0.3,
    consistency: 0.7
  },
  modelTag: "gpt",
  sprite: { seed: "seed12", style: "pixel", storagePath: "" },
  createdAt: timestamp
}
experiments/{experimentId}/runs/{runId}
{
  experimentId: "exp123",
  status: "running" | "paused" | "complete" | "failed",
  startedAt: timestamp,
  completedAt: null,

  configSnapshot: {
    featureSchemaVersion: 1,
    choiceFormat: "AB",
    agentPlan: { ... },             // copy minimal settings
    taskPlan: { ... }
  },

  progress: {
    totalTasks: 1200,
    completedTasks: 0
  }
}
experiments/{experimentId}/runs/{runId}/tasks/{taskId}
{
  agentId: "agent123",
  shownAlternatives: ["altA","altB"],  // ordered as shown
  isHoldout: false,
  isRepeatOf: null,
  createdAt: timestamp
}
experiments/{experimentId}/runs/{runId}/responses/{responseId}
{
  taskId: "task123",
  agentId: "agent123",

  chosen: "altA" | "altB" | "altC" | "NONE",
  confidence: 0.72,
  reasonCodes: ["price","warranty"],
  explanation: "Picked A due to lower price and better warranty.",

  timings: { startedAt: timestamp, endedAt: timestamp },
  createdAt: timestamp
}
experiments/{experimentId}/runs/{runId}/resultsSummary/v1
{
  computedAt: timestamp,
  shares: {
    overall: { "altA": 0.52, "altB": 0.48 },
    bySegment: {
      "delhi_price_sensitive": { "altA": 0.70, "altB": 0.30 }
    }
  },
  featureImportance: {
    overall: { "price": 0.45, "warranty": 0.25, "has_api": 0.30 },
    bySegment: {
      "delhi_price_sensitive": { "price": 0.62, "warranty": 0.20, "has_api": 0.18 }
    }
  },
  validation: {
    holdoutAccuracy: 0.68,
    repeatConsistency: 0.74
  }
}

7) Firebase Storage (Sprites)

If generating sprite images:

Store at:

experiments/{experimentId}/sprites/agents/{agentId}.png

experiments/{experimentId}/sprites/things/{alternativeId}.png

If not generating images:

store only seed + style and render on canvas at runtime.

8) v1 Decision Engine (No backend required)

Because this is frontend-only:

v1 uses a stub simulator:

compute a score from features + agent traits

add noise based on consistency

choose max score

reasonCodes = top contributing features

explanation is optional (can be templated)

Later:

swap simulate.js to call LLM (BYO API key) and enforce strict JSON output.

9) v1 Results Computation (Simple, usable)

Compute from responses:

Shares: % chosen per alternative overall and by segment

Feature importance (simple v1):

For each feature, compare choice rates when feature is “better” vs “worse”

or run a lightweight regression client-side later

Validation metrics:

holdout accuracy: how often the model predicts holdout choices (if you implement prediction)

repeat consistency: how often same agent picks same option on repeat tasks

Store results summary doc for caching.

10) Minimal Milestones (Cursor should scaffold these)
Milestone A — Base skeleton

routes created for the 3 pages

firebase client initialized

Firestore CRUD helpers

basic nav + experiment list on home

Milestone B — Setup page

feature schema builder UI

alternatives input + normalization validation

agent segments builder UI

task plan UI

save everything into Firestore

Milestone C — Runner page

create run doc

generate tasks

run stub simulator and write responses

sprite components wired (seed-based)

Milestone D — Results page

read responses

compute shares + feature importance + validation

render basic charts/cards

write results summary doc

11) Notes / Constraints

JavaScript only (no TS).

No backend server for v1.

LLM calls are optional and should be BYO key if used client-side.

Keep all outputs structured; avoid freeform-only storage.
```
