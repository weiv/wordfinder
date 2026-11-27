# Crossplay Companion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Crossword tab with a Crossplay tab that tracks a full game (board, scores, unseen tiles) from a hand-entered move log and lists the strongest plays for the user's rack.

**Architecture:** A framework-free engine in `src/crossplay/` (rules, lexicon, board/scoring, move generation, ranking, tile accounting), tested with `bun test` against JSON fixtures. A React screen `src/components/CrossplayHelper.jsx` (plus a board component and a storage helper) sits on top. Game state is a JSON move log in `localStorage`; everything else is derived.

**Tech Stack:** React 18, Vite 5, Tailwind 3, Bun (`bun test`), plain ES modules.

**Spec:** `docs/superpowers/specs/2026-11-27-crossplay-companion-design.md`

## Global Constraints

- Engine files under `src/crossplay/` must not import React, touch the DOM, or use `localStorage`. The lexicon receives its word array as an argument.
- All engine state is JSON-serialisable plain data.
- Board 15×15; rack 7; sweep bonus 40; letter values and tile counts exactly as the spec's rules table; premium layout exactly the spec's 15-line grid.
- Notation: internal `(row, col)` 0-based; display rows 1–15, columns A–O; across `8H`, down `H8`. In words, a **lowercase letter is a blank**. In racks, a blank is `?`.
- Dictionary: `WORDS` from `src/data/words.js` (2–15 letters).
- First play must cover the centre `(7,7)`; the centre has no bonus.
- Storage keys `crossplayGames`, `crossplayActiveGameId`; read on mount and re-synced on `storage` / `visibilitychange` / `pageshow`; stored `mode = "crossword"` maps to `"crossplay"`.
- Performance: no noticeable UI freeze on a phone; best-move list for a rack with 2 blanks well under a second.
- Every commit message contains `[skip netlify]` and ends with the session's Co-Authored-By / Claude-Session lines.
- Letters and Wordle tabs unchanged (except Wordle still uses `WordResults.jsx`, which stays).

## Review Focus

1. **Plays that extend an existing word** (e.g. adding S to COWPAT, or prefixing): the main word must include adjacent board tiles before and after the new tiles; a stored play whose word stops short of an adjacent tile is invalid. → tests in Task 3.
2. **Single-tile plays**: the main word is whichever direction forms a word of length ≥ 2; a tile forming words in both directions scores both, once each; a lone tile touching nothing is invalid. → tests in Task 3.
3. **Blanks**: a blank scores 0 even on a letter premium but still gets word multipliers; a rack with two blanks generates plays without freezing. → tests in Tasks 3 and 5.
4. **Undo right after Play** returns the played tiles to the rack (up to 7); undo of an opponent move leaves the rack alone. → test in Task 7.
5. **Corrupt or missing saved data** (bad JSON, empty array, unknown active id) loads a fresh game instead of crashing. → test in Task 7.

---

### Task 1: Rules, notation, and test setup

**Files:**
- Create: `src/crossplay/rules.js`, `src/crossplay/notation.js`, `src/crossplay/rules.test.js`
- Modify: `package.json` (add `"test": "bun test src/crossplay"`)

**Interfaces:**
- Produces (`rules.js`): `SIZE = 15`, `CENTER = 7`, `RACK_SIZE = 7`, `SWEEP_BONUS = 40`, `BLANK = '?'`, `LETTER_VALUES: Record<A–Z, number>`, `TILE_COUNTS: Record<A–Z | '?', number>`, `PREMIUM_ROWS: string[15]` (spec grid verbatim), `premiumAt(row, col) -> 'TW'|'DW'|'TL'|'DL'|null`, `tileValue(ch) -> number` (lowercase → 0).
- Produces (`notation.js`): `formatPlay({row, col, dir}) -> string` (`dir` is `'across'|'down'`), `parseSquare('H8') -> {row, col}`.

- [ ] **Step 1: Write failing tests** in `rules.test.js`:
  - `TILE_COUNTS` sums to 100 and `TILE_COUNTS['?'] === 3`.
  - Premium counts: 8 `TW`, 8 `DW`, 20 `TL`, 20 `DL`; `premiumAt(7,7) === null`; `premiumAt(0,0) === 'TL'`, `premiumAt(0,3) === 'TW'`, `premiumAt(3,7) === 'DW'`, `premiumAt(4,9) === 'TL'`, `premiumAt(7,9) === 'DL'`.
  - Mirror symmetry: `premiumAt(r,c) === premiumAt(14-r,c) === premiumAt(r,14-c) === premiumAt(c,r)` for all cells.
  - `tileValue('V') === 6`, `tileValue('v') === 0`.
  - `formatPlay({row:7,col:7,dir:'across'}) === '8H'`, `formatPlay({row:3,col:9,dir:'down'}) === 'J4'`; `parseSquare('J4')` → `{row:3,col:9}`.
