// Emberlight Salvage — everything the player sees.
// One clear job: draw the field, the skiff, the rocks, the drones, the
// shards, the HUD and the title / pause / win / game-over screens on a
// 2D canvas. It never changes the world; it only reads `world.state`.

import { COLORS, FIELD, SHARD, WIN_WAVE } from './config.js';
import { createRng } from './random.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_WIN = 'win';
export const SCREEN_OVER = 'over';

// A fixed starfield, seeded once so the sky never flickers between frames.
const starRng = createRng(20261117);
const STARS = Array.from({ length: 130 }, () => ({
  x: starRng() * FIELD.width,
  y: starRng() * FIELD.height,
  radius: 0.6 + starRng() * 1.5,
  twinkle: starRng() * Math.PI * 2,
  speed: 6 + starRng() * 14,
}));

function roundRect(context, x, y, width, height, radius) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + width, y, x + width, y + height, radius);
  context.arcTo(x + width, y + height, x, y + height, radius);
  context.arcTo(x, y + height, x, y, radius);
  context.arcTo(x, y, x + width, y, radius);
  context.closePath();
}

function drawBackground(context, time) {
  const gradient = context.createLinearGradient(0, 0, 0, FIELD.height);
  gradient.addColorStop(0, COLORS.backgroundTop);
  gradient.addColorStop(1, COLORS.backgroundBottom);
  context.fillStyle = gradient;
  context.fillRect(0, 0, FIELD.width, FIELD.height);

  // Two soft nebulae, drawn once per frame from fixed positions.
  context.globalAlpha = 0.5;
  context.fillStyle = COLORS.nebulaA;
  context.beginPath();
  context.ellipse(190, 150, 220, 120, 0.4, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = COLORS.nebulaB;
  context.beginPath();
  context.ellipse(780, 430, 240, 130, -0.3, 0, Math.PI * 2);
  context.fill();
  context.globalAlpha = 1;

  // Stars drift slowly downward, twinkling.
  for (const star of STARS) {
    const y = (star.y + time * star.speed) % FIELD.height;
    const alpha = 0.45 + 0.35 * Math.sin(time * 2 + star.twinkle);
    context.globalAlpha = Math.max(0.1, alpha);
    context.fillStyle = '#ffffff';
    context.beginPath();
    context.arc(star.x, y, star.radius, 0, Math.PI * 2);
    context.fill();
  }
  context.globalAlpha = 1;
}

function drawPlayer(context, player, time) {
  const blink = player.invulnerable > 0 && Math.floor(time * 12) % 2 === 0;
  context.save();
  context.translate(player.x, player.y);
  context.rotate(player.angle);
  if (blink) context.globalAlpha = 0.35;
  // Engine glow.
  const flame = 10 + Math.sin(time * 22) * 3;
  context.fillStyle = '#ff9a3c';
  context.beginPath();
  context.moveTo(-13, -5);
  context.lineTo(-13 - flame, 0);
  context.lineTo(-13, 5);
  context.closePath();
  context.fill();
  // Hull: a little salvage skiff, nose to the right.
  context.fillStyle = COLORS.player;
  context.beginPath();
  context.moveTo(18, 0);
  context.lineTo(-10, -11);
  context.lineTo(-5, 0);
  context.lineTo(-10, 11);
  context.closePath();
  context.fill();
  context.fillStyle = '#0b1026';
  context.beginPath();
  context.arc(4, 0, 4.5, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = COLORS.shard;
  context.beginPath();
  context.arc(4, 0, 2.2, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

function drawRock(context, rock) {
  context.save();
  context.translate(rock.x, rock.y);
  context.rotate(rock.angle);
  context.fillStyle = COLORS.rock;
  context.strokeStyle = '#5d5470';
  context.lineWidth = 2;
  context.beginPath();
  for (let index = 0; index < rock.bumps.length; index += 1) {
    const angle = (index / rock.bumps.length) * Math.PI * 2;
    const radius = rock.radius * rock.bumps[index];
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  }
  context.closePath();
  context.fill();
  context.stroke();
  // A cracked, ember-lit core on the tougher rocks.
  if (rock.hp > 1) {
    context.fillStyle = '#ff7a4d';
    context.beginPath();
    context.arc(0, 0, rock.radius * 0.32, 0, Math.PI * 2);
    context.fill();
  }
  context.restore();
}

function drawDrone(context, drone, time) {
  context.save();
  context.translate(drone.x, drone.y);
  context.rotate(Math.sin(time * 3 + drone.wobble) * 0.25);
  context.fillStyle = COLORS.drone;
  context.beginPath();
  context.moveTo(0, -16);
  context.lineTo(13, 0);
  context.lineTo(0, 16);
  context.lineTo(-13, 0);
  context.closePath();
  context.fill();
  context.fillStyle = '#2b0a12';
  context.beginPath();
  context.arc(0, 0, 5.5, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = '#ff2e4d';
  context.beginPath();
  context.arc(0, 0, 2.6, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

function drawShard(context, shard) {
  const glow = 0.75 + 0.25 * Math.sin(shard.pulse);
  context.save();
  context.translate(shard.x, shard.y);
  context.rotate(shard.spin);
  context.globalAlpha = glow;
  context.fillStyle = COLORS.shard;
  context.beginPath();
  context.moveTo(0, -13);
  context.lineTo(8, 0);
  context.lineTo(0, 13);
  context.lineTo(-8, 0);
  context.closePath();
  context.fill();
  context.fillStyle = '#fff8d6';
  context.beginPath();
  context.moveTo(0, -6);
  context.lineTo(3.5, 0);
  context.lineTo(0, 6);
  context.lineTo(-3.5, 0);
  context.closePath();
  context.fill();
  context.restore();
}

function drawParticles(context, particles) {
  for (const particle of particles) {
    context.globalAlpha = Math.max(0, particle.life / particle.maxLife);
    context.fillStyle = particle.color;
    context.beginPath();
    context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
    context.fill();
  }
  context.globalAlpha = 1;
}

function drawHud(context, state, muted) {
  context.fillStyle = 'rgba(8, 10, 26, 0.62)';
  context.fillRect(0, 0, FIELD.width, 44);
  context.fillStyle = COLORS.hud;
  context.font = 'bold 20px system-ui, sans-serif';
  context.textAlign = 'left';
  context.textBaseline = 'middle';
  context.fillText(`SCORE ${state.score}`, 16, 23);
  context.fillText(`WAVE ${state.wave}/${WIN_WAVE}`, 250, 23);
  context.fillStyle = COLORS.shard;
  context.fillText(`◆ ${state.shardsBanked}/${SHARD.perWave}`, 430, 23);
  // Hull hearts, top right.
  context.textAlign = 'right';
  let hearts = '';
  for (let index = 0; index < 3; index += 1) hearts += index < state.hull ? '♥ ' : '♡ ';
  context.fillStyle = state.hull === 1 ? COLORS.danger : '#ff8fa3';
  context.fillText(hearts.trim(), FIELD.width - 16, 23);
  context.fillStyle = COLORS.dimText;
  context.font = '14px system-ui, sans-serif';
  context.textAlign = 'right';
  context.fillText(muted ? 'M — sound off' : 'M — sound on', FIELD.width - 16, 58);
  context.textAlign = 'left';
}

function drawBanner(context, state) {
  if (!state.banner || state.bannerTimer <= 0) return;
  context.save();
  context.globalAlpha = Math.min(1, state.bannerTimer);
  context.fillStyle = COLORS.text;
  context.font = 'bold 34px system-ui, sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.shadowColor = '#ffb347';
  context.shadowBlur = 18;
  context.fillText(state.banner, FIELD.width / 2, 110);
  context.restore();
}

function drawPanel(context, title, lines, buttonLabel) {
  context.fillStyle = 'rgba(6, 8, 20, 0.72)';
  context.fillRect(0, 0, FIELD.width, FIELD.height);
  context.fillStyle = COLORS.text;
  context.font = 'bold 44px system-ui, sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.shadowColor = '#ffb347';
  context.shadowBlur = 16;
  context.fillText(title, FIELD.width / 2, 150);
  context.shadowBlur = 0;
  context.font = '19px system-ui, sans-serif';
  context.fillStyle = COLORS.dimText;
  lines.forEach((line, index) => {
    context.fillText(line, FIELD.width / 2, 215 + index * 30);
  });
  if (buttonLabel) {
    // Sit the button below the last line, so long menus never hide text.
    const button = {
      x: FIELD.width / 2 - 130,
      y: Math.min(500, 215 + lines.length * 30 + 28),
      width: 260,
      height: 56,
    };
    activeButton = button;
    context.fillStyle = '#ffb347';
    roundRect(context, button.x, button.y, button.width, button.height, 10);
    context.fill();
    context.fillStyle = '#241505';
    context.font = 'bold 22px system-ui, sans-serif';
    context.fillText(buttonLabel, FIELD.width / 2, button.y + button.height / 2 + 1);
  }
}

/** The menu button the last drawn panel showed; clicks land where it is. */
let activeButton = { x: FIELD.width / 2 - 130, y: 400, width: 260, height: 56 };

export function panelButton() {
  return activeButton;
}

export function pointInButton(x, y) {
  const button = panelButton();
  return x >= button.x && x <= button.x + button.width && y >= button.y && y <= button.y + button.height;
}

/** Draw one frame of `state` under `screen`. `best` is the saved best score. */
export function render(context, state, screen, best, muted = false) {
  const time = state.time;
  drawBackground(context, time);
  for (const shard of state.shards) drawShard(context, shard);
  for (const rock of state.rocks) drawRock(context, rock);
  for (const drone of state.drones) drawDrone(context, drone, time);
  for (const bullet of state.bullets) {
    context.fillStyle = COLORS.bullet;
    context.beginPath();
    context.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
    context.fill();
  }
  if (state.status !== 'over' && screen !== SCREEN_WIN) drawPlayer(context, state.player, time);
  drawParticles(context, state.particles);
  drawHud(context, state, muted);
  // The wave banner only belongs over live play: on the end screens it
  // would print twice, once as a banner and once as the panel title.
  if (screen === SCREEN_PLAY) drawBanner(context, state);

  if (screen === SCREEN_TITLE) {
    drawPanel(context, 'EMBERLIGHT SALVAGE', [
      'Pilot the skiff. Bank 10 ember shards to open the warp gate.',
      'Clear all 8 waves to complete the salvage run.',
      'Dodge the cinder rocks — drones hunt you from wave 3.',
      '',
      'Move: WASD / arrows   •   Aim: mouse   •   Fire: click / Space',
      'Pause: P   •   Restart: R   •   Sound: M',
      '',
      best > 0 ? `Best score: ${best}` : 'No salvage run yet — good hunting.',
    ], 'START SALVAGE');
  } else if (screen === SCREEN_PAUSED) {
    drawPanel(context, 'PAUSED', [
      `Wave ${state.wave}  •  Score ${state.score}  •  Shards ${state.shardsBanked}/${SHARD.perWave}`,
      'Take a breath. The rocks will wait.',
    ], 'RESUME');
  } else if (screen === SCREEN_WIN) {
    drawPanel(context, 'SALVAGE COMPLETE', [
      `All ${WIN_WAVE} waves cleared. The hold is full of emberlight.`,
      `Final score: ${state.score}   •   Rocks broken: ${state.kills}`,
      best > 0 ? `Best score: ${best}` : '',
      '',
      'Press R or click below to run it again.',
    ], 'PLAY AGAIN');
  } else if (screen === SCREEN_OVER) {
    drawPanel(context, 'HULL BREACHED', [
      `The skiff broke apart on wave ${state.wave}.`,
      `Score: ${state.score}   •   Shards banked: ${state.shardsBanked}/${SHARD.perWave}`,
      best > 0 ? `Best score: ${best}` : '',
      '',
      'Press R or click below to fly again.',
    ], 'FLY AGAIN');
  }
}
