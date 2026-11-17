// Emberlight Salvage — keyboard and mouse input.
// One clear job: turn raw key and pointer events into one tidy state the
// world reads each step: a move vector, where the mouse aims, whether the
// player is firing, and which menu keys were just pressed.

/**
 * Attach listeners to `element` (the canvas) and the window.
 * Returns the live input state plus `consumePressed(code)`, which reports
 * a key once per press — menus use it so holding Enter does not skip screens.
 */
export function createInput(element) {
  const keys = new Set();
  const pressed = new Set();
  const state = {
    moveX: 0,
    moveY: 0,
    /** Mouse position in canvas pixels. */
    mouseX: 480,
    mouseY: 300,
    firing: false,
    mouseDown: false,
  };

  function updateMove() {
    const left = keys.has('ArrowLeft') || keys.has('KeyA') ? 1 : 0;
    const right = keys.has('ArrowRight') || keys.has('KeyD') ? 1 : 0;
    const up = keys.has('ArrowUp') || keys.has('KeyW') ? 1 : 0;
    const down = keys.has('ArrowDown') || keys.has('KeyS') ? 1 : 0;
    state.moveX = right - left;
    state.moveY = down - up;
  }

  function isGameKey(code) {
    return (
      code.startsWith('Arrow') ||
      code === 'Space' ||
      code === 'KeyW' ||
      code === 'KeyA' ||
      code === 'KeyS' ||
      code === 'KeyD'
    );
  }

  window.addEventListener('keydown', (event) => {
    if (isGameKey(event.code)) event.preventDefault();
    if (!event.repeat) pressed.add(event.code);
    keys.add(event.code);
    updateMove();
    state.firing = keys.has('Space') || state.mouseDown;
  });

  window.addEventListener('keyup', (event) => {
    keys.delete(event.code);
    updateMove();
    state.firing = keys.has('Space') || state.mouseDown;
  });

  window.addEventListener('blur', () => {
    keys.clear();
    state.mouseDown = false;
    updateMove();
    state.firing = false;
  });

  function trackPointer(event) {
    const rect = element.getBoundingClientRect();
    const scaleX = element.width / rect.width;
    const scaleY = element.height / rect.height;
    state.mouseX = (event.clientX - rect.left) * scaleX;
    state.mouseY = (event.clientY - rect.top) * scaleY;
  }

  element.addEventListener('pointermove', trackPointer);
  element.addEventListener('pointerdown', (event) => {
    trackPointer(event);
    state.mouseDown = true;
    state.firing = true;
  });
  window.addEventListener('pointerup', () => {
    state.mouseDown = false;
    state.firing = keys.has('Space');
  });

  return {
    state,
    /** True once for each fresh press of `code`; clears after reading. */
    consumePressed(code) {
      if (!pressed.has(code)) return false;
      pressed.delete(code);
      return true;
    },
    /** Clear a press without acting on it (used when a screen changes). */
    clearPressed(code) {
      pressed.delete(code);
    },
  };
}
