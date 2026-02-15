import { createSlice } from "@reduxjs/toolkit";

/**
 * Results slice - manages loaded results data
 */

const initialState = {
  // Current run being viewed
  currentRun: null,
  // Results summary
  summary: null,
  // Raw responses (for detailed analysis)
  responses: [],
  // Tasks (for context)
  tasks: [],
  // Loading state
  loading: false,
  // Computing state (when calculating results)
  computing: false,
  // Error state
  error: null,
};

const resultsSlice = createSlice({
  name: "results",
  initialState,
  reducers: {
    // Set loading state
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    // Set computing state
    setComputing: (state, action) => {
      state.computing = action.payload;
    },
    // Set error
    setError: (state, action) => {
      state.error = action.payload;
      state.loading = false;
      state.computing = false;
    },
    // Set current run
    setCurrentRun: (state, action) => {
      state.currentRun = action.payload;
    },
    // Set results summary
    setSummary: (state, action) => {
      state.summary = action.payload;
      state.loading = false;
    },
    // Set responses
    setResponses: (state, action) => {
      state.responses = action.payload;
    },
    // Set tasks
    setTasks: (state, action) => {
      state.tasks = action.payload;
    },
    // Clear results
    clearResults: (state) => {
      return initialState;
    },
  },
});

export const {
  setLoading,
  setComputing,
  setError,
  setCurrentRun,
  setSummary,
  setResponses,
  setTasks,
  clearResults,
} = resultsSlice.actions;

export default resultsSlice.reducer;
