# MVP build prompt

Build a playable browser MVP called **The Guest on the Last Train**, a short 2D psychological horror game.

The player wakes on the last train home. It never stops, and a friend who should be dead is somewhere aboard. The train is almost completely dark: the player can see their surroundings only for a split second when they use a camera flash.

## Core loop

Explore connected train cars, flash to reveal doors, clues, and the friend's position, then move or hide before darkness returns. The camera has limited charge that recharges slowly. The friend moves when unseen and attacks if the player stays exposed or gets too close.

## Persistent death mechanic

Death restarts the ride, but the train remembers. After each death, one persistent detail changes: a new message appears, a door opens, a clue moves, or the friend behaves differently. These changes help the player solve the mystery and escape.

## MVP scope

- One train with three connected cars.
- Keyboard movement and a camera flash button.
- Three discoverable clues that form a solvable sequence.
- One enemy with clear movement and attack rules.
- A death and restart loop with persistent changes.
- One achievable ending.
- A title screen, brief controls, sound toggle, and visible flash charge and danger feedback.

Aim for a complete 10–15 minute experience with atmospheric pixel art and strong sound cues. Every visible control should work.

