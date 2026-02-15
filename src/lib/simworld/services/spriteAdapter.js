/**
 * Adapter for future external sprite service.
 * Current default returns local placeholder sprite metadata.
 */
export async function fetchSpriteMetadata(persona) {
  return {
    spriteUrl: null,
    frameWidth: 24,
    frameHeight: 30,
    animations: {
      idle: [0],
      walk: [0, 1, 2, 3],
      think: [4, 5, 6, 7],
      choose: [8, 9, 10, 11],
    },
    style: {
      baseColor: persona?.color || "#4b5563",
    },
  };
}
