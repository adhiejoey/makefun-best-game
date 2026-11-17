# Emberlight Salvage

An original arcade wave-survival game, built for make.fun's **“Make the best game”**
bounty (`best-game-01`, $1,000). Pilot a salvage skiff through a field of cinder
rocks and hunter drones, bank ember shards, and clear all 8 waves to complete
the salvage run.

## How to play

- **Goal:** collect **10 ember shards** to open the warp gate and clear a wave.
  Clear **all 8 waves** to win. Lose all 3 hull hearts and the run ends.
- **Move:** WASD or arrow keys. **Aim:** mouse. **Fire:** click or Space.
- **Pause:** P. **Restart:** R (or the button on the end screens). **Sound:** M.
- **Scoring:** shard +25, rock broken +10, drone destroyed +30, wave bonus
  +100 (+25 per wave). Your best score is kept in the browser (localStorage).
- **Difficulty:** rocks fall faster and spawn more often each wave; hunter
  drones join from wave 3.

## Run it

No build step, no network — every file the game loads lives under `game/`.

```sh
node serve.ts
# open http://localhost:8080 in desktop Chrome
```

Or open `game/index.html` directly from disk in a browser. The tested path is
served over HTTP as above; opening from `file://` is untested here.

Node 22.18 or later is required for `main.ts` / `serve.ts`.

## Screenshots

`screenshots/` holds 4 real renders of the game's own code, staged with
`?shot=…&seed=1` (see `shots.json`):

1. `1-start.png` — title screen
2. `2-play.png` — play in progress, with HUD
3. `3-win.png` — win screen after clearing wave 8
4. `4-end.png` — game-over screen, with restart

The shots are posed by `game/src/shots.js`, which plays the real rules
forward with a simple autopilot from a fixed seed — no image is edited,
composited or borrowed.

## Layout

```
main.ts                  Node 22 entrypoint: copies game/ + screenshots/ to
                         the output dir and writes dossier.json
serve.ts                 tiny local static server for game/
shots.json               the 4 screenshot scenes (?shot=…&seed=1)
LICENSE                  MIT (SPDX-License-Identifier: MIT)
game/
  index.html             page shell + canvas
  src/config.js          tuning: speeds, scores, waves, palette
  src/random.js          seeded RNG (deterministic replays)
  src/audio.js           WebAudio synth sounds, no audio files
  src/input.js           keyboard + mouse state
  src/world.js           simulation: skiff, rocks, drones, shards, waves
  src/render.js          canvas drawing: field, HUD, menus
  src/shots.js           screenshot staging autopilot
  src/main.js            screens, game loop, wiring
vendor/
  makefun-game.ts        make.fun kit library, copied unchanged
screenshots/            1-start.png, 2-play.png, 3-win.png, 4-end.png
```

## Handing it in (for the parent agent, not done here)

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

That writes `out/game/`, `out/screenshots/` and `out/dossier.json`. The
entry is **not** submitted from this workspace: submission still needs a
public GitHub repository (created after the competition opened,
2026-11-15T18:00:00Z) or a source bundle, the kit CLI's transcript bundle,
and a Solana wallet signature — none of which this local build does.

## Originality

Every name, sprite, sound and rule here is original: the game is drawn
entirely with canvas shapes and synthesised WebAudio, with no copied art,
music, characters or levels from any commercial game.
