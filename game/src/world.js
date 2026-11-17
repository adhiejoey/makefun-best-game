// Emberlight Salvage — the simulation: the skiff, the rocks, the drones,
// the ember shards, the waves, the score and the win/lose rules.
// One clear job: given a fixed step and an input, advance the world and
// say what happened. It knows nothing about the canvas or the keyboard;
// main.js drives it, render.js draws it, shots.js steers it.

import { BULLET, DRONE, FIELD, PLAYER, ROCK, SCORE, SHARD, SPAWN, WIN_WAVE } from './config.js';
import { createRng, rangeFloat } from './random.js';

export const EVENT_NONE = 0;
export const EVENT_SHOOT = 1;
export const EVENT_COLLECT = 2;
export const EVENT_BREAK = 4;
export const EVENT_HIT = 8;
export const EVENT_WAVE_CLEAR = 16;
export const EVENT_WIN = 32;
export const EVENT_OVER = 64;

/** A fresh world for `seed`. Everything the game needs to draw lives on `state`. */
export function createWorld(seed = 1) {
  const rng = createRng(seed);
  const state = {
    seed,
    status: 'playing', // 'playing' | 'won' | 'over'
    time: 0,
    wave: 1,
    score: 0,
    best: 0,
    shardsBanked: 0,
    hull: PLAYER.hull,
    kills: 0,
    player: { x: FIELD.width / 2, y: FIELD.height - 90, angle: -Math.PI / 2, fireTimer: 0, invulnerable: 0 },
    bullets: [],
    rocks: [],
    shards: [],
    drones: [],
    particles: [],
    banner: '',
    bannerTimer: 0,
  };

  let rockTimer = 0.8;
  let shardTimer = 0.6;
  let droneTimer = 3;

  function spawnRock() {
    const radius = rangeFloat(rng, ROCK.minRadius, ROCK.maxRadius);
    const big = radius > 22;
    state.rocks.push({
      x: rangeFloat(rng, radius, FIELD.width - radius),
      y: -radius - 4,
      vx: rangeFloat(rng, -28, 28),
      vy: ROCK.baseSpeed + (state.wave - 1) * ROCK.speedPerWave + rangeFloat(rng, 0, 30),
      radius,
      hp: big ? 2 : 1,
      spin: rangeFloat(rng, -1.2, 1.2),
      angle: rangeFloat(rng, 0, Math.PI * 2),
      // Irregular outline, fixed at spawn so each rock keeps its own shape.
      bumps: Array.from({ length: 9 }, () => rangeFloat(rng, 0.78, 1.18)),
    });
  }

  function spawnShard() {
    state.shards.push({
      x: rangeFloat(rng, 30, FIELD.width - 30),
      y: -16,
      vy: SHARD.fallSpeed + rangeFloat(rng, 0, 22),
      radius: SHARD.radius,
      spin: rangeFloat(rng, 0, Math.PI * 2),
      pulse: rangeFloat(rng, 0, Math.PI * 2),
    });
  }

  function spawnDrone() {
    const fromLeft = rng() < 0.5;
    state.drones.push({
      x: fromLeft ? -20 : FIELD.width + 20,
      y: rangeFloat(rng, 60, FIELD.height * 0.45),
      radius: DRONE.radius,
      hp: 1,
      wobble: rangeFloat(rng, 0, Math.PI * 2),
    });
  }

  function burst(x, y, color, count, speed) {
    for (let index = 0; index < count; index += 1) {
      const angle = rng() * Math.PI * 2;
      const velocity = rangeFloat(rng, speed * 0.3, speed);
      state.particles.push({
        x, y,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity,
        life: rangeFloat(rng, 0.3, 0.7),
        maxLife: 0.7,
        color,
        radius: rangeFloat(rng, 1.5, 3.5),
      });
    }
  }

  function distance(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function hurtPlayer() {
    const player = state.player;
    if (player.invulnerable > 0 || state.status !== 'playing') return EVENT_NONE;
    state.hull -= 1;
    player.invulnerable = PLAYER.invulnerableSeconds;
    burst(player.x, player.y, '#ff5a5a', 18, 190);
    if (state.hull <= 0) {
      state.status = 'over';
      burst(player.x, player.y, '#7ee7ff', 36, 260);
      return EVENT_HIT | EVENT_OVER;
    }
    return EVENT_HIT;
  }

  function clearWave() {
    const bonus = SCORE.waveBonus + state.wave * SCORE.waveBonusPerWave;
    state.score += bonus;
    if (state.wave >= WIN_WAVE) {
      state.status = 'won';
      state.banner = 'SALVAGE COMPLETE';
      state.bannerTimer = 3;
      return EVENT_WAVE_CLEAR | EVENT_WIN;
    }
    state.wave += 1;
    state.shardsBanked = 0;
    state.banner = `WAVE ${state.wave}`;
    state.bannerTimer = 2;
    return EVENT_WAVE_CLEAR;
  }

  function reset() {
    state.status = 'playing';
    state.time = 0;
    state.wave = 1;
    state.score = 0;
    state.shardsBanked = 0;
    state.hull = PLAYER.hull;
    state.kills = 0;
    state.player.x = FIELD.width / 2;
    state.player.y = FIELD.height - 90;
    state.player.angle = -Math.PI / 2;
    state.player.fireTimer = 0;
    state.player.invulnerable = 0;
    state.bullets.length = 0;
    state.rocks.length = 0;
    state.shards.length = 0;
    state.drones.length = 0;
    state.particles.length = 0;
    state.banner = 'WAVE 1 — COLLECT 10 EMBERS';
    state.bannerTimer = 2.2;
    rockTimer = 0.8;
    shardTimer = 0.6;
    droneTimer = 3;
  }

  reset();

  return {
    state,
    reset,
    /** Advance one fixed step. `move` is {x, y} in [-1, 1], `aim` is {x, y} in canvas pixels, `firing` a boolean. Returns an event bitmask. */
    step(dt, move, aim, firing) {
      if (state.status !== 'playing') {
        // Let particles settle on the end screens.
        for (const particle of state.particles) {
          particle.x += particle.vx * dt;
          particle.y += particle.vy * dt;
          particle.life -= dt;
        }
        state.particles = state.particles.filter((particle) => particle.life > 0);
        if (state.bannerTimer > 0) state.bannerTimer -= dt;
        return EVENT_NONE;
      }
      let events = EVENT_NONE;
      state.time += dt;
      const player = state.player;

      // Move the skiff, clamped to the field.
      const length = Math.hypot(move.x, move.y) || 1;
      const nx = move.x / length;
      const ny = move.y / length;
      const moving = move.x !== 0 || move.y !== 0;
      player.x = Math.min(FIELD.width - PLAYER.radius, Math.max(PLAYER.radius, player.x + (moving ? nx : 0) * PLAYER.speed * dt));
      player.y = Math.min(FIELD.height - PLAYER.radius, Math.max(PLAYER.radius, player.y + (moving ? ny : 0) * PLAYER.speed * dt));
      player.angle = Math.atan2(aim.y - player.y, aim.x - player.x);
      if (player.invulnerable > 0) player.invulnerable -= dt;
      if (state.bannerTimer > 0) state.bannerTimer -= dt;

      // Fire toward the aim point.
      player.fireTimer -= dt;
      if (firing && player.fireTimer <= 0) {
        player.fireTimer = PLAYER.fireCooldown;
        state.bullets.push({
          x: player.x + Math.cos(player.angle) * (PLAYER.radius + 6),
          y: player.y + Math.sin(player.angle) * (PLAYER.radius + 6),
          vx: Math.cos(player.angle) * BULLET.speed,
          vy: Math.sin(player.angle) * BULLET.speed,
          radius: BULLET.radius,
        });
        events |= EVENT_SHOOT;
      }

      // Spawn: faster and busier as the waves rise.
      const interval = Math.max(SPAWN.minInterval, SPAWN.rockInterval - (state.wave - 1) * SPAWN.intervalPerWave);
      rockTimer -= dt;
      if (rockTimer <= 0) {
        rockTimer = interval * rangeFloat(rng, 0.7, 1.3);
        spawnRock();
      }
      shardTimer -= dt;
      if (shardTimer <= 0) {
        shardTimer = SPAWN.shardInterval * rangeFloat(rng, 0.8, 1.4);
        spawnShard();
      }
      if (state.wave >= DRONE.firstWave) {
        droneTimer -= dt;
        if (droneTimer <= 0) {
          droneTimer = Math.max(1.2, SPAWN.droneInterval - (state.wave - DRONE.firstWave) * 0.25) * rangeFloat(rng, 0.8, 1.3);
          spawnDrone();
        }
      }

      // Bullets fly; rocks and drones take hits.
      for (const bullet of state.bullets) {
        bullet.x += bullet.vx * dt;
        bullet.y += bullet.vy * dt;
      }
      state.bullets = state.bullets.filter(
        (bullet) => bullet.x > -20 && bullet.x < FIELD.width + 20 && bullet.y > -20 && bullet.y < FIELD.height + 20,
      );
      for (const bullet of state.bullets) {
        for (const rock of state.rocks) {
          if (rock.hp > 0 && distance(bullet, rock) < bullet.radius + rock.radius) {
            rock.hp -= 1;
            bullet.y = -9999;
            if (rock.hp <= 0) {
              state.score += ROCK.score;
              state.kills += 1;
              burst(rock.x, rock.y, '#b9a8d8', 12, 150);
              events |= EVENT_BREAK;
            }
            break;
          }
        }
        for (const drone of state.drones) {
          if (drone.hp > 0 && distance(bullet, drone) < bullet.radius + drone.radius) {
            drone.hp -= 1;
            bullet.y = -9999;
            if (drone.hp <= 0) {
              state.score += DRONE.score;
              state.kills += 1;
              burst(drone.x, drone.y, '#ff6b81', 14, 170);
              events |= EVENT_BREAK;
            }
            break;
          }
        }
      }
      state.bullets = state.bullets.filter((bullet) => bullet.y > -100);

      // Rocks tumble down; drones hunt the skiff; shards drift down.
      for (const rock of state.rocks) {
        rock.y += rock.vy * dt;
        rock.x += rock.vx * dt;
        rock.angle += rock.spin * dt;
        if (rock.x < rock.radius || rock.x > FIELD.width - rock.radius) rock.vx *= -1;
      }
      state.rocks = state.rocks.filter((rock) => rock.hp > 0 && rock.y < FIELD.height + 40);
      for (const drone of state.drones) {
        drone.wobble += dt * 2;
        const dx = player.x - drone.x;
        const dy = player.y - drone.y;
        const dist = Math.hypot(dx, dy) || 1;
        const speed = DRONE.speed + (state.wave - DRONE.firstWave) * DRONE.speedPerWave;
        drone.x += (dx / dist) * speed * dt + Math.cos(drone.wobble) * 24 * dt;
        drone.y += (dy / dist) * speed * dt + Math.sin(drone.wobble) * 24 * dt;
      }
      state.drones = state.drones.filter((drone) => drone.hp > 0);
      for (const shard of state.shards) {
        shard.y += shard.vy * dt;
        shard.spin += dt * 2.4;
        shard.pulse += dt * 5;
      }
      state.shards = state.shards.filter((shard) => shard.y < FIELD.height + 24);

      // The skiff collects shards and collides with rocks and drones.
      for (const shard of state.shards) {
        if (distance(player, shard) < PLAYER.radius + shard.radius + 2) {
          shard.y = FIELD.height + 999;
          state.shardsBanked += 1;
          state.score += SHARD.score;
          burst(shard.x, shard.y, '#ffd94d', 10, 130);
          events |= EVENT_COLLECT;
          if (state.shardsBanked >= SHARD.perWave) events |= clearWave();
        }
      }
      state.shards = state.shards.filter((shard) => shard.y < FIELD.height + 100);
      if (state.status === 'playing') {
        for (const rock of state.rocks) {
          if (distance(player, rock) < PLAYER.radius + rock.radius - 4) {
            rock.hp = 0;
            burst(rock.x, rock.y, '#b9a8d8', 12, 150);
            events |= hurtPlayer();
            break;
          }
        }
      }
      state.rocks = state.rocks.filter((rock) => rock.hp > 0);
      if (state.status === 'playing') {
        for (const drone of state.drones) {
          if (distance(player, drone) < PLAYER.radius + drone.radius - 3) {
            drone.hp = 0;
            events |= hurtPlayer();
            break;
          }
        }
      }
      state.drones = state.drones.filter((drone) => drone.hp > 0);

      // Particles fade.
      for (const particle of state.particles) {
        particle.x += particle.vx * dt;
        particle.y += particle.vy * dt;
        particle.vx *= 1 - 1.6 * dt;
        particle.vy *= 1 - 1.6 * dt;
        particle.life -= dt;
      }
      state.particles = state.particles.filter((particle) => particle.life > 0);

      return events;
    },
    /** Force the loss path (used only by screenshot staging when a run will not end on its own). */
    forceGameOver() {
      if (state.status !== 'playing') return;
      state.hull = 0;
      state.status = 'over';
    },
    /** Force the win path (used only by screenshot staging). */
    forceWin() {
      if (state.status !== 'playing') return;
      state.wave = WIN_WAVE;
      state.shardsBanked = SHARD.perWave;
      state.score += SCORE.waveBonus + WIN_WAVE * SCORE.waveBonusPerWave;
      state.status = 'won';
      state.banner = 'SALVAGE COMPLETE';
      state.bannerTimer = 3;
    },
  };
}
