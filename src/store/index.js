import { configureStore } from "@reduxjs/toolkit";
import experimentReducer from "./experimentSlice";
import runnerReducer from "./runnerSlice";
import resultsReducer from "./resultsSlice";

export const store = configureStore({
  reducer: {
    experiment: experimentReducer,
    runner: runnerReducer,
    results: resultsReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types (Firebase timestamps are not serializable)
        ignoredActions: [
          "experiment/setExperiment",
          "experiment/setAlternatives",
          "runner/initRun",
          "runner/setTasks",
          "runner/addResponse",
          "results/setCurrentRun",
          "results/setSummary",
          "results/setResponses",
          "results/setTasks",
        ],
        // Ignore these paths in the state
        ignoredPaths: [
          "experiment.current",
          "experiment.alternatives",
          "runner.currentRun",
          "runner.tasks",
          "runner.responses",
          "results.currentRun",
          "results.summary",
          "results.responses",
          "results.tasks",
        ],
      },
    }),
});

// Re-export actions for convenience
export * from "./experimentSlice";
export * from "./runnerSlice";
export * from "./resultsSlice";
