// Emberlight Salvage — screenshot staging behind ?shot=start|play|win|end.
// One clear job: pose the game for its screenshots by playing the real
// rules forward from a fresh world with a simple autopilot, so every shot
// is a real render of the game's own code and the same seed always gives
// the same frame. The live game never imports this file's pilot.

import { STEP } from './config.js';
import { EVENT_OVER } from './world.js';
import { SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';

const SAMPLE = STEP;

/** Nearest entity of a list to the player, or null. */
function nearest(state, list) {
  let best = null;
  let bestDistance = Infinity;
  for (const item of list) {
    const distance = Math.hypot(item.x - state.player.x, item.y - state.player.y);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = item;
    }
  }
  return best;
}

/**
 * Steer one step. When `careful`, dodge the nearest rock; when reckless,
 * chase shards and ignore the rocks — which is how the end shot is lost.
 * Returns { move, aim, firing } for world.step.
 */
function autopilot(state, careful) {
  const player = state.player;
  const shard = nearest(state, state.shards);
  const rock = nearest(state, state.rocks);
  const drone = nearest(state, state.drones);
  let targetX = shard ? shard.x : player.x;
  let targetY = shard ? shard.y : player.y - 120;

  if (careful && rock) {
    const rockDistance = Math.hypot(rock.x - player.x, rock.y - player.y);
    if (rockDistance < 110) {
      // Slip sideways, away from the rock's line.
      targetX = player.x + (player.x < rock.x ? -160 : 160);
      targetY = player.y - 60;
    }
  }

  const dx = targetX - player.x;
  const dy = targetY - player.y;
  const length = Math.hypot(dx, dy) || 1;
  const move = { x: dx / length, y: dy / length };
  const threat = drone && (!rock || Math.hypot(drone.x - player.x, drone.y - player.y) < Math.hypot(rock.x - player.x, rock.y - player.y))
    ? drone : rock;
  const aim = threat ? { x: threat.x, y: threat.y } : { x: player.x, y: player.y - 200 };
  const firing = Boolean(threat) && Math.hypot(threat.x - player.x, threat.y - player.y) < 460;
  return { move, aim, firing };
}

function runFor(world, seconds, careful) {
  const steps = Math.floor(seconds / SAMPLE);
  for (let index = 0; index < steps; index += 1) {
    const { move, aim, firing } = autopilot(world.state, careful);
    const events = world.step(SAMPLE, move, aim, firing);
    if (events & EVENT_OVER) return true;
  }
  return world.state.status === 'over';
}

/**
 * Set `world` to the named scene and return the screen to draw over it
 * and the best score to show. Unknown names stage the title.
 */
export function stageShot(name, world) {
  world.reset();
  if (name === 'win') {
    runFor(world, 20, true);
    if (world.state.status === 'playing') world.forceWin();
    return { screen: SCREEN_WIN, best: Math.max(world.state.score, 0) };
  }
  if (name === 'end') {
    const over = runFor(world, 120, false);
    if (!over) world.forceGameOver();
    return { screen: SCREEN_OVER, best: world.state.score };
  }
  if (name === 'play') {
    runFor(world, 26, true);
    if (world.state.status === 'over') {
      world.reset();
      runFor(world, 10, true);
    }
    return { screen: SCREEN_PLAY, best: world.state.score };
  }
  // Title: let the field drift for a few seconds behind the menu.
  for (let index = 0; index < 5 / SAMPLE; index += 1) {
    world.step(SAMPLE, { x: 0, y: 0 }, { x: world.state.player.x, y: world.state.player.y - 200 }, false);
  }
  return { screen: SCREEN_TITLE, best: 0 };
}

export { SCREEN_PAUSED };
