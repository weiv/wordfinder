import { test, expect } from 'bun:test'
import { TILE_COUNTS, premiumAt, tileValue, SIZE } from './rules.js'
import { formatPlay, parseSquare } from './notation.js'

test('tile set has 100 tiles including 3 blanks', () => {
  expect(Object.values(TILE_COUNTS).reduce((a, b) => a + b, 0)).toBe(100)
  expect(TILE_COUNTS['?']).toBe(3)
})

test('premium squares match the Crossplay board', () => {
  const counts = {}
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
    const p = premiumAt(r, c)
    if (p) counts[p] = (counts[p] || 0) + 1
  }
  expect(counts).toEqual({ TW: 8, DW: 8, TL: 20, DL: 20 })
  expect(premiumAt(7, 7)).toBe(null)
  expect(premiumAt(0, 0)).toBe('TL')
  expect(premiumAt(0, 3)).toBe('TW')
  expect(premiumAt(3, 7)).toBe('DW')
  expect(premiumAt(4, 9)).toBe('TL')
  expect(premiumAt(7, 9)).toBe('DL')
})

test('premium layout is mirror-symmetric', () => {
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
    const p = premiumAt(r, c)
    expect(premiumAt(14 - r, c)).toBe(p)
    expect(premiumAt(r, 14 - c)).toBe(p)
    expect(premiumAt(c, r)).toBe(p)
  }
})

test('tile values: V is 6, blanks (lowercase) are 0', () => {
  expect(tileValue('V')).toBe(6)
  expect(tileValue('v')).toBe(0)
  expect(tileValue('Q')).toBe(10)
})

test('notation: across is row-then-column, down is column-then-row', () => {
  expect(formatPlay({ row: 7, col: 7, dir: 'across' })).toBe('8H')
  expect(formatPlay({ row: 3, col: 9, dir: 'down' })).toBe('J4')
  expect(parseSquare('J4')).toEqual({ row: 3, col: 9 })
})
