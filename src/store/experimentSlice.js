import { createSlice } from "@reduxjs/toolkit";
import { createDefaultExperiment } from "@/models/firestore";

/**
 * Experiment slice - manages the current experiment being edited/viewed
 */

const initialState = {
  // Current experiment data
  current: null,
  // Alternatives for current experiment
  alternatives: [],
  // Loading states
  loading: false,
  saving: false,
  error: null,
  // Form state for new experiment (multi-step)
  draft: null,
  currentStep: 0,
};

const experimentSlice = createSlice({
  name: "experiment",
  initialState,
  reducers: {
    // Set loading state
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    // Set saving state
    setSaving: (state, action) => {
      state.saving = action.payload;
    },
    // Set error
    setError: (state, action) => {
      state.error = action.payload;
    },
    // Load an experiment
    setExperiment: (state, action) => {
      state.current = action.payload;
      state.loading = false;
      state.error = null;
    },
    // Clear current experiment
    clearExperiment: (state) => {
      state.current = null;
      state.alternatives = [];
      state.error = null;
    },
    // Set alternatives
    setAlternatives: (state, action) => {
      state.alternatives = action.payload;
    },
    // Add an alternative
    addAlternative: (state, action) => {
      state.alternatives.push(action.payload);
    },
    // Update an alternative
    updateAlternative: (state, action) => {
      const { id, data } = action.payload;
      const index = state.alternatives.findIndex((a) => a.id === id);
      if (index !== -1) {
        state.alternatives[index] = { ...state.alternatives[index], ...data };
      }
    },
    // Remove an alternative
    removeAlternative: (state, action) => {
      state.alternatives = state.alternatives.filter(
        (a) => a.id !== action.payload
      );
    },
    // Initialize draft for new experiment
    initDraft: (state, action) => {
      state.draft = createDefaultExperiment(action.payload); // payload is ownerUid
      state.currentStep = 0;
    },
    // Update draft fields
    updateDraft: (state, action) => {
      if (state.draft) {
        state.draft = { ...state.draft, ...action.payload };
      }
    },
    // Update feature schema in draft
    updateDraftFeatureSchema: (state, action) => {
      if (state.draft) {
        state.draft.featureSchema = action.payload;
      }
    },
    // Update agent plan in draft
    updateDraftAgentPlan: (state, action) => {
      if (state.draft) {
        state.draft.agentPlan = action.payload;
      }
    },
    // Update agent config in draft (simplified config)
    updateDraftAgentConfig: (state, action) => {
      if (state.draft) {
        state.draft.agentConfig = action.payload;
      }
    },
    // Set current step
    setCurrentStep: (state, action) => {
      state.currentStep = action.payload;
    },
    // Next step
    nextStep: (state) => {
      state.currentStep += 1;
    },
    // Previous step
    prevStep: (state) => {
      if (state.currentStep > 0) {
        state.currentStep -= 1;
      }
    },
    // Clear draft
    clearDraft: (state) => {
      state.draft = null;
      state.currentStep = 0;
    },
  },
});

export const {
  setLoading,
  setSaving,
  setError,
  setExperiment,
  clearExperiment,
  setAlternatives,
  addAlternative,
  updateAlternative,
  removeAlternative,
  initDraft,
  updateDraft,
  updateDraftFeatureSchema,
  updateDraftAgentPlan,
  updateDraftAgentConfig,
  setCurrentStep,
  nextStep,
  prevStep,
  clearDraft,
} = experimentSlice.actions;

export default experimentSlice.reducer;
