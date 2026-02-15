import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./client";

// ============================================================================
// EXPERIMENTS
// ============================================================================

/**
 * Get all experiments for a user
 * @param {string} ownerUid
 * @returns {Promise<Array>}
 */
export async function getExperiments(ownerUid) {
  const q = query(
    collection(db, "experiments"),
    where("ownerUid", "==", ownerUid),
    orderBy("createdAt", "desc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Get a single experiment by ID
 * @param {string} experimentId
 * @returns {Promise<Object | null>}
 */
export async function getExperiment(experimentId) {
  const docRef = doc(db, "experiments", experimentId);
  const snapshot = await getDoc(docRef);
  if (!snapshot.exists()) return null;
  return { id: snapshot.id, ...snapshot.data() };
}

/**
 * Create a new experiment
 * @param {Object} data
 * @returns {Promise<string>} The new experiment ID
 */
export async function createExperiment(data) {
  const docRef = await addDoc(collection(db, "experiments"), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

/**
 * Update an experiment
 * @param {string} experimentId
 * @param {Object} data
 */
export async function updateExperiment(experimentId, data) {
  const docRef = doc(db, "experiments", experimentId);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Delete an experiment
 * @param {string} experimentId
 */
export async function deleteExperiment(experimentId) {
  const docRef = doc(db, "experiments", experimentId);
  await deleteDoc(docRef);
}

// ============================================================================
// ALTERNATIVES (subcollection of experiments)
// ============================================================================

/**
 * Get all alternatives for an experiment
 * @param {string} experimentId
 * @returns {Promise<Array>}
 */
export async function getAlternatives(experimentId) {
  const snapshot = await getDocs(
    collection(db, "experiments", experimentId, "alternatives")
  );
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Add an alternative to an experiment
 * @param {string} experimentId
 * @param {Object} data
 * @returns {Promise<string>}
 */
export async function addAlternative(experimentId, data) {
  const docRef = await addDoc(
    collection(db, "experiments", experimentId, "alternatives"),
    {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }
  );
  return docRef.id;
}

/**
 * Update an alternative
 * @param {string} experimentId
 * @param {string} alternativeId
 * @param {Object} data
 */
export async function updateAlternative(experimentId, alternativeId, data) {
  const docRef = doc(db, "experiments", experimentId, "alternatives", alternativeId);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Delete an alternative
 * @param {string} experimentId
 * @param {string} alternativeId
 */
export async function deleteAlternative(experimentId, alternativeId) {
  const docRef = doc(db, "experiments", experimentId, "alternatives", alternativeId);
  await deleteDoc(docRef);
}

// ============================================================================
// AGENTS (subcollection of experiments, optional)
// ============================================================================

/**
 * Get all agents for an experiment
 * @param {string} experimentId
 * @returns {Promise<Array>}
 */
export async function getAgents(experimentId) {
  const snapshot = await getDocs(
    collection(db, "experiments", experimentId, "agents")
  );
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Add an agent to an experiment
 * @param {string} experimentId
 * @param {Object} data
 * @returns {Promise<string>}
 */
export async function addAgent(experimentId, data) {
  const docRef = await addDoc(
    collection(db, "experiments", experimentId, "agents"),
    {
      ...data,
      createdAt: serverTimestamp(),
    }
  );
  return docRef.id;
}

// ============================================================================
// RUNS (subcollection of experiments)
// ============================================================================

/**
 * Get all runs for an experiment
 * @param {string} experimentId
 * @returns {Promise<Array>}
 */
export async function getRuns(experimentId) {
  const q = query(
    collection(db, "experiments", experimentId, "runs"),
    orderBy("startedAt", "desc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Get a single run
 * @param {string} experimentId
 * @param {string} runId
 * @returns {Promise<Object | null>}
 */
export async function getRun(experimentId, runId) {
  const docRef = doc(db, "experiments", experimentId, "runs", runId);
  const snapshot = await getDoc(docRef);
  if (!snapshot.exists()) return null;
  return { id: snapshot.id, ...snapshot.data() };
}

/**
 * Create a new run
 * @param {string} experimentId
 * @param {Object} data
 * @returns {Promise<string>}
 */
export async function createRun(experimentId, data) {
  const docRef = await addDoc(
    collection(db, "experiments", experimentId, "runs"),
    {
      ...data,
      experimentId,
      startedAt: serverTimestamp(),
    }
  );
  return docRef.id;
}

/**
 * Update a run
 * @param {string} experimentId
 * @param {string} runId
 * @param {Object} data
 */
export async function updateRun(experimentId, runId, data) {
  const docRef = doc(db, "experiments", experimentId, "runs", runId);
  await updateDoc(docRef, data);
}

// ============================================================================
// TASKS (subcollection of runs)
// ============================================================================

/**
 * Get all tasks for a run
 * @param {string} experimentId
 * @param {string} runId
 * @returns {Promise<Array>}
 */
export async function getTasks(experimentId, runId) {
  const snapshot = await getDocs(
    collection(db, "experiments", experimentId, "runs", runId, "tasks")
  );
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Add a task to a run
 * @param {string} experimentId
 * @param {string} runId
 * @param {Object} data
 * @returns {Promise<string>}
 */
export async function addTask(experimentId, runId, data) {
  const docRef = await addDoc(
    collection(db, "experiments", experimentId, "runs", runId, "tasks"),
    {
      ...data,
      createdAt: serverTimestamp(),
    }
  );
  return docRef.id;
}

// ============================================================================
// RESPONSES (subcollection of runs)
// ============================================================================

/**
 * Get all responses for a run
 * @param {string} experimentId
 * @param {string} runId
 * @returns {Promise<Array>}
 */
export async function getResponses(experimentId, runId) {
  const snapshot = await getDocs(
    collection(db, "experiments", experimentId, "runs", runId, "responses")
  );
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Add a response to a run
 * @param {string} experimentId
 * @param {string} runId
 * @param {Object} data
 * @returns {Promise<string>}
 */
export async function addResponse(experimentId, runId, data) {
  const docRef = await addDoc(
    collection(db, "experiments", experimentId, "runs", runId, "responses"),
    {
      ...data,
      createdAt: serverTimestamp(),
    }
  );
  return docRef.id;
}

// ============================================================================
// RESULTS SUMMARY (document in runs subcollection)
// ============================================================================

/**
 * Get the results summary for a run
 * @param {string} experimentId
 * @param {string} runId
 * @returns {Promise<Object | null>}
 */
export async function getResultsSummary(experimentId, runId) {
  const docRef = doc(
    db,
    "experiments",
    experimentId,
    "runs",
    runId,
    "resultsSummary",
    "v1"
  );
  const snapshot = await getDoc(docRef);
  if (!snapshot.exists()) return null;
  return snapshot.data();
}

/**
 * Save the results summary for a run
 * @param {string} experimentId
 * @param {string} runId
 * @param {Object} data
 */
export async function saveResultsSummary(experimentId, runId, data) {
  const docRef = doc(
    db,
    "experiments",
    experimentId,
    "runs",
    runId,
    "resultsSummary",
    "v1"
  );
  await setDoc(docRef, {
    ...data,
    computedAt: serverTimestamp(),
  });
}
