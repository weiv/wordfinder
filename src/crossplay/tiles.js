// Tile accounting: which tiles the user hasn't seen (opponent's rack + bag).

import { TILE_COUNTS, RACK_SIZE, BLANK } from './rules.js'

function rawUnseen(board, rack) {
  const counts = { ...TILE_COUNTS }
  for (const cell of board) {
    if (cell) counts[cell.blank ? BLANK : cell.letter]--
  }
  for (const ch of rack) {
    const key = ch === BLANK ? BLANK : ch.toUpperCase()
    if (key in counts) counts[key]--
  }
  return counts
}

// Per-tile counts of tiles not on the board and not in the rack (never negative).
export function unseenTiles(board, rack) {
  const counts = rawUnseen(board, rack)
  for (const k in counts) if (counts[k] < 0) counts[k] = 0
  return counts
}

// Tiles left in the bag: everything unseen minus the opponent's rack.
export function bagCount(board, rack) {
  const total = Object.values(unseenTiles(board, rack)).reduce((a, b) => a + b, 0)
  return Math.max(0, total - RACK_SIZE)
}

// Letters the rack holds more of than can exist given the board.
export function overdrawn(board, rack) {
  const counts = rawUnseen(board, rack)
  return Object.keys(counts).filter(k => counts[k] < 0)
}
