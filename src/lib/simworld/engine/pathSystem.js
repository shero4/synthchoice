import { EXIT_POINTS, SHOP_POSITIONS, SPAWN_POINT } from "../config";

/**
 * PathSystem — simple waypoint-based path generation.
 *
 * Sprites move: center (spawn) → shop → nearest exit.
 * Paths follow the road network rather than straight lines.
 *
 * Roads converge at the center in a + shape with diagonals,
 * so paths always go through the center hub first.
 */

/**
 * Get a waypoint path from point A to point B.
 * Returns an array of {x, y} positions the sprite should walk through.
 *
 * @param {{ x: number, y: number }} from — starting position
 * @param {{ x: number, y: number }} to — target position
 * @returns {{ x: number, y: number }[]}
 */
export function getPath(from, to) {
  const waypoints = [];

  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const distance = Math.hypot(dx, dy);

  // For short distances, go directly
  if (distance < 80) {
    waypoints.push({ ...to });
    return waypoints;
  }

  // For longer paths, route through intermediate waypoints
  // to follow the road network (L-shaped paths rather than diagonal cuts)
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);

  if (absDx > absDy * 1.5) {
    // Mostly horizontal — go horizontal first, then adjust vertical
    waypoints.push({ x: to.x, y: from.y }, { ...to });
  } else if (absDy > absDx * 1.5) {
    // Mostly vertical — go vertical first, then adjust horizontal
    waypoints.push({ x: from.x, y: to.y }, { ...to });
  } else {
    // Diagonal — route through center road intersection via L-shape
    const midX = (from.x + to.x) / 2;
    waypoints.push({ x: midX, y: from.y }, { x: midX, y: to.y }, { ...to });
  }

  return waypoints;
}

/**
 * Get path from spawn center to a shop position.
 * @param {number} shopIndex — index into SHOP_POSITIONS (0-7)
 * @returns {{ x: number, y: number }[]}
 */
export function getPathToShop(shopIndex) {
  const shop = SHOP_POSITIONS[shopIndex];
  if (!shop) return [{ ...SPAWN_POINT }];
  return getPath(SPAWN_POINT, { x: shop.x, y: shop.y });
}

/**
 * Get path from a shop position to its nearest exit.
 * @param {number} shopIndex — index into SHOP_POSITIONS (0-7)
 * @returns {{ x: number, y: number }[]}
 */
export function getPathToExit(shopIndex) {
  const shop = SHOP_POSITIONS[shopIndex];
  if (!shop) return [];

  const exit = EXIT_POINTS[shop.nearestExit];
  if (!exit) return [];

  return getPath({ x: shop.x, y: shop.y }, exit);
}

/**
 * Get path from any position to the nearest exit.
 * @param {{ x: number, y: number }} from
 * @returns {{ x: number, y: number }[]}
 */
export function getPathToNearestExit(from) {
  // Find closest exit
  let closest = null;
  let minDist = Number.POSITIVE_INFINITY;

  for (const exit of Object.values(EXIT_POINTS)) {
    const dx = exit.x - from.x;
    const dy = exit.y - from.y;
    const dist = dx * dx + dy * dy;
    if (dist < minDist) {
      minDist = dist;
      closest = exit;
    }
  }

  if (!closest) return [];
  return getPath(from, closest);
}

/**
 * Estimate travel duration for a waypoint path.
 * @param {{ x: number, y: number }[]} waypoints
 * @param {number} baseDurationMs — base duration for average path
 * @returns {number} total duration in ms
 */
export function estimatePathDuration(waypoints, baseDurationMs = 2200) {
  if (waypoints.length === 0) return 0;

  let totalDist = 0;
  let prev = null;

  for (const wp of waypoints) {
    if (prev) {
      totalDist += Math.hypot(wp.x - prev.x, wp.y - prev.y);
    }
    prev = wp;
  }

  // Normalize: average path is roughly 300px, should take baseDurationMs
  const avgDist = 300;
  return Math.max(600, (totalDist / avgDist) * baseDurationMs);
}
