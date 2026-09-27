# Repository Guide

## Run And Verify

- This is a dependency-free browser app; there is no package manifest, build step, automated test suite, linter, or formatter.
- Serve it from the repository root with `python3 -m http.server 8000 --directory src`, then open `http://localhost:8000/`.
- Run focused JavaScript syntax checks with `node --check src/js/maze.js && node --check src/js/game.js && node --check src/js/render.js && node --check src/js/main.js`.
- Gameplay changes require browser verification: start/restart overlay, queued arrow turns, wall and pen-door collision, row-14 tunnel wrapping, dot/score updates, life reset, and win/loss states. Power-pellet changes also require: 50-pt corner pickup, frightened chase/flee flip, 200-pt capture with pen return, and blue/white blink expiry.

## Runtime Structure

- `src/index.html` loads classic scripts in dependency order: `maze.js`, `game.js`, `render.js`, `main.js`. They communicate through `window` globals, not ES modules; preserve this order unless converting every dependency together.
- `maze.js` owns the pristine 28x31 tile map and spawn constants. Tile values are `0` traversable, `1` wall, `2` dot, `3` ghost-pen door, and `4` power pellet at `(1, 1)`, `(26, 1)`, `(1, 29)`, `(26, 29)` (50 pts via `POWER_PELLET_POINTS`); coordinates are `(x, y)` from the top-left.
- `game.js` owns mutable game state and rules. `createGame()` must copy `MAZE`; consumed dots/pellets must mutate `game.grid`, never `MAZE`, so restart remains clean. `dotsRemaining` counts only tile `2`; tile `4` never counts toward victory. Global fright state lives in `game.frightenedSecondsRemaining` (`> 0` = active, +10s per pellet, capped at 20s, decremented by capped `deltaSeconds` max 0.25/frame); per-ghost post-capture waits live in `ghost.respawnSecondsRemaining`. `update()` expires fright before collisions and checks frightened capture before life loss.
- Ghosts carry `phase`: `waiting` (vertical bounce between rows 13-15), `exiting` (direct lane to `(exitLaneX, 11)`, then `active`), `active` (maze chase), `eatenWaiting` (post-capture bounce rows 13-15, immune, 10s via `respawnSecondsRemaining`, then `exiting`). Only `active`/`exiting` ghosts turn frightened (flee by max Manhattan, edible for fixed 200 pts with instant pen-teleport); `waiting`/`eatenWaiting` stay immune in normal colors. `resetPositions` cancels fright, clears post-capture waits, and restores all four ghosts to pen spawns in `waiting` with original `releaseAt`; consumed pellets stay consumed.
- The pen door (tile `3` at `(13, 12)` and `(14, 12)`) is one-way by phase: `isWall(grid, x, y, actor, phase)` and `canMove(..., actor, phase)` treat tile `3` as wall for `pacman` always and for `ghost` only when `phase === 'active'`; `waiting`/`exiting`/`eatenWaiting` keep crossing permission, and `exiting` moves by direct coordinates without collision checks. Ghost callers (`decideGhost`, `active` movement) must pass `ghost.phase`; omitted `phase` preserves the old permissive behavior outside `active`.
- `render.js` draws from `game.grid`. Its `TILE = 20`, the 28x31 map, and the canvas size `560x620` are coupled; change them together. Tile `4` renders as a fixed 6-px circle; frightened `active`/`exiting` ghosts render blue with a scared face, blinking blue/white every 0.25s during the last 2s of `frightenedSecondsRemaining` (derived from time remaining, not frame count).
- Movement is measured in cells per animation frame. Turning and ghost decisions happen only on integer-cell alignment; speed changes must still reach exact cell boundaries or account for alignment explicitly.
- Ghost targeting is deterministic (`getGhostTarget` per kind); there is no `Math.random()` in `src/js`, so no randomness stubbing is needed.

## Spec Workflow

- For large features, use repo-local `/spec`; it asks required clarification questions and writes a numbered Draft under `specs/`. Full rules live in `.agents/skills/spec/SKILL.md`.
- Implement with `/spec-impl` only after a human changes spec state to an Approved equivalent. That workflow controls `spec-NN-slug` branch creation and requires a review pause after each plan step; see `.agents/skills/spec-impl/SKILL.md`.
