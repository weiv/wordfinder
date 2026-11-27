# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
bun dev      # Start Vite dev server (hot reload)
bun run build    # Production build to dist/
bun preview  # Preview the production build locally
bun test     # Engine + storage tests (bun's built-in runner; `bun run test` = `bun test src`)
```

## Architecture

This is a single-page React app built with Vite, Tailwind CSS, and no backend — all word matching happens client-side.

**Entry point:** `index.html` → `src/main.jsx` → `src/App.jsx`

**Mode switching:** `App.jsx` holds a single `mode` state (`'wordle'` | `'crossplay'` | `'letters'`, persisted to `localStorage`; a stored `'crossword'` maps to `'crossplay'`) and renders `WordleHelper`, `CrossplayHelper`, or `LettersHelper`. The top nav bar (in `App.jsx`) shares one row across the three mode tabs plus a `?` help toggle and a `Reset` button. `App` owns `showHelp` (passed to the active helper) and a `resetRef` that each helper assigns its `handleReset` to, so the shared buttons drive the active mode.

**Word data:** `src/data/words.js` holds the NWL2023 (NASPA) dictionary minus the ~180 trademark/proper-noun words NYT Crossplay rejects (A–Z only, lengths 2–15). The words are stored as a single space-joined string and split into the exported `WORDS` array at load. It also exports a `byLength` map (word length → array of words); all three helpers filter through `byLength` so each search only scans words of plausible length. Source: `scrabblewords/scrabblewords` on GitHub (`words/North-American/NWL2023.txt`); cut list from `131ackknight/crossplay-helper` `crossplay-cuts.js`.

**WordleHelper** (`src/components/WordleHelper.jsx`): Manages a 6×5 grid of `{ letter, state }` cells (persisted to `localStorage`). Cell states cycle through `empty → green → yellow → gray` on click. On search, it extracts green (exact position), yellow (present, wrong position), and gray (excluded) constraints and filters `byLength[5]`. Supports physical keyboard input and an on-screen QWERTY keyboard. Clicking a result drops it into the row currently being typed (or the first empty row). Duplicate-letter feedback is handled via per-letter min/max occurrence counts (e.g. one E yellow + another E gray in the same guess means "exactly one E").

**Crossplay engine** (`src/crossplay/`, see `docs/superpowers/specs/2026-11-27-crossplay-companion-design.md`): framework-free ES modules (no React/DOM/localStorage) so a native port can reuse them — `rules.js` (board premiums, tile set, values, sweep +40), `lexicon.js` (typed-array trie built from `WORDS`), `board.js` (`evaluatePlay`/`playFromPlacement`/`replay` — validation and scoring), `movegen.js` (Appel–Jacobson `generateMoves`), `ranking.js` (score + rack-leave), `tiles.js` (unseen/bag). Tests and JSON fixtures live beside them; `fixtures/screenshot-game.json` is a real game whose scores and bag count match Crossplay.

**CrossplayHelper** (`src/components/CrossplayHelper.jsx`, board in `CrossplayBoard.jsx`, storage in `crossplayStorage.js`): multiple games (`crossplayGames`/`crossplayActiveGameId` in `localStorage`), each a JSON move log (`{player, kind, row, col, dir, word, reported?}`; lowercase letter = blank) plus the rack. Board, scores, bag and unseen tiles are all derived by replaying the log. Moves are entered by tapping a start square and typing the new letters; best moves come from `rankMoves(generateMoves(...))`.

**LettersHelper** (`src/components/LettersHelper.jsx`): A Scrabble rack solver. "Your letters" is the rack (`.` = blank tile); an optional "Fixed pattern" row constrains words to incorporate board letters (`^`/`$` anchor start/end, `.` consumes a rack tile). Finds every makeable word via `canForm`/`matchPattern`, scored by Scrabble value (blanks score 0), sorted high-to-low. Words that consume the entire rack ("bingos") are highlighted red. Supports drag-and-drop tile reordering between the two rows, multiple named **sessions** (each with its own rack, pattern, and saved words, persisted to `localStorage`), and saving words. Renders Scrabble tiles via `ScrabbleTile`.

**WordResults** (`src/components/WordResults.jsx`): Shared display component used by WordleHelper (LettersHelper renders its own richer cards). Renders nothing until `searched` is true, then shows match count and a scrollable list of matched words.

**Styling:** Tailwind utility classes throughout. Custom Wordle colors (`wordle-green`, `wordle-yellow`, `wordle-gray`) defined in `tailwind.config.js`. Tile state classes (`tile-green`, `tile-yellow`, `tile-gray`, `tile-empty`) defined as custom utilities in `src/index.css`.
