import { test, expect } from 'bun:test'
import { unseenTiles, bagCount, overdrawn } from './tiles.js'
import { replay, emptyBoard, applyPlay } from './board.js'
import game from './fixtures/screenshot-game.json'

test('unseen tiles and bag on the screenshot board', () => {
  const { board } = replay(game.moves)
  const u = unseenTiles(board, game.rack)
  expect(Object.values(u).reduce((a, b) => a + b, 0)).toBe(73)
  expect(u.J).toBe(0)
  expect(u.B).toBe(0)
  expect(u.W).toBe(1)
  expect(u['?']).toBe(3)
  expect(bagCount(board, game.rack)).toBe(66)
})

test('blanks on the board and in the rack count as ?', () => {
  const board = applyPlay(emptyBoard(), { row: 7, col: 7, dir: 'across', word: 'aT' })
  const u = unseenTiles(board, '?E')
  expect(u['?']).toBe(1)
  expect(u.A).toBe(9)
  expect(u.E).toBe(11)
})

test('overdrawn lists letters the rack has more of than remain', () => {
  expect(overdrawn(emptyBoard(), 'QQ')).toEqual(['Q'])
  expect(overdrawn(emptyBoard(), 'EEE')).toEqual([])
})

test('bag never goes negative', () => {
  const { board } = replay(game.moves)
  expect(bagCount(board, game.rack)).toBeGreaterThanOrEqual(0)
})
