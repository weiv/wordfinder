# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
bun dev      # Start Vite dev server (hot reload)
bun run build    # Production build to dist/
bun preview  # Preview the production build locally
```

There is no test runner configured in this project.

## Architecture

This is a single-page React app built with Vite, Tailwind CSS, and no backend — all word matching happens client-side.

**Entry point:** `index.html` → `src/main.jsx` → `src/App.jsx`

**Mode switching:** `App.jsx` holds a single `mode` state (`'wordle'` | `'crossword'` | `'letters'`, persisted to `localStorage`) and renders `WordleHelper`, `CrosswordHelper`, or `LettersHelper`. The tab nav bar lives directly in `App.jsx`.

**Word data:** `src/data/words.js` holds the Collins/SOWPODS word-game dictionary (A–Z only, lengths 3–15). The words are stored as a single space-joined string and split into the exported `WORDS` array at load. It also exports a `byLength` map (word length → array of words); all three helpers filter through `byLength` so each search only scans words of plausible length. Regenerate from a SOWPODS source if coverage needs updating.

**WordleHelper** (`src/components/WordleHelper.jsx`): Manages a 6×5 grid of `{ letter, state }` cells (persisted to `localStorage`). Cell states cycle through `empty → green → yellow → gray` on click. On search, it extracts green (exact position), yellow (present, wrong position), and gray (excluded) constraints and filters `byLength[5]`. Supports physical keyboard input and an on-screen QWERTY keyboard. Clicking a result drops it into the row currently being typed (or the first empty row). Duplicate-letter feedback is handled via per-letter min/max occurrence counts (e.g. one E yellow + another E gray in the same guess means "exactly one E").

**CrosswordHelper** (`src/components/CrosswordHelper.jsx`): Takes a pattern string where `_` or `?` are wildcards (non-letter/non-wildcard characters are stripped), converts it to a regex (`^...$`), and optionally filters by required letters. Pattern length selects the `byLength` bucket.

**LettersHelper** (`src/components/LettersHelper.jsx`): A Scrabble rack solver. "Your letters" is the rack (`.` = blank tile); an optional "Fixed pattern" row constrains words to incorporate board letters (`^`/`$` anchor start/end, `.` consumes a rack tile). Finds every makeable word via `canForm`/`matchPattern`, scored by Scrabble value (blanks score 0), sorted high-to-low. Words that consume the entire rack ("bingos") are highlighted red. Supports drag-and-drop tile reordering between the two rows, multiple named **sessions** (each with its own rack, pattern, and saved words, persisted to `localStorage`), and saving words. Renders Scrabble tiles via `ScrabbleTile`.

**WordResults** (`src/components/WordResults.jsx`): Shared display component used by WordleHelper and CrosswordHelper (LettersHelper renders its own richer cards). Renders nothing until `searched` is true, then shows match count and a scrollable list of matched words.

**Styling:** Tailwind utility classes throughout. Custom Wordle colors (`wordle-green`, `wordle-yellow`, `wordle-gray`) defined in `tailwind.config.js`. Tile state classes (`tile-green`, `tile-yellow`, `tile-gray`, `tile-empty`) defined as custom utilities in `src/index.css`.
