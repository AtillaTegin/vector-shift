# VECTOR: Shift

Isometric physics-based billiard puzzle game. TypeScript + Three.js + Rapier3D (fixed 1/120 s step, CCD on every sphere), Vite, Electron.

## Run
    npm install
    npm run dev          # http://localhost:5173
    npm run build        # typecheck + production bundle in dist/
    npm run verify       # replays a known solution for every level headlessly and checks it wins within PAR
    npm run electron     # desktop window (needs `npm run build` first)
    npm run dist         # portable Windows .exe in release/

If Electron reports a missing binary, run `node node_modules/electron/install.js` once.

## Layout
- `src/core` — Game state machine, loop, input, undo, save
- `src/physics` — Simulation (Rapier world + puzzle logic), VectorRaycaster (multi-bounce/portal predictor), materials
- `src/entities` — Ball, PocketZone, SwitchPlate, PortalGate, LaserHoop, DynamicBarrier
- `src/levels` — level schema + 5 levels
- `src/render` — renderer/camera/bloom, level meshes, aim visualizer, procedural textures
- `src/ui` — HUD; `src/audio` — WebAudio synth
- `tools/` — `verify.ts`, `chain.ts` (greedy shot finder), `search.ts`, `trace.ts` for level design

## World 2 — Hydro Station
New mechanics (all simulated in `src/physics/Simulation.ts`, mirrored by the predictor in `VectorRaycaster.ts`):

| Mechanic | Model |
|---|---|
| Still water | drag `v *= e^(−1.1·dt)`; a sphere slower than 1.0 m/s inside a pool sinks |
| River / current | water drag + constant push (m/s²) along the flow; channels can spill off the deck |
| Open hole | a sphere drops if it hangs over the opening longer than `√(2·0.6r/g) ≈ 0.185 s` → needed speed = chord / 0.185 |
| Glass panel | breaks on one impact with normal speed ≥ 3 m/s; sphere continues at 55 % |
| Concrete panel | needs two impacts ≥ 4 m/s; continues at 45 % |
| Bumper plate / post | elastic rebound + 2.5 / 3.0 m/s kick along the normal |

The aim line is a physics integrator, not a ray: it applies rolling resistance, damping, water, currents,
holes, rebound spin-loss and panel thresholds, and the HUD "SHOT FORECAST" prints the numbers
(launch speed, water entry speed, hole speed vs. needed speed, panel breaks/holds, outcome).
`npx tsx tools/calibrate.ts` compares the forecast with the real simulation.

## Ball physics (v0.3)
`src/physics/BallModel.ts` — the cloth model used by real pool / Russian-pyramid simulators, integrated identically by the
Simulation and the aim predictor (they agree within ~0.03 units; run `npx tsx tools/calibrate.ts`):

- 1 world unit = 1 dm (ball r 0.28 ≈ 28 mm), g = 98.1 u/s², fixed step 1/240 s, CCD on all spheres
- sliding friction μs = 0.20 (slip decays at 3.5·μs·g → stun shots settle to 5/7 speed), rolling resistance μr = 0.011, spin friction μsp = 0.044
- ball–ball e = 0.95, cushion e ≈ 0.79, frictionless contacts (spin handled by the cloth model + rail english)
- cue-tip impact: spin ω = 5·v·b / 2r from tip offset b (centre = stun, 0.4r = natural roll, low = draw, side = english); max shot 5 m/s with a power^1.5 curve for fine control
- pocket styles: american (wide), standard, snooker (fast off-centre balls rattle out), russian (barely wider than the ball)

## Camera
Right-drag or Alt+left-drag orbits (yaw + pitch 10°–89°), touchpad: two-finger swipe rotates, pinch zooms, Shift+wheel tilts;
touch: one finger aims, two fingers rotate + pinch. Keys: Q/E turn, T/G tilt, V reset view.
