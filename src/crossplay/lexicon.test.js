import { test, expect } from 'bun:test'
import { createLexicon } from './lexicon.js'
import { WORDS } from '../data/words.js'

test('small lexicon: membership and prefix walking', () => {
  const lex = createLexicon(['AT', 'CAT', 'CATS', 'COW'])
  expect(lex.isWord('CAT')).toBe(true)
  expect(lex.isWord('CA')).toBe(false)
  expect(lex.isWord('DOG')).toBe(false)
  let n = lex.child(lex.root, 'C')
  n = lex.child(n, 'A')
  expect(n).toBeGreaterThanOrEqual(0)
  expect(lex.isTerminal(n)).toBe(false)
  n = lex.child(n, 'T')
  expect(lex.isTerminal(n)).toBe(true)
  expect(lex.child(n, 'X')).toBe(-1)
})

test('full dictionary builds quickly and matches Crossplay words', () => {
  const t0 = performance.now()
  const lex = createLexicon(WORDS)
  const ms = performance.now() - t0
  console.log(`lexicon build: ${ms.toFixed(0)} ms`)
  expect(ms).toBeLessThan(1500)
  expect(lex.isWord('ZA')).toBe(true)
  expect(lex.isWord('RUBACE')).toBe(true)
  expect(lex.isWord('JOBBER')).toBe(true)
  expect(lex.isWord('FRISBEE')).toBe(false)
})
