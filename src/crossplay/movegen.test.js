import { test, expect } from 'bun:test'
import { generateMoves } from './movegen.js'
import { createLexicon } from './lexicon.js'
import { replay, evaluatePlay, playFromPlacement, emptyBoard, cellAt } from './board.js'
import { CENTER } from './rules.js'
import { WORDS } from '../data/words.js'
import game from './fixtures/screenshot-game.json'

const fullLex = createLexicon(WORDS)

const key = p => `${p.row},${p.col},${p.dir},${p.word},${p.score}`

// Rack letters needed for a set of placed tiles ('?' for blanks), or null if the rack can't cover them.
function fits(placed, rack) {
  const left = rack.split('')
  for (const p of placed) {
    const need = p.blank ? '?' : p.letter
    const i = left.indexOf(need)
    if (i < 0) return false
    left.splice(i, 1)
  }
  return true
}

// Try every word, at every square and direction, with every blank assignment.
function bruteForce(board, rack, words, lex) {
  const found = new Set()
  for (const w of words) {
    for (let mask = 0; mask < 1 << w.length; mask++) {
      const word = [...w].map((ch, i) => (mask >> i) & 1 ? ch.toLowerCase() : ch).join('')
      for (const dir of ['across', 'down']) for (let row = 0; row < 15; row++) for (let col = 0; col < 15; col++) {
        const r = evaluatePlay(board, { row, col, dir, word }, lex)
        if (!r.ok || r.unknownWords.length || !fits(r.placed, rack)) continue
        // Normalise: existing squares as on the board; single tiles in their canonical direction.
        const canon = playFromPlacement(board, r.placed)
        if (r.placed.length === 1 && canon.dir !== dir) continue
        found.add(key({ ...canon, score: r.score }))
      }
    }
  }
  return found
}

test('matches brute force on a small lexicon (with a blank)', () => {
  const words = ['AT', 'TA', 'CAT', 'ACT', 'TAT', 'CATS', 'SCAT', 'AS']
  const lex = createLexicon(words)
  const { board } = replay([{ player: 'me', kind: 'play', row: 7, col: 6, dir: 'across', word: 'CAT' }])
  const rack = 'AST?'
  const gen = generateMoves(board, rack, lex)
  const genKeys = new Set(gen.map(key))
  expect(genKeys.size).toBe(gen.length) // no duplicates
  expect([...genKeys].sort()).toEqual([...bruteForce(board, rack, words, lex)].sort())
})

test('tiles used plus leave equal the rack', () => {
  const { board } = replay(game.moves)
  for (const p of generateMoves(board, 'EGR?FVI', fullLex)) {
    expect([...p.tiles, ...p.leave].sort().join('')).toBe([...'EGR?FVI'].sort().join(''))
  }
})

test('screenshot position: every generated play is legal with the same score, fast', () => {
  const { board } = replay(game.moves)
  const t0 = performance.now()
  const plays = generateMoves(board, game.rack, fullLex)
  const ms = performance.now() - t0
  console.log(`screenshot movegen: ${plays.length} plays in ${ms.toFixed(0)} ms`)
  expect(ms).toBeLessThan(500)
  expect(plays.length).toBeGreaterThan(0)
  for (const p of plays) {
    const r = evaluatePlay(board, p, fullLex)
    expect(r.ok).toBe(true)
    expect(r.unknownWords).toEqual([])
    expect(r.score).toBe(p.score)
  }
})

test('empty board with two blanks: completes quickly and every play covers the centre', () => {
  const t0 = performance.now()
  const plays = generateMoves(emptyBoard(), '??AEIRS', fullLex)
  const ms = performance.now() - t0
  console.log(`empty-board 2-blank movegen: ${plays.length} plays in ${ms.toFixed(0)} ms`)
  expect(ms).toBeLessThan(2000)
  expect(plays.length).toBeGreaterThan(0)
  for (const p of plays) {
    const r = evaluatePlay(emptyBoard(), p, fullLex)
    expect(r.ok).toBe(true)
    expect(r.placed.some(t => t.row === CENTER && t.col === CENTER)).toBe(true)
  }
})
