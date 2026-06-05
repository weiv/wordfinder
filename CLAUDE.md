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

**Mode switching:** `App.jsx` holds a single `mode` state (`'wordle'` | `'crossword'`) and renders either `WordleHelper` or `CrosswordHelper`. The `Header` component owns the tab UI that drives this toggle.

**Word data:** `src/data/words.js` holds the Collins/SOWPODS word-game dictionary (A–Z only, lengths 3–15). The words are stored as a single space-joined string and split into the exported `WORDS` array at load. It also exports a `byLength` map (word length → array of words); both helpers filter through `byLength[len]` so each search only scans words of the right length. Regenerate from a SOWPODS source if coverage needs updating.

**WordleHelper** (`src/components/WordleHelper.jsx`): Manages a 6×5 grid of `{ letter, state }` cells. Cell states cycle through `empty → green → yellow → gray` on click. On search, it extracts green (exact position), yellow (present, wrong position), and gray (excluded) constraints and filters `WORDS` accordingly. Supports both physical keyboard input and an on-screen QWERTY keyboard for mobile.

**CrosswordHelper** (`src/components/CrosswordHelper.jsx`): Takes a pattern string where `_` or `?` are wildcards, converts it to a regex (`^...$`), and optionally filters by required letters. Pattern length determines word length filter.

**WordResults** (`src/components/WordResults.jsx`): Shared display component used by both helpers. Renders nothing until `searched` is true, then shows match count and a scrollable list of matched words.

**Styling:** Tailwind utility classes throughout. Custom Wordle colors (`wordle-green`, `wordle-yellow`, `wordle-gray`) defined in `tailwind.config.js`. Tile state classes (`tile-green`, `tile-yellow`, `tile-gray`, `tile-empty`) defined as custom utilities in `src/index.css`.
