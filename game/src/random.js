// Emberlight Salvage — a tiny seeded random number generator.
// One clear job: deterministic randomness, so a seed always replays the
// same field. The live game seeds from the clock; screenshot staging
// seeds from the URL, so the same shot always renders the same frame.

/** Mulberry32: a small, fast seeded PRNG returning [0, 1). */
export function createRng(seed) {
  let state = seed >>> 0;
  return function next() {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

/** Integer in [min, max] from a generator. */
export function rangeInt(rng, min, max) {
  return min + Math.floor(rng() * (max - min + 1));
}

/** Float in [min, max) from a generator. */
export function rangeFloat(rng, min, max) {
  return min + rng() * (max - min);
}

/** Pick one element of an array from a generator. */
export function pick(rng, items) {
  return items[Math.floor(rng() * items.length)];
}
