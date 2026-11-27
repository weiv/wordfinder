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
