import { test, expect } from 'bun:test'
import { newGame, loadGames, saveGames, undoLastMove, GAMES_KEY, ACTIVE_KEY } from './crossplayStorage.js'

function memoryStorage(init = {}) {
  const data = { ...init }
  return {
    getItem: k => (k in data ? data[k] : null),
    setItem: (k, v) => { data[k] = String(v) },
    removeItem: k => { delete data[k] },
  }
}

for (const [name, raw] of [['bad JSON', '{bad'], ['empty array', '[]'], ['missing', undefined]]) {
  test(`loadGames recovers from ${name}`, () => {
    const s = memoryStorage(raw === undefined ? {} : { [GAMES_KEY]: raw })
    const { games, activeId } = loadGames(s)
    expect(games.length).toBe(1)
    expect(games[0].moves).toEqual([])
    expect(activeId).toBe(games[0].id)
  })
}

test('loadGames falls back to the first game for an unknown active id', () => {
  const g = newGame('RudiB')
  const s = memoryStorage({ [GAMES_KEY]: JSON.stringify([g]), [ACTIVE_KEY]: 'nope' })
  expect(loadGames(s).activeId).toBe(g.id)
})

test('save then load round-trips', () => {
  const s = memoryStorage()
  const g = { ...newGame('Ann'), rack: 'ABC', moves: [{ player: 'opp', kind: 'pass' }] }
  saveGames(s, [g], g.id)
  expect(loadGames(s)).toEqual({ games: [g], activeId: g.id })
})

test('undo of my play returns its tiles to the rack', () => {
  const g = {
    ...newGame('RudiB'),
    rack: 'GRO',
    moves: [{ player: 'me', kind: 'play', row: 7, col: 6, dir: 'across', word: 'FIvE' }],
  }
  const u = undoLastMove(g)
  expect(u.moves).toEqual([])
  expect(u.rack).toBe('GROFI?E')
})

test("undo of the opponent's play leaves the rack alone", () => {
  const g = {
    ...newGame('RudiB'),
    rack: 'GRO',
    moves: [{ player: 'opp', kind: 'play', row: 7, col: 6, dir: 'across', word: 'FIVE' }],
  }
  expect(undoLastMove(g)).toMatchObject({ moves: [], rack: 'GRO' })
})

test('undo never overfills the rack', () => {
  const g = {
    ...newGame('RudiB'),
    rack: 'ABCDEF',
    moves: [{ player: 'me', kind: 'play', row: 7, col: 6, dir: 'across', word: 'FIVE' }],
  }
  expect(undoLastMove(g).rack.length).toBe(7)
})