- [ ] **Step 2:** `bun test src/crossplay` → FAIL (modules missing).
- [ ] **Step 3:** Implement both modules and the `test` script.
- [ ] **Step 4:** `bun test src/crossplay` → PASS.
- [ ] **Step 5:** Commit `Crossplay: rules and notation [skip netlify]`.

### Task 2: Lexicon

**Files:**
- Create: `src/crossplay/lexicon.js`, `src/crossplay/lexicon.test.js`

**Interfaces:**
- Produces: `createLexicon(words: string[]) -> Lexicon` where
  `Lexicon = { root: number, child(node, letter) -> number /* -1 if none */, isTerminal(node) -> boolean, isWord(word) -> boolean }`. Letters are uppercase A–Z. Node ids are integers so the structure can be backed by typed arrays.

- [ ] **Step 1: Write failing tests:** with `createLexicon(['AT','CAT','CATS','COW'])`: `isWord('CAT')`, `!isWord('CA')`, `!isWord('DOG')`; walking `child` from `root` through C,A reaches a non-terminal node, then T a terminal one. With the full `WORDS`: `isWord('ZA')`, `isWord('RUBACE')`, `isWord('JOBBER')`, `!isWord('FRISBEE')`, and building takes < 1500 ms on this machine (log the time).
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement as a compact trie in typed arrays (e.g. first-child / next-sibling / letter / terminal arrays), built from the word array in one pass. Structure choice (trie vs DAWG) is the builder's, within the timing above.
- [ ] **Step 4:** Run → PASS; note the build time in the commit message.
- [ ] **Step 5:** Commit `Crossplay: lexicon [skip netlify]`.

### Task 3: Board, play evaluation, replay

**Files:**
- Create: `src/crossplay/board.js`, `src/crossplay/board.test.js`, `src/crossplay/fixtures/screenshot-game.json`, `src/crossplay/fixtures/validity.json`

**Interfaces:**
- Consumes: `rules.js`, `Lexicon` (optional argument).
- Produces:
  - `Cell = null | { letter: 'A'–'Z', blank: boolean }`; `Board = Cell[225]` (index `row*15+col`).
  - `emptyBoard() -> Board`; `cellAt(board, row, col) -> Cell`.
  - `Play = { row, col, dir: 'across'|'down', word }` — word covers the whole contiguous line including existing tiles; lowercase = blank.
  - `evaluatePlay(board, play, lexicon?) -> { ok: boolean, error?: string, placed: {row,col,letter,blank}[], words: {word, score}[], score: number, sweep: boolean, unknownWords: string[] }`. Errors: off-board, mismatch with an existing tile, no new tiles, word not maximal (adjacent tile before/after), not connected, first play not covering centre, single tile forming no word ≥ 2. `unknownWords` lists formed words the lexicon lacks (does not set `ok=false`; the UI decides).
  - `playFromPlacement(board, placed: {row,col,letter,blank}[]) -> Play | null` — builds the maximal-line Play (direction inferred; for one tile prefer the direction with a word ≥ 2, across first).
  - `applyPlay(board, play) -> Board` (new array).
  - `Move = { player: 'me'|'opp', kind: 'play'|'swap'|'pass', row?, col?, dir?, word?, reported?: number }`.
  - `replay(moves: Move[]) -> { board: Board, results: { score: number, counted: number, mismatch: boolean, error?: string }[], totals: { me: number, opp: number } }` — `counted = reported ?? score`; `mismatch = reported != null && reported !== score`.

