import { test, expect } from 'bun:test'
import { emptyBoard, evaluatePlay, playFromPlacement, applyPlay, replay, cellAt } from './board.js'
import { createLexicon } from './lexicon.js'
import { formatPlay } from './notation.js'
import { WORDS } from '../data/words.js'
import game from './fixtures/screenshot-game.json'
import validity from './fixtures/validity.json'

const lex = createLexicon(WORDS)

test('screenshot game replays to the scores Crossplay showed', () => {
  const { results, totals } = replay(game.moves)
  expect(results.map(r => r.score)).toEqual(game.scores)
  expect(totals).toEqual(game.totals)
  expect(formatPlay(game.moves[3])).toBe('J4')
})

for (const c of validity) {
  test(`validity: ${c.name}`, () => {
    const { board } = replay(c.moves)
    const r = evaluatePlay(board, c.play, lex)
    expect(r.ok).toBe(c.ok)
    if (c.error) expect(r.error).toBe(c.error)
    if (c.score != null) expect(r.score).toBe(c.score)
    if (c.words) expect(r.words.map(w => w.word).sort()).toEqual([...c.words].sort())
    if (c.sweep != null) expect(r.sweep).toBe(c.sweep)
  })
}

test('a blank scores 0 but still gets the word multiplier', () => {
  const r = evaluatePlay(emptyBoard(), { row: 3, col: 7, dir: 'down', word: 'rUBACE' }, lex)
  expect(r.ok).toBe(true)
  expect(r.score).toBe(30)
  const board = applyPlay(emptyBoard(), { row: 3, col: 7, dir: 'down', word: 'rUBACE' })
  expect(cellAt(board, 3, 7)).toEqual({ letter: 'R', blank: true })
})

test('extending an existing word includes the board tiles before it', () => {
  const { board } = replay(game.moves)
  const play = playFromPlacement(board, [{ row: 7, col: 13, letter: 'S', blank: false }])
  expect(play).toEqual({ row: 7, col: 7, dir: 'across', word: 'COWPATS' })
  expect(evaluatePlay(board, play, lex).ok).toBe(true)
  const short = evaluatePlay(board, { row: 7, col: 8, dir: 'across', word: 'OWPATS' }, lex)
  expect(short.ok).toBe(false)
  expect(short.error).toBe('not-maximal')
})

test('placement with a gap is not a play', () => {
  expect(playFromPlacement(emptyBoard(), [
    { row: 7, col: 6, letter: 'C', blank: false },
    { row: 7, col: 8, letter: 'T', blank: false },
  ])).toBe(null)
})

test('placement of a blank writes a lowercase letter; single tile prefers a real word', () => {
  const { board } = replay([
    { player: 'me', kind: 'play', row: 7, col: 7, dir: 'across', word: 'AT' },
    { player: 'opp', kind: 'play', row: 7, col: 8, dir: 'down', word: 'TO' },
  ])
  expect(playFromPlacement(board, [{ row: 8, col: 7, letter: 'S', blank: true }]))
    .toEqual({ row: 8, col: 7, dir: 'across', word: 'sO' })
  // A tile below A only forms a down word.
  const { board: b2 } = replay([{ player: 'me', kind: 'play', row: 7, col: 7, dir: 'across', word: 'AT' }])
  expect(playFromPlacement(b2, [{ row: 8, col: 7, letter: 'S', blank: false }]))
    .toEqual({ row: 7, col: 7, dir: 'down', word: 'AS' })
})

test('unknown words are reported but do not invalidate the play', () => {
  const { board } = replay([{ player: 'me', kind: 'play', row: 7, col: 6, dir: 'across', word: 'CAT' }])
  const r = evaluatePlay(board, { row: 7, col: 6, dir: 'across', word: 'CATZ' }, lex)
  expect(r.ok).toBe(true)
  expect(r.unknownWords).toEqual(['CATZ'])
})

test('reported score overrides the total and flags a mismatch', () => {
  const moves = game.moves.map((m, i) => (i === 3 ? { ...m, reported: 18 } : m))
  const { results, totals } = replay(moves)
  expect(results[3]).toMatchObject({ score: 17, counted: 18, mismatch: true })
  expect(totals.opp).toBe(59)
})

test('swaps and passes score nothing', () => {
  const { totals, results } = replay([
    { player: 'me', kind: 'swap' },
    { player: 'opp', kind: 'pass' },
  ])
  expect(totals).toEqual({ me: 0, opp: 0 })
  expect(results.map(r => r.score)).toEqual([0, 0])
})
