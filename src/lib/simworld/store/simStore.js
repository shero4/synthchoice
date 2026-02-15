import { createStore } from "redux";

import { SIM_STATUS } from "../config";

const initialState = {
  status: SIM_STATUS.IDLE,
  runId: null,
  speed: 1,
  isPaused: true,
  activeCharacterId: null,
  progress: { completed: 0, total: 0 },
  characters: {},
  taskQueues: {},
  responses: [],
  events: [],
};

const SET_RUNTIME_STATUS = "sim/SET_RUNTIME_STATUS";
const SET_RUN_ID = "sim/SET_RUN_ID";
const SET_SPEED = "sim/SET_SPEED";
const SET_ACTIVE_CHARACTER = "sim/SET_ACTIVE_CHARACTER";
const UPSERT_CHARACTER = "sim/UPSERT_CHARACTER";
const ENQUEUE_TASK = "sim/ENQUEUE_TASK";
const SHIFT_TASK = "sim/SHIFT_TASK";
const ADD_RESPONSE = "sim/ADD_RESPONSE";
const SET_PROGRESS = "sim/SET_PROGRESS";
const APPEND_EVENT = "sim/APPEND_EVENT";
const CLEAR_SIMULATION = "sim/CLEAR_SIMULATION";
const HYDRATE_SIMULATION = "sim/HYDRATE_SIMULATION";

function reducer(state = initialState, action) {
  switch (action.type) {
    case SET_RUNTIME_STATUS:
      return {
        ...state,
        status: action.payload.status,
        isPaused: action.payload.isPaused,
      };
    case SET_RUN_ID:
      return { ...state, runId: action.payload };
    case SET_SPEED:
      return { ...state, speed: action.payload };
    case SET_ACTIVE_CHARACTER:
      return { ...state, activeCharacterId: action.payload };
    case UPSERT_CHARACTER:
      return {
        ...state,
        characters: {
          ...state.characters,
          [action.payload.id]: {
            ...(state.characters[action.payload.id] || {}),
            ...action.payload,
          },
        },
      };
    case ENQUEUE_TASK: {
      const queue = state.taskQueues[action.payload.characterId] || [];
      const nextQueue = [...queue, action.payload.task];
      const taskCount =
        Object.values(state.taskQueues).reduce(
          (sum, entries) => sum + entries.length,
          0,
        ) + 1;
      return {
        ...state,
        taskQueues: {
          ...state.taskQueues,
          [action.payload.characterId]: nextQueue,
        },
        progress: {
          ...state.progress,
          total: taskCount + state.responses.length,
        },
      };
    }
    case SHIFT_TASK: {
      const queue = state.taskQueues[action.payload] || [];
      const [, ...rest] = queue;
      return {
        ...state,
        taskQueues: {
          ...state.taskQueues,
          [action.payload]: rest,
        },
      };
    }
    case ADD_RESPONSE:
      return {
        ...state,
        responses: [...state.responses, action.payload],
        progress: {
          ...state.progress,
          completed: state.responses.length + 1,
        },
      };
    case SET_PROGRESS:
      return { ...state, progress: action.payload };
    case APPEND_EVENT:
      return {
        ...state,
        events: [...state.events, action.payload].slice(-200),
      };
    case CLEAR_SIMULATION:
      return {
        ...initialState,
        status: SIM_STATUS.READY,
      };
    case HYDRATE_SIMULATION:
      return {
        ...initialState,
        ...action.payload,
      };
    default:
      return state;
  }
}

export const simActions = {
  setRuntimeStatus: (status, isPaused = false) => ({
    type: SET_RUNTIME_STATUS,
    payload: { status, isPaused },
  }),
  setRunId: (runId) => ({ type: SET_RUN_ID, payload: runId }),
  setSpeed: (speed) => ({ type: SET_SPEED, payload: speed }),
  setActiveCharacter: (characterId) => ({
    type: SET_ACTIVE_CHARACTER,
    payload: characterId,
  }),
  upsertCharacter: (character) => ({
    type: UPSERT_CHARACTER,
    payload: character,
  }),
  enqueueTask: (characterId, task) => ({
    type: ENQUEUE_TASK,
    payload: { characterId, task },
  }),
  shiftTask: (characterId) => ({ type: SHIFT_TASK, payload: characterId }),
  addResponse: (response) => ({ type: ADD_RESPONSE, payload: response }),
  setProgress: (progress) => ({ type: SET_PROGRESS, payload: progress }),
  appendEvent: (event) => ({ type: APPEND_EVENT, payload: event }),
  clearSimulation: () => ({ type: CLEAR_SIMULATION }),
  hydrateSimulation: (snapshotState) => ({
    type: HYDRATE_SIMULATION,
    payload: snapshotState,
  }),
};

export function configureSimStore(preloadedState = undefined) {
  return createStore(reducer, preloadedState || initialState);
}

export const simSelectors = {
  state: (store) => store.getState(),
  taskQueue: (store, characterId) =>
    store.getState().taskQueues[characterId] || [],
  hasPendingTasks: (store) =>
    Object.values(store.getState().taskQueues).some(
      (queue) => Array.isArray(queue) && queue.length > 0,
    ),
};
