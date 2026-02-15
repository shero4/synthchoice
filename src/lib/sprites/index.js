/**
 * Sprite Helpers
 * Utilities for working with agent and thing sprites
 */

/**
 * Get the public URL for an agent sprite
 * @param {string} agentId
 * @returns {string}
 */
export function getAgentSpriteUrl(agentId) {
  return `/sprites/agents/${agentId}.png`;
}

/**
 * Get the public URL for a thing sprite
 * @param {string} alternativeId
 * @returns {string}
 */
export function getThingSpriteUrl(alternativeId) {
  return `/sprites/things/${alternativeId}.png`;
}

/**
 * Check if a sprite exists (client-side check)
 * Note: This is a simple check that attempts to load the image
 * @param {string} url
 * @returns {Promise<boolean>}
 */
export async function spriteExists(url) {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve(false);
      return;
    }

    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
  });
}

/**
 * Generate a deterministic color from a seed string
 * @param {string} seed
 * @returns {string} Hex color
 */
export function getColorFromSeed(seed) {
  if (!seed) return "#1890ff";

  const colors = [
    "#f56a00",
    "#7265e6",
    "#ffbf00",
    "#00a2ae",
    "#eb2f96",
    "#52c41a",
    "#1890ff",
    "#722ed1",
    "#13c2c2",
    "#fa541c",
  ];

  const hash = seed.split("").reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);

  return colors[Math.abs(hash) % colors.length];
}

/**
 * Generate initials from a label
 * @param {string} label
 * @returns {string}
 */
export function getInitials(label) {
  if (!label) return "?";

  const words = label.split(/[\s_-]+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return label.substring(0, 2).toUpperCase();
}

/**
 * Get sprite config for display
 * @param {Object} spriteConfig - { seed, style, storagePath }
 * @param {string} fallbackLabel - Label to use for initials
 * @returns {{ url: string | null, color: string, initials: string }}
 */
export function getSpriteDisplay(spriteConfig, fallbackLabel = "") {
  const seed = spriteConfig?.seed || fallbackLabel;
  const storagePath = spriteConfig?.storagePath;

  return {
    url: storagePath || null,
    color: getColorFromSeed(seed),
    initials: getInitials(fallbackLabel),
  };
}
