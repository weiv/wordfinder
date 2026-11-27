import { test, expect } from 'bun:test'
import { leaveValue, rankMoves } from './ranking.js'

test('leave values: blank > S > 0 > Q; awkward leaves rate below good ones', () => {
  expect(leaveValue('?')).toBeGreaterThan(leaveValue('S'))
  expect(leaveValue('S')).toBeGreaterThan(0)
  expect(leaveValue('Q')).toBeLessThan(0)
  expect(leaveValue('UUV')).toBeLessThan(leaveValue('ERS'))
  expect(leaveValue('')).toBe(0)
})

test('rankMoves weighs the leave: 30 keeping a blank beats 31 keeping QUV', () => {
  const ranked = rankMoves([
    { word: 'AAA', score: 31, leave: 'QUV' },
    { word: 'BBB', score: 30, leave: '?' },
  ])
  expect(ranked.map(p => p.word)).toEqual(['BBB', 'AAA'])
  expect(ranked[0].equity).toBe(30 + leaveValue('?'))
})

test('ties break by score, then word', () => {
  const ranked = rankMoves([
    { word: 'ZED', score: 10, leave: '' },
    { word: 'ADZ', score: 10, leave: '' },
  ])
  expect(ranked.map(p => p.word)).toEqual(['ADZ', 'ZED'])
})

test('rankMoves with a limit returns the same top plays as a full sort, quickly', async () => {
  const { generateMoves } = await import('./movegen.js')
  const { createLexicon } = await import('./lexicon.js')
  const { emptyBoard } = await import('./board.js')
  const { WORDS } = await import('../data/words.js')
  const plays = generateMoves(emptyBoard(), '??AEIRS', createLexicon(WORDS))
  const full = rankMoves(plays).slice(0, 30)
  const t0 = performance.now()
  const top = rankMoves(plays, 30)
  const ms = performance.now() - t0
  console.log(`rank ${plays.length} plays, top 30: ${ms.toFixed(0)} ms`)
  expect(top).toEqual(full)
  expect(ms).toBeLessThan(60)
})
