// Emberlight Salvage — tuning and field constants.
// One clear job: every number that shapes how the game feels lives here,
// so balancing never means hunting through the simulation or the renderer.

export const FIELD = { width: 960, height: 600 };

export const PLAYER = {
  radius: 14,
  speed: 310,
  hull: 3,
  fireCooldown: 0.18,
  invulnerableSeconds: 1.6,
};

export const BULLET = { radius: 4, speed: 560 };

export const SHARD = {
  radius: 11,
  score: 25,
  /** Shards banked to open the warp gate and clear a wave. */
  perWave: 10,
  fallSpeed: 46,
};

export const ROCK = {
  minRadius: 13,
  maxRadius: 27,
  baseSpeed: 62,
  speedPerWave: 9,
  score: 10,
};

export const DRONE = {
  radius: 15,
  speed: 78,
  speedPerWave: 6,
  score: 30,
  /** First wave drones appear on. */
  firstWave: 3,
};

/** Waves to clear before the salvage run is complete (the win). */
export const WIN_WAVE = 8;

export const SPAWN = {
  /** Seconds between spawns on wave 1; shrinks as waves rise. */
  rockInterval: 1.15,
  shardInterval: 1.5,
  droneInterval: 2.6,
  intervalPerWave: 0.07,
  minInterval: 0.42,
};

export const SCORE = {
  waveBonus: 100,
  waveBonusPerWave: 25,
};

/** Fixed simulation step, seconds. The live loop and the shot staging both use it. */
export const STEP = 1 / 60;

export const COLORS = {
  backgroundTop: '#0b1026',
  backgroundBottom: '#1a0f2e',
  nebulaA: '#3b2a6b',
  nebulaB: '#123a4a',
  hud: '#ffe9a8',
  text: '#f4f1e6',
  dimText: '#b9b3c9',
  accent: '#ffb347',
  shard: '#ffd94d',
  player: '#7ee7ff',
  bullet: '#fff3b0',
  rock: '#8a7f9e',
  drone: '#ff6b81',
  danger: '#ff5a5a',
};
