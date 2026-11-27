# Crossplay Companion — design

Date: 2026-11-27 · Status: draft for approval

## Intent

The user plays NYT **Crossplay** (a Scrabble-like word game) on iPhone/iPad against
human opponents. They want an app that, mid-game, shows the **strongest moves** they
can make right now, based on everything known: the board, their rack, and which tiles
are still unseen. Keeping score and tracking tiles fall out of the same data.

It replaces the unused **Crossword** tab of this app. The **Letters** tab stays as is
(it serves other games). The user is considering shipping this later as a standalone
native iOS/Android app ("Crossplay Companion"), so the game logic must be portable.

## Goals

1. Track a whole game: every move by either player is logged; the board, both scores,
   the bag count and the unseen tiles are derived from that log.
2. Given the board and the user's rack, list the best legal plays, ranked, with each
   play's score and the tiles it leaves on the rack.
3. Several games at once (the user plays multiple opponents), each persisted locally and
   never lost (see the stale-snapshot bug fixed in `0f0de3f`).
4. Game logic lives in a framework-free module with data-driven tests, so a React Native
   port reuses it as-is and a Swift/Kotlin port can be verified against the same tests.

## Non-goals (for now)

- Reading the board from a screenshot (planned later, "B").
- Syncing games between devices (each device's browser storage is separate).
- Guessing the opponent's rack, simulating replies, or endgame solving.
- Playing against the app. Any change to the Letters or Wordle tabs.

## Anti-goals (failure even if it "works")

- Suggesting a play Crossplay would reject (wrong dictionary, illegal placement).
- Scores that disagree with Crossplay for the same play.
- Losing or silently overwriting a game.
- Freezing the page on a phone (dictionary loading or move search blocking the UI for
  more than a moment).

## Crossplay rules (as built)

| Rule | Value | Confidence |
|---|---|---|
| Board | 15×15, layout below | Transcribed from the user's screenshot; verified by the screenshot's scores (see below) |
| Tiles | 100: A9 B2 C2 D4 E12 F2 G3 H3 I8 J1 K1 L4 M2 N5 O8 P2 Q1 R6 S5 T6 U3 V2 W2 X1 Y2 Z1, 3 blanks | Third-party guides; sums to 100. Confirmed by the screenshot: 100 − 19 on board − 14 in racks = 67, the bag count shown |
| Letter values | A E I N O R S T 1 · D L U 2 · C H M P 3 · B F G Y 4 · W 5 · K V 6 · X 8 · J Q Z 10 · blank 0 | Matches the tiles in the screenshot |
| Rack | 7 tiles | Screenshot |
| Sweep (all 7 tiles in one play) | +40 | Third-party guides |
| Premiums | Letter premiums apply to newly placed tiles only; word premiums multiply (and stack) only when a newly placed tile covers them — standard Scrabble | Verified by THREW = 17 |
| Centre square | No bonus; the first play must cover it | Assumed (standard); unverified |
| Dictionary | `src/data/words.js` (NWL2023 minus Crossplay's cuts), words of 2–15 letters | Already in the app |
| End of game | Once the bag is empty, each player gets one final turn; leftover tiles are not deducted | Third-party guides; informational only |

### Premium layout

Rows top to bottom, columns left to right. `T` triple word, `D` double word,
`t` triple letter, `d` double letter, `*` centre (no bonus), `.` plain.

```
t..T...d...T..t
.D....t.t....D.
....d.....d....
T..d...D...d..T
..d..t...t..d..
....t..d..t....
.t...........t.
d..D.d.*.d.D..d
.t...........t.
....t..d..t....
..d..t...t..d..
T..d...D...d..T
....d.....d....
.D....t.t....D.
t..T...d...T..t
```

Counts: 8 T, 8 D, 20 t, 20 d. The layout has 4-fold mirror symmetry.

### Verified against the screenshot

The screenshot's game (You 70, RudiB 58) is fully explained by this layout and these
values: You played RUBACE (H4 down) = 32 and COWPAT (8H across) = 38; RudiB played
JOBBER (6E across) = 41 and THREW (J4 down) = 17. Total 70 / 58 exactly. This confirms
letter values, 2L, 3L, a 2W word multiplier, letter premiums only on new tiles, and no
bonus on the centre square (RUBACE would be 64 otherwise). **Still unverified:** 3W,
stacked word multipliers and the +40 sweep. The reported-score field below catches either
being wrong. The tile set checks out: 19 tiles on board leave a bag of 67, as shown.

## Approaches (decided)

How to organise the code given a possible native app later:

- **A. Framework-free JS engine + JSON test fixtures, React UI on top — chosen.**
  `src/crossplay/` holds all rules and logic with no React/DOM imports. A React Native
  port reuses it unchanged; a Swift/Kotlin port is checked against the same fixtures.
  Keeps the web app light and every native path open.
- B. Build in React Native now, web via react-native-web. Rejected: a rebuild of the
  app before the native app is even decided.
- C. Installable web app (PWA). Not an alternative: it can be layered on A at any time.

How the board gets in: **log each move by hand** (chosen); screenshot reading is a later
addition on top of the same move log.

## Design

### Engine (`src/crossplay/`, plain ES modules, no React/DOM/localStorage)

All state is plain JSON-serialisable data. The dictionary is passed in, not imported,
so another platform can load it its own way.

- **rules** — tile distribution, letter values, premium layout, rack size, sweep bonus.
- **lexicon** — builds a compact lookup structure from a word array (`isWord`, and prefix
  traversal for the move generator).
- **board** — replays a move log into a 15×15 board (cells: letter, blank flag, empty).
  Validates a proposed play: tiles in one line, contiguous with existing tiles, connected
  to the board (or covering the centre on the first play), every formed word valid.
  Returns the main word, cross-words, and the score.
- **movegen** — given board, rack (with blanks) and lexicon, returns every legal play:
  position, direction, word (blank letters marked), tiles used, score, leave.
  Standard anchor/cross-check algorithm (Appel–Jacobson style) over the lexicon.
- **ranking** — orders plays by score plus a rack-leave adjustment; exposes both numbers.
- **tiles** — unseen tiles (100 − board − my rack), bag count
  (unseen − 7 while the bag is non-empty), per-letter counts.

Notation (shared by storage, fixtures, and display):
- Cells are `(row, col)`, 0-based internally. Display uses Scrabble style: rows 1–15,
  columns A–O; across plays as `8H`, down plays as `H8`.
- Words are uppercase; a **lowercase letter is a blank** standing for that letter.

### Game data (persisted)

```
Game  = { id, name, opponent, rack: "EGROFVI", moves: Move[], createdAt }
Move  = { player: "me" | "opp",
          kind: "play" | "swap" | "pass",
          row, col, dir: "across" | "down", word,      // play only; word spans the
                                                        // whole line incl. existing tiles
          reported?: number }                           // score Crossplay showed (optional)
```

Scores are recomputed from the moves, so a fix to scoring fixes old games too. When
logging a move the user may enter the score Crossplay showed ("RudiB played THREW for
17 points"); if it differs from the computed score the move is flagged in the move list,
and the totals use the reported score. This is how unverified rules get caught in real
games. *(Builder's call, added after review.)* Storage keys `crossplayGames` and `crossplayActiveGameId`, read on mount
and re-synced on `storage` / `visibilitychange` / `pageshow` (same pattern as the
Letters fix). Old `mode = "crossword"` maps to `"crossplay"`.

### Screen (`src/components/CrossplayHelper.jsx`, replaces the Crossword tab)

```
 [vs RudiB] [vs Ann] [+]
 You 70 · RudiB 58          bag 67   ▸ unseen
 ┌───────────────────────────┐
 │  15×15 board              │
 └───────────────────────────┘
 Rack:  E G R O F V I
 Best moves
   FIVE    H8 ↓   34   keeps G R O
   ...
```

- **Games strip** like Letters' sessions: tap to switch, long-press to rename/delete,
  `+` to start a new game (asks for the opponent's name).
- **Board** shows premium squares in Crossplay's colours and placed tiles with values
  (blanks visibly distinct). Fits a ~375px-wide phone screen.
- **Logging a move**: tap the start square (tap again toggles across/down), type the new
  letters on the on-screen keyboard (existing board tiles are skipped automatically),
  a blank key marks the next letter as a blank, choose **Me / Opponent**, confirm.
  The play is validated and its score shown before confirming. Words the dictionary
  doesn't know can still be logged after a warning (Crossplay is the authority).
  **Swap** and **Pass** buttons log those turns. **Undo** removes the last move.
- **Rack**: typed with the same keyboard, max 7, warns if a letter exceeds what's unseen.
- **Best moves**: ranked list (score, notation, leave). Tapping one previews it on the
  board; **Play** logs it as my move and removes its tiles from the rack, leaving the
  rack ready for the newly drawn tiles to be typed in.
- **Unseen tiles**: collapsible strip of letter counts.
- The shared `?` shows help for this tab; the shared `Reset` clears the active game
  after an in-page confirmation.

### Removals

`src/components/CrosswordHelper.jsx` is deleted. `WordResults.jsx` stays (Wordle uses it).
CLAUDE.md is updated to describe the Crossplay tab and engine.

### Testing

`bun test` (built in; nothing to install) on the engine only. Fixtures are JSON files
under `src/crossplay/fixtures/` so a native port can run them:

- Scoring cases, starting with the user's screenshot: board with RUBACE (col H, rows
  4–9), JOBBER (row 6, cols E–J), COWPAT (row 8, cols H–M), then THREW (col J, rows 4–8)
  must score **17**.
- Placement validity cases (gaps, disconnected, first move off-centre, invalid
  cross-word).
- Move generation: for small hand-checkable boards, the full set of legal plays; for the
  screenshot position with rack `EGROFVI`, the top play matches a brute-force check.
- Tile accounting (unseen, bag count, blanks).

## Constraints

- Client-side only; no backend. Works offline once loaded.
- Phone performance: building the lexicon and generating moves must not block the UI
  noticeably (target: move list in well under a second for a rack with 2 blanks).
- Commits include `[skip netlify]`. Engine modules must not import React, the DOM, or
  `localStorage`.

## Left to the builder

- Lexicon data structure (trie, DAWG or GADDAG; built at load or at build time) and
  whether to build it in a Web Worker — within the performance constraint above.
- The rack-leave heuristic (e.g. a small per-tile value table plus a duplicate and
  vowel/consonant-balance penalty), kept simple and isolated so it can be replaced.
- Exact visual styling, colours, and keyboard layout, following the existing app.
