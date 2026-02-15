# SynthChoice

**Simulate minds, Predict decisions.**

A choice-based experiment simulator for conjoint analysis and decision modeling. Built with Next.js, Firebase, Ant Design, and Redux Toolkit.

## Overview

SynthChoice lets you:

1. **Setup experiments** - Define feature schemas, add alternatives, configure agent segments
2. **Run simulations** - Watch agents evaluate and choose between alternatives
3. **Analyze results** - View choice shares, feature importance, and validation metrics

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **UI Library:** Ant Design
- **State Management:** Redux Toolkit
- **Backend:** Firebase (Firestore + Auth + Storage)
- **Language:** JavaScript (no TypeScript)

## Getting Started

### Prerequisites

- Node.js 18+
- Firebase project with Firestore and Anonymous Auth enabled

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd synthchoice

# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

### Firebase Setup

1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable **Firestore Database**
3. Enable **Anonymous Authentication** in Authentication > Sign-in methods
4. Update the config in `src/lib/firebase/client.js` with your project credentials

## Project Structure

```
src/
├── app/                          # Next.js App Router pages
│   ├── layout.js                 # Root layout (AntD + Redux providers)
│   ├── page.js                   # Home - experiment list
│   └── experiments/
│       ├── new/page.js           # Create experiment (multi-step form)
│       └── [experimentId]/
│           ├── page.js           # Experiment detail/overview
│           ├── run/page.js       # Run simulation
│           └── results/[runId]/page.js  # View results
│
├── components/
│   ├── layout/                   # App shell components
│   │   ├── AppHeader.js          # Navigation header
│   │   └── AppLayout.js          # Main layout wrapper
│   ├── experiment/               # Experiment setup components
│   │   ├── FeatureSchemaBuilder.js
│   │   ├── AlternativesInput.js
│   │   ├── AlternativesTable.js
│   │   ├── AgentSegmentsBuilder.js
│   │   └── TaskPlanPanel.js
│   ├── runner/                   # Simulation runner components
│   │   ├── RunnerController.js
│   │   ├── AgentSprite.js
│   │   ├── ThingSprite.js
│   │   ├── TaskPreview.js
│   │   └── ProgressBar.js
│   └── results/                  # Results visualization components
│       ├── SharesPanel.js
│       ├── SegmentBreakdown.js
│       ├── FeatureImportancePanel.js
│       └── ValidationPanel.js
│
├── lib/
│   ├── firebase/                 # Firebase client and helpers
│   │   ├── client.js             # Firebase initialization
│   │   ├── auth.js               # Authentication helpers
│   │   ├── db.js                 # Firestore CRUD operations
│   │   └── storage.js            # Storage helpers
│   ├── domain/                   # Business logic
│   │   ├── schema.js             # Feature schema validation
│   │   ├── normalize.js          # Input parsing/normalization
│   │   ├── taskgen.js            # Task generation
│   │   ├── simulate.js           # Stub decision engine
│   │   ├── aggregate.js          # Results computation
│   │   └── validate.js           # Validation helpers
│   └── sprites/                  # Sprite utilities
│       └── index.js
│
├── store/                        # Redux Toolkit store
│   ├── index.js                  # Store configuration
│   ├── experimentSlice.js        # Experiment state
│   ├── runnerSlice.js            # Runner state
│   ├── resultsSlice.js           # Results state
│   └── StoreProvider.js          # React provider
│
├── models/
│   └── firestore.js              # Data model definitions (JSDoc)
│
public/
└── sprites/
    ├── agents/                   # Agent sprite images
    └── things/                   # Alternative sprite images
```

## Key Concepts

### Experiment

A complete study configuration containing:
- **Feature Schema** - Defines features (continuous, categorical, binary)
- **Alternatives** - Options that agents choose between
- **Agent Plan** - Segments with agent counts and traits
- **Task Plan** - Tasks per agent, holdouts, repeats

### Agent Segments

Groups of simulated respondents with shared traits:
- Location, personality type
- Price sensitivity (0-1)
- Risk tolerance (0-1)
- Consistency (0-1)

### Choice Tasks

Each task presents 2-3 alternatives (A/B or A/B/C format) with optional "None" choice. Tasks can be marked as:
- **Regular** - Standard choice tasks
- **Holdout** - Reserved for validation accuracy
- **Repeat** - Duplicates to measure consistency

### Decision Engine

v1 uses a **stub simulator** that:
1. Calculates utility scores based on features and agent traits
2. Adds noise based on agent consistency
3. Selects the highest-scoring alternative
4. Returns reason codes for top contributing features

Future versions can swap in LLM-based simulation.

## Firestore Data Model

### Collections

```
experiments/{experimentId}
├── alternatives/{alternativeId}
├── agents/{agentId}              # Optional - generated at runtime
└── runs/{runId}
    ├── tasks/{taskId}
    ├── responses/{responseId}
    └── resultsSummary/v1
```

### Experiment Document

```javascript
{
  name: "Pricing Plan Test",
  description: "",
  ownerUid: "firebase-uid",
  status: "draft" | "ready" | "archived",
  choiceFormat: "AB" | "ABC" | "AB_NONE" | "ABC_NONE",
  featureSchema: {
    version: 1,
    features: [
      { key: "price", label: "Price", type: "continuous", unit: "INR", min: 0, max: 100000 },
      { key: "warranty", label: "Warranty", type: "categorical", categories: ["6m", "12m", "24m"] },
      { key: "has_api", label: "Has API", type: "binary" }
    ]
  },
  agentPlan: {
    totalAgents: 60,
    segments: [
      {
        segmentId: "delhi_price_sensitive",
        label: "Delhi price-sensitive",
        count: 20,
        traits: { location: "Delhi", personality: "ENTJ", priceSensitivity: 0.9, riskTolerance: 0.3, consistency: 0.7 }
      }
    ]
  },
  taskPlan: {
    tasksPerAgent: 20,
    randomizeOrder: true,
    includeHoldouts: 2,
    includeRepeats: 2
  },
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### Response Document

```javascript
{
  taskId: "task123",
  agentId: "agent123",
  chosen: "altA" | "NONE",
  confidence: 0.72,
  reasonCodes: ["price", "warranty"],
  explanation: "Picked A due to lower price and better warranty.",
  timings: { startedAt: timestamp, endedAt: timestamp },
  createdAt: timestamp
}
```

### Results Summary

```javascript
{
  computedAt: timestamp,
  shares: {
    overall: { "altA": 0.52, "altB": 0.48 },
    bySegment: { "delhi_price_sensitive": { "altA": 0.70, "altB": 0.30 } }
  },
  featureImportance: {
    overall: { "price": 0.45, "warranty": 0.25, "has_api": 0.30 },
    bySegment: { ... }
  },
  validation: {
    holdoutAccuracy: 0.68,
    repeatConsistency: 0.74
  }
}
```

## Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run Biome linter
npm run format   # Format code with Biome
```

## Roadmap

- [ ] LLM-based decision engine (BYO API key)
- [ ] Alternative normalization via LLM
- [ ] Export results to CSV/JSON
- [ ] Advanced analytics (logit models)
- [ ] Sprite image generation
- [ ] Team collaboration features

## License

MIT
