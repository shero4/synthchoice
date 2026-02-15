import { createSlice } from "@reduxjs/toolkit";

/**
 * Runner slice - manages the active run state
 */

const initialState = {
  // Current run data
  currentRun: null,
  // Generated tasks
  tasks: [],
  // Responses collected
  responses: [],
  // Current task index being processed
  currentTaskIndex: 0,
  // Current agent being processed
  currentAgent: null,
  // Run status
  status: "idle", // idle | preparing | running | paused | complete | failed
  // Progress tracking
  progress: {
    totalTasks: 0,
    completedTasks: 0,
  },
  // Error state
  error: null,
};

const runnerSlice = createSlice({
  name: "runner",
  initialState,
  reducers: {
    // Initialize a new run
    initRun: (state, action) => {
      state.currentRun = action.payload;
      state.tasks = [];
      state.responses = [];
      state.currentTaskIndex = 0;
      state.currentAgent = null;
      state.status = "preparing";
      state.progress = { totalTasks: 0, completedTasks: 0 };
      state.error = null;
    },
    // Set tasks
    setTasks: (state, action) => {
      state.tasks = action.payload;
      state.progress.totalTasks = action.payload.length;
    },
    // Start running
    startRun: (state) => {
      state.status = "running";
    },
    // Pause run
    pauseRun: (state) => {
      state.status = "paused";
    },
    // Resume run
    resumeRun: (state) => {
      state.status = "running";
    },
    // Set current agent
    setCurrentAgent: (state, action) => {
      state.currentAgent = action.payload;
    },
    // Set current task index
    setCurrentTaskIndex: (state, action) => {
      state.currentTaskIndex = action.payload;
    },
    // Add a response
    addResponse: (state, action) => {
      state.responses.push(action.payload);
      state.progress.completedTasks = state.responses.length;
    },
    // Complete the run
    completeRun: (state) => {
      state.status = "complete";
    },
    // Fail the run
    failRun: (state, action) => {
      state.status = "failed";
      state.error = action.payload;
    },
    // Reset runner state
    resetRunner: (state) => {
      return initialState;
    },
    // Update progress
    updateProgress: (state, action) => {
      state.progress = { ...state.progress, ...action.payload };
    },
  },
});

export const {
  initRun,
  setTasks,
  startRun,
  pauseRun,
  resumeRun,
  setCurrentAgent,
  setCurrentTaskIndex,
  addResponse,
  completeRun,
  failRun,
  resetRunner,
  updateProgress,
} = runnerSlice.actions;

export default runnerSlice.reducer;
