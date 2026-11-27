// NYT Crossplay game rules. Pure data — no React, DOM, or storage.

export const SIZE = 15
export const CENTER = 7
export const RACK_SIZE = 7
export const SWEEP_BONUS = 40 // bonus for playing all 7 rack tiles
export const BLANK = '?'      // a blank tile in a rack; in words a blank is a lowercase letter

export const LETTER_VALUES = {
  A: 1, E: 1, I: 1, N: 1, O: 1, R: 1, S: 1, T: 1,
  D: 2, L: 2, U: 2,
  C: 3, H: 3, M: 3, P: 3,
  B: 4, F: 4, G: 4, Y: 4,
  W: 5,
  K: 6, V: 6,
  X: 8,
  J: 10, Q: 10, Z: 10,
}

export const TILE_COUNTS = {
  A: 9, B: 2, C: 2, D: 4, E: 12, F: 2, G: 3, H: 3, I: 8, J: 1, K: 1, L: 4, M: 2,
  N: 5, O: 8, P: 2, Q: 1, R: 6, S: 5, T: 6, U: 3, V: 2, W: 2, X: 1, Y: 2, Z: 1,
  '?': 3,
}

// T triple word, D double word, t triple letter, d double letter, * centre (no bonus)
export const PREMIUM_ROWS = [
  't..T...d...T..t',
  '.D....t.t....D.',
  '....d.....d....',
  'T..d...D...d..T',
  '..d..t...t..d..',
  '....t..d..t....',
  '.t...........t.',
  'd..D.d.*.d.D..d',
  '.t...........t.',
  '....t..d..t....',
  '..d..t...t..d..',
  'T..d...D...d..T',
  '....d.....d....',
  '.D....t.t....D.',
  't..T...d...T..t',
]

const PREMIUM_CODES = { T: 'TW', D: 'DW', t: 'TL', d: 'DL' }

export function premiumAt(row, col) {
  return PREMIUM_CODES[PREMIUM_ROWS[row][col]] ?? null
}

// Value of a tile as it appears in a word: uppercase letter = its value, lowercase = blank = 0.
export function tileValue(ch) {
  return LETTER_VALUES[ch] ?? 0
}
