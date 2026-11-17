// Emberlight Salvage — the live game: screens, the loop, the wiring.
// One clear job: own the screen state (title / play / paused / win /
// game-over), feed input into the world each step, play the sounds the
// world's events ask for, and hand each frame to the renderer.

import { FIELD, STEP } from './config.js';
import { createAudio } from './audio.js';
import { createInput } from './input.js';
import { pointInButton, render, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';
import { stageShot } from './shots.js';
import {
  EVENT_BREAK, EVENT_COLLECT, EVENT_HIT, EVENT_OVER, EVENT_SHOOT, EVENT_WAVE_CLEAR, EVENT_WIN, createWorld,
} from './world.js';

const BEST_KEY = 'emberlight-salvage-best';

const canvas = document.getElementById('game');
const context = canvas.getContext('2d');
// Size the canvas backing store to the field; CSS scales it to the page.
canvas.width = FIELD.width;
canvas.height = FIELD.height;
const input = createInput(canvas);
const audio = createAudio();

const params = new URLSearchParams(window.location.search);
const seedParam = Number.parseInt(params.get('seed') ?? '1', 10);
const seed = Number.isInteger(seedParam) ? seedParam : 1;
const world = createWorld(seed);

let screen = SCREEN_TITLE;
let best = 0;
try {
  best = Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
} catch {
  best = 0;
}
world.state.best = best;

function saveBest() {
  const score = world.state.score;
  if (score > best) {
    best = score;
    world.state.best = best;
    try {
      window.localStorage.setItem(BEST_KEY, String(best));
    } catch {
      // Offline play without storage still works; the best score just is not kept.
    }
  }
}

function startGame() {
  audio.unlock();
  audio.click();
  world.reset();
  screen = SCREEN_PLAY;
}

function handleEvents(events) {
  if (events & EVENT_SHOOT) audio.shoot();
  if (events & EVENT_COLLECT) audio.collect();
  if (events & EVENT_BREAK) audio.rockBreak();
  if (events & EVENT_HIT) audio.hit();
  if (events & EVENT_WAVE_CLEAR) audio.waveClear();
  if (events & EVENT_WIN) {
    saveBest();
    audio.win();
    screen = SCREEN_WIN;
  }
  if (events & EVENT_OVER) {
    saveBest();
    audio.gameOver();
    screen = SCREEN_OVER;
  }
}

function stepGame() {
  const { moveX, moveY, mouseX, mouseY, firing } = input.state;
  const events = world.step(
    STEP,
    { x: moveX, y: moveY },
    { x: mouseX, y: mouseY },
    firing,
  );
  handleEvents(events);
  if (world.state.status === 'won' && screen === SCREEN_PLAY) screen = SCREEN_WIN;
  if (world.state.status === 'over' && screen === SCREEN_PLAY) screen = SCREEN_OVER;
}

function onMenuKey() {
  if (input.consumePressed('Enter') || input.consumePressed('Space')) {
    if (screen === SCREEN_TITLE || screen === SCREEN_WIN || screen === SCREEN_OVER) startGame();
    else if (screen === SCREEN_PAUSED) screen = SCREEN_PLAY;
    return true;
  }
  if (input.consumePressed('KeyR')) {
    if (screen !== SCREEN_TITLE) startGame();
    return true;
  }
  return false;
}

// Screenshot staging: ?shot=start|play|win|end&seed=1 renders one posed
// frame of the real game and then sits still for the capture.
const shotName = params.get('shot');
if (shotName) {
  const staged = stageShot(shotName, world);
  screen = staged.screen;
  best = Math.max(best, staged.best);
  world.state.best = best;
  render(context, world.state, screen, best, audio.muted);
  window.__shotReady = true;
} else {
  let last = performance.now();
  let accumulator = 0;

  canvas.addEventListener('pointerdown', (event) => {
    audio.unlock();
    if (screen === SCREEN_TITLE || screen === SCREEN_WIN || screen === SCREEN_OVER) {
      const rect = canvas.getBoundingClientRect();
      const x = (event.clientX - rect.left) * (canvas.width / rect.width);
      const y = (event.clientY - rect.top) * (canvas.height / rect.height);
      if (pointInButton(x, y)) startGame();
    } else if (screen === SCREEN_PAUSED) {
      const rect = canvas.getBoundingClientRect();
      const x = (event.clientX - rect.left) * (canvas.width / rect.width);
      const y = (event.clientY - rect.top) * (canvas.height / rect.height);
      if (pointInButton(x, y)) screen = SCREEN_PLAY;
    }
  });

  window.addEventListener('keydown', () => audio.unlock(), { once: true });

  function frame(now) {
    const elapsed = Math.min(0.1, (now - last) / 1000);
    last = now;

    if (input.consumePressed('KeyM')) audio.toggleMute();
    if (screen === SCREEN_PLAY && input.consumePressed('KeyP')) {
      screen = SCREEN_PAUSED;
    } else if (screen === SCREEN_PAUSED && input.consumePressed('KeyP')) {
      screen = SCREEN_PLAY;
    }

    if (screen === SCREEN_PLAY) {
      accumulator += elapsed;
      while (accumulator >= STEP) {
        stepGame();
        accumulator -= STEP;
        if (screen !== SCREEN_PLAY) {
          accumulator = 0;
          break;
        }
      }
    } else {
      onMenuKey();
      // Keep particles and banners settling behind the menus.
      if (screen === SCREEN_WIN || screen === SCREEN_OVER) world.step(STEP, { x: 0, y: 0 }, { x: 0, y: 0 }, false);
    }

    render(context, world.state, screen, best, audio.muted);
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}
