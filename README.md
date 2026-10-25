# The Guest on the Last Train

A short 2D psychological horror game concept. The player is trapped on the last train home with a friend who came back wrong. A camera flash briefly reveals the otherwise dark train, and each death changes what the train remembers.

## Play

Open `dist/index.html` in a browser, or serve the `dist` directory with any static server. For example: `python3 -m http.server 4173 --directory dist` and visit `http://localhost:4173`.

The current private deployment is [playable here](https://last-train-guest-20261025-aj.amar12356.chatgpt.site).

Source is backed up in the private [GitHub repository](https://github.com/Amartya-J/The-Guest-on-the-Last-Train). The game is static: `dist/` contains everything needed to serve it.

Move with **A/D** or **←/→**, flash with **F** or **Space**, inspect with **E**, hide near a seat with **W** or **↑**, project a captured negative with **R**, and open the journal with **J**. Flash Mara while she is nearby to capture her image; projecting it makes her pursue the afterimage for a few seconds. The sound toggle works from every screen. Progress is saved in this browser.

The build plan is in [BUILD_PLAN.md](BUILD_PLAN.md); the original scope is in [MVP_PROMPT.md](MVP_PROMPT.md).
