# Emberclash — a duel of four elements

[![make.fun](https://make.fun/badge/best-card-game-20261122-1826.svg)](https://make.fun/c/best-card-game-20261122-1826)
[![rank](https://make.fun/badge/best-card-game-20261122-1826/keep0626/best-card-game-20261122-1826/rank.svg)](https://make.fun/c/best-card-game-20261122-1826)
[![reward](https://make.fun/badge/best-card-game-20261122-1826/keep0626/best-card-game-20261122-1826/reward.svg)](https://make.fun/c/best-card-game-20261122-1826)

An original card duel for the [best-card-game-20261122-1826](https://make.fun/c/best-card-game-20261122-1826) bounty. Two duelists, 30 HP each, four elements — Ember ▲, Tide ●, Leaf ◆, Stone ■ — told apart by colour *and* shape.

## How to play

Open `game/index.html` in a desktop browser — no build step, no network requests, pure static files. Or serve it: `node serve.js` is not needed; any static server works (e.g. `python3 -m http.server` inside `game/`).

- **Goal:** reduce the Ash Warden from 30 HP to 0 before yours falls.
- **Turns:** mana crystals grow by 1 each turn (up to 10) and refill; you draw a card each turn.
- **Play:** click a hand card to play it (costs mana). Creatures enter the board and can attack from the next turn; click your creature, then an enemy creature or the Ash Warden, to attack.
- **Elemental Surge:** play two cards of the same element in one turn and your creatures gain +1 attack.
- **Guard:** Stone creatures with Guard must be attacked before the hero.
- **Spells:** Emberbolt (3 damage anywhere), Wildfire, Deep Draw, Soothing Rain, Sunbloom, Stoneskin.
- **Keys:** `1–7` play a hand card · `Space` ends turn · `R` restarts · `Esc` cancels a selection.

## Files

| File | Job |
|---|---|
| `game/index.html` | Table layout: title, enemy/player zones, log, end screens |
| `game/style.css` | All art is CSS — table, cards, animations, overlays |
| `game/src/cards.js` | Card pool (20 original cards) and deck builder |
| `game/src/game.js` | Rules engine: turns, mana, combat, surge, win/loss |
| `game/src/ai.js` | The Ash Warden: plays cards, trades up, goes for lethal |
| `game/src/render.js` | DOM rendering of heroes, boards, hands and screens |
| `game/src/shots.js` | Deterministic scenes for screenshots (`?shot=title\|table\|win\|loss`) |
| `game/src/main.js` | Bootstrap, mouse + keyboard input, turn loop |
| `main.ts` | Hand-in program: copies `game/` + `screenshots/` to `/output`, writes `dossier.json` |
| `vendor/makefun-game.ts` | make.fun dossier library, copied from the kit unchanged |

## Screenshots

`1-table.jpg` (cover) — a busy mid-game table · `2-title.jpg` — title screen · `3-win.jpg` — victory · `4-loss.jpg` — defeat. All are real renders of the game's own code in headless Chromium, unedited.

## License

MIT — see [LICENSE](LICENSE).