- [ ] **Step 1: Write fixtures and failing tests.**
  `screenshot-game.json`: moves in order — me `RUBACE` (row 3, col 7, down), opp `JOBBER` (row 5, col 4, across), me `COWPAT` (row 7, col 7, across), opp `THREW` (row 3, col 9, down); expected scores `[32, 41, 38, 17]`, totals `{me:70, opp:58}`.
  Tests: replay matches the fixture; `formatPlay` of THREW is `J4`; a blank version of RUBACE (`rUBACE`) scores 30 (R's 1 point gone, still ×2); playing `S` at (7,13) across gives word `COWPATS` with `playFromPlacement`, and `evaluatePlay` of `{row:7,col:8,dir:'across',word:'OWPATS'}` fails as not maximal.
  `validity.json`: each case `{ moves, play, ok, error? }` covering — first play off centre; gap in new tiles; disconnected play; tile mismatch; single tile forming two words (both scored); lone single tile on empty neighbours; play using all 7 tiles gets `sweep: true` and `+40` (one hand-computed case on an empty board, e.g. a 7-letter word through the centre).
- [ ] **Step 2:** `bun test src/crossplay` → new tests FAIL.
- [ ] **Step 3:** Implement. Scoring: new tiles get letter premiums; word multipliers from squares covered by new tiles multiply (and stack); premiums under existing tiles ignored; each cross-word scored the same way; +40 when 7 tiles placed.
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit `Crossplay: board, scoring, replay [skip netlify]`.

### Task 4: Tile accounting

**Files:**
- Create: `src/crossplay/tiles.js`, `src/crossplay/tiles.test.js`

**Interfaces:**
- Produces: `unseenTiles(board, rack: string) -> Record<A–Z|'?', number>` (TILE_COUNTS − board tiles (blanks count as `?`) − rack); `bagCount(board, rack) -> number` = `max(0, sum(unseen) − 7)`; `overdrawn(board, rack) -> string[]` letters whose unseen count would be negative.

- [ ] **Step 1: Failing tests:** on the screenshot board with rack `EGROFVI`: sum of unseen = 73, `bagCount = 66`, unseen `J = 0`, `B = 0`, `W = 1`, `'?' = 3`; rack `QQ` on an empty board → `overdrawn` = `['Q']`.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement. **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit `Crossplay: tile accounting [skip netlify]`.

### Task 5: Move generation

**Files:**
- Create: `src/crossplay/movegen.js`, `src/crossplay/movegen.test.js`

**Interfaces:**
- Consumes: `Lexicon`, `Board`, `evaluatePlay`.
- Produces: `generateMoves(board, rack: string, lexicon) -> GenPlay[]`, `GenPlay = Play & { score: number, sweep: boolean, tiles: string /* rack tiles used, '?' for blanks */, leave: string /* remaining rack */ }`. No duplicates (same row/col/dir/word). A one-tile play appears once.

- [ ] **Step 1: Failing tests:**
  - Small lexicon brute-force: with `createLexicon(['AT','TA','CAT','ACT','TAT','CATS','SCAT'])`, a board holding `CAT` across through centre, and rack `AST?`: the set of `generateMoves` results equals the set obtained by trying every word of that list at every square and direction (with every blank assignment) through `evaluatePlay` and keeping `ok` results that use only rack tiles. Compare `row,col,dir,word,score`.
  - Full dictionary, screenshot position, rack `EGROFVI`: every result re-evaluates via `evaluatePlay` with `ok` and the same score; results non-empty; finishes in < 500 ms.
  - Empty board, rack `??AEIRS`: completes in < 2000 ms on this machine and every play covers the centre.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement the anchor/cross-check algorithm (Appel–Jacobson): compute cross-check letter sets per empty square per direction; for each anchor, extend left (limited by non-anchor empty squares) then right through the lexicon; on the empty board the only anchor is the centre. Score via shared scoring code (not by calling `evaluatePlay` per candidate if that's too slow — but results must match it).
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit `Crossplay: move generator [skip netlify]`.

### Task 6: Ranking

**Files:**
- Create: `src/crossplay/ranking.js`, `src/crossplay/ranking.test.js`, `src/crossplay/index.js` (re-exports the public API of all engine modules)

**Interfaces:**
- Produces: `leaveValue(leave: string) -> number`; `rankMoves(plays: GenPlay[]) -> (GenPlay & { equity: number })[]` sorted by `equity = score + leaveValue(leave)` desc, ties by score desc then word.

- [ ] **Step 1: Failing tests:** `leaveValue('?') > leaveValue('S') > 0`; `leaveValue('Q') < 0`; `leaveValue('UUV') < leaveValue('ERS')`; `leaveValue('') === 0`; `rankMoves` puts a 30-point play leaving `?` above a 31-point play leaving `QUV`.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement a small per-tile table plus duplicate and vowel/consonant-balance penalties (builder's numbers, kept to one table at the top of the file).
- [ ] **Step 4:** Run → PASS. **Step 5:** Commit `Crossplay: leave ranking [skip netlify]`.

### Task 7: Game storage and the Crossplay tab shell

**Files:**
- Create: `src/components/crossplayStorage.js`, `src/components/crossplayStorage.test.js`, `src/components/CrossplayBoard.jsx`, `src/components/CrossplayHelper.jsx`
- Modify: `src/App.jsx` (tab `crossplay` / "Crossplay" replaces `crossword`; map stored `crossword` → `crossplay`)
- Delete: `src/components/CrosswordHelper.jsx`

**Interfaces:**
- Produces (`crossplayStorage.js`, pure functions taking a storage object so they test without a browser):
  `Game = { id, name, opponent, rack, moves: Move[], createdAt }`;
  `newGame(opponent: string) -> Game`; `loadGames(storage) -> { games: Game[], activeId }` (bad JSON / empty / unknown id → one fresh game);
  `saveGames(storage, games, activeId)`; `undoLastMove(game) -> Game` (if the undone move is a `me` play, append its placed rack tiles — blanks as `?` — back to `rack` up to 7).
- Produces (`CrossplayBoard.jsx`): `<CrossplayBoard board preview? selection? onSquareTap(row,col) />` — 15×15 grid sized to container width, premium colours like Crossplay (3W purple, 2W blue, 3L green, 2L yellow), tiles with value subscripts, blanks styled distinctly, `preview` tiles shown as ghost tiles, `selection = {row,col,dir}` shows an arrow.
- `CrossplayHelper({ showHelp, resetRef })`: games strip (tap switch, long-press rename/delete like Letters' `SessionPill`, `+` asks opponent name), score line `You N · Opp N`, bag count, board, read-only rack. Uses the same mount-time load + re-sync effect as `LettersHelper`.

- [ ] **Step 1: Failing tests** (`bun test src/components/crossplayStorage.test.js` with an in-memory storage stub): `loadGames` on `'{bad'`, on `'[]'`, and with an unknown active id each yields one game and a valid `activeId`; `undoLastMove` after a `me` play of `FIVE` with rack `GRO` gives rack `GROFIVE`; after an `opp` play leaves the rack unchanged; save → load round-trips.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement storage, board, shell, App change; delete CrosswordHelper. Update the `test` script to `bun test src`.
- [ ] **Step 4:** `bun test src` → PASS; `bun run build` succeeds; manual check in `bun dev`: the tab shows an empty board with correct premium squares, games can be created/renamed/deleted, and survive switching tabs and reloading.
- [ ] **Step 5:** Commit `Crossplay: tab shell, board, game storage; remove Crossword [skip netlify]`.

### Task 8: Logging moves

**Files:**
- Modify: `src/components/CrossplayHelper.jsx`

**Interfaces:**
- Consumes: `evaluatePlay`, `playFromPlacement`, `replay`, `undoLastMove`, `formatPlay`.

Behaviour (spec "Logging a move"): tap a square to start (tap the same square again toggles across/down); typed letters fill successive empty squares along the line, skipping occupied ones; a `?` key marks the next letter as a blank; DEL removes the last typed letter; a live preview shows the formed word and computed score (or the error); **Me / Opponent** toggle; optional "Crossplay score" number field; **Log** button enabled when `ok` (unknown words show a warning and need a second tap); **Swap**, **Pass**, **Undo** buttons. Move list (collapsible) shows each move with notation, score, and a ⚠ when `mismatch`. Logging a `me` play removes its tiles from the rack (blanks consume `?`). Physical keyboard works too.

- [ ] **Step 1:** Implement.
- [ ] **Step 2:** Manual check in `bun dev`: re-enter the screenshot game (RUBACE H4↓ me, JOBBER 6E opp, COWPAT 8H me, THREW J4↓ opp, typing only new letters) → totals 70 / 58; entering `reported: 18` on THREW shows ⚠ and totals use 18; Undo removes it; reload keeps the game.
- [ ] **Step 3:** `bun test src` and `bun run build` pass. Commit `Crossplay: move logging [skip netlify]`.

### Task 9: Rack, best moves, unseen tiles, help, reset

**Files:**
- Modify: `src/components/CrossplayHelper.jsx`
- Modify: `CLAUDE.md` (replace the CrosswordHelper section with Crossplay tab + engine; mention `bun test`)

**Interfaces:**
- Consumes: `generateMoves`, `rankMoves`, `unseenTiles`, `bagCount`, `overdrawn`, `createLexicon` (created once per page load, lazily on first Crossplay mount, outside React state, e.g. a module-level cache in the component file — this cache holds the immutable lexicon, not game state).

Behaviour: rack editing with the on-screen keyboard (max 7, `?` for blank, warning listing `overdrawn` letters); best-moves list from `rankMoves(generateMoves(...))`, top 30, each row `WORD  notation  score  leave` with sweeps marked; tapping a row previews it on the board; **Play** logs it as a `me` move. Unseen tiles: collapsible strip of letter counts. `?` help explains entry, notation, blanks, reported score. Shared `Reset` clears the active game's moves and rack after an in-page confirm (no `window.confirm`). If move generation takes noticeably long on a phone, move lexicon build + generation into a Web Worker.

- [ ] **Step 1:** Implement.
- [ ] **Step 2:** Manual check in `bun dev` (desktop and a narrow 375px viewport): screenshot game with rack `EGROFVI` lists plays; tapping one previews; Play logs it, rack shows the leave, totals update; unseen counts match `tiles.test.js`; rack `??AEIRS` on a new game returns the list without a visible freeze.
- [ ] **Step 3:** `bun test src` and `bun run build` pass. Commit `Crossplay: best moves, rack, unseen tiles [skip netlify]`.
- [ ] **Step 4:** Deploy locally: `sudo systemctl restart wordfinder` (the build is already in `dist/`), confirm `systemctl is-active wordfinder`.
