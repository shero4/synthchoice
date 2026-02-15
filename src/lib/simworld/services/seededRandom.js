export function createSeededRandom(seedString = "simworld-seed") {
  let hash = 2166136261;
  for (let index = 0; index < seedString.length; index += 1) {
    hash ^= seedString.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return {
    next() {
      hash += 0x6d2b79f5;
      let value = Math.imul(hash ^ (hash >>> 15), 1 | hash);
      value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
      return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    },
  };
}
