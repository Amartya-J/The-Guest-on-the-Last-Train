# Build plan: The Guest on the Last Train

## Goal

Ship a self-contained, playable browser game with a complete beginning, repeatable death loop, solvable mystery, and ending. Target a first playthrough of roughly 10–15 minutes, while allowing a faster replay once the solution is known.

## Experience and rules

1. Present a title screen with **Begin ride**, concise keyboard controls, and a working sound toggle. Keep the game playable with sound off.
2. Build one horizontally connected train with three distinct cars. Use pixel-scale canvas art, parallax windows, silhouettes, seats, doors, and small camera movement. Draw only a small dim area around the player in darkness; a camera flash reveals the scene for under a second.
3. Use `A/D` or arrow keys to move, `Space/F` to flash, `E` to inspect or operate, and `W/Up` to hide at marked seats. Show contextual prompts, a charge meter, car position, a clue journal, and a danger indicator.
4. Give the camera a finite charge with slow recharge. Flash exposes clues and briefly pins the friend in place. The friend advances while unseen; distance and time spent exposed create escalating danger. Hiding breaks pursuit but restricts movement.
5. Place three clues in a deliberate sequence: a ticket in car one, a torn note in car two, and a recorder in a service compartment in car three. Their text explains the friend, the loop, and how to stop the train. Make clues readable after discovery in a journal.
6. Make death restart the ride. Persist the death count and discovered journal entries in local storage. Each of the first deaths changes exactly one train detail: a new window message, then an opened service door, then a changed enemy response. Later deaths retain those changes and alter a smaller message. The opened door grants access to the final clue and ending.
7. End when the player has all three clues and operates the emergency release in the last car. Show a distinct ending screen with replay and sound controls.

## Implementation

- Use a buildless static app in `dist/`: `index.html`, CSS, and JavaScript. Keep core gameplay and art self-contained so it runs without a server API or external assets.
- Draw the train and characters on a low-resolution canvas scaled crisply. Use HTML for title, HUD, journal, death, and ending overlays. Use daisyUI classes for standard buttons and indicators, with local CSS for the game-specific visual treatment.
- Generate sound cues with Web Audio: rail rhythm, flash shutter, footsteps, warning pulse, enemy sting, death, and ending. Respect mute and browser audio activation rules.
- Use a clear state machine for title, playing, clue, death, and ending; keep simulation updates separate from rendering and input. Pause threat simulation while reading a clue.

## Verification

1. Check syntax and launch the static app locally.
2. In a browser, verify title controls, movement between all three cars, flash visibility and charge recovery, hiding, clue discovery, enemy danger and death, persistent changes after restarts, and the achievable ending.
3. Check a narrow viewport, keyboard focus, mute behavior, and that every visible button performs its stated action.

## Scope decisions

- The train is a side-view 2D corridor. Movement and interaction stay on one plane so the flash, pursuit, and hiding are immediately legible.
- The first two deaths are part of the intended mystery progression. The game explains this through changed scenery rather than requiring a hidden combination.
- No account, server, or downloaded art is required.

## Post-MVP expansion

- Add **double exposure**: flashing Mara captures one negative, and `R` projects it as a temporary decoy. The friend follows its light for a few seconds; direct contact remains dangerous. The HUD must clearly show when a negative is ready and when it is active.
- Deepen the train art with lit carriage fixtures, platform reflections, route signage, and distinct color cues for each car. Improve the title treatment and HUD without obscuring play.
- Fix the service-door boundary so it stays locked until the second death. Re-test a complete run, the new decoy, all overlays, mute, and a narrow viewport before publishing.
- Sync the deployed Site and GitHub repository from the tested source, then remove generated checkout files and unrelated IDE artifacts from Git tracking.
