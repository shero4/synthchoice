import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "./client";

/**
 * Upload a sprite image for an agent
 * @param {string} experimentId
 * @param {string} agentId
 * @param {Blob} blob
 * @returns {Promise<string>} Download URL
 */
export async function uploadAgentSprite(experimentId, agentId, blob) {
  const storageRef = ref(
    storage,
    `experiments/${experimentId}/sprites/agents/${agentId}.png`
  );
  await uploadBytes(storageRef, blob);
  return getDownloadURL(storageRef);
}

/**
 * Upload a sprite image for a thing/alternative
 * @param {string} experimentId
 * @param {string} alternativeId
 * @param {Blob} blob
 * @returns {Promise<string>} Download URL
 */
export async function uploadThingSprite(experimentId, alternativeId, blob) {
  const storageRef = ref(
    storage,
    `experiments/${experimentId}/sprites/things/${alternativeId}.png`
  );
  await uploadBytes(storageRef, blob);
  return getDownloadURL(storageRef);
}

/**
 * Get the storage path for an agent sprite
 * @param {string} experimentId
 * @param {string} agentId
 * @returns {string}
 */
export function getAgentSpritePath(experimentId, agentId) {
  return `experiments/${experimentId}/sprites/agents/${agentId}.png`;
}

/**
 * Get the storage path for a thing sprite
 * @param {string} experimentId
 * @param {string} alternativeId
 * @returns {string}
 */
export function getThingSpritePath(experimentId, alternativeId) {
  return `experiments/${experimentId}/sprites/things/${alternativeId}.png`;
}
