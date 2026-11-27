// Crossplay games in browser storage. Functions take a Storage-like object
// ({ getItem, setItem }) so they can be tested without a browser.
//
// Game = { id, name, opponent, rack, moves: Move[], createdAt }

import { replay, evaluatePlay } from '../crossplay/board.js'
import { RACK_SIZE, BLANK } from '../crossplay/rules.js'

export const GAMES_KEY = 'crossplayGames'
export const ACTIVE_KEY = 'crossplayActiveGameId'

export function newGame(opponent = 'Opponent') {
  const name = opponent.trim() || 'Opponent'
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name,
    opponent: name,
    rack: '',
    moves: [],
    createdAt: new Date().toISOString(),
  }
}

const isGame = g => g && typeof g.id === 'string' && typeof g.name === 'string'
  && Array.isArray(g.moves) && typeof g.rack === 'string'
const isMove = m => m && (m.player === 'me' || m.player === 'opp')
  && (m.kind === 'swap' || m.kind === 'pass'
    || (m.kind === 'play' && typeof m.word === 'string' && Number.isInteger(m.row) && Number.isInteger(m.col)))

export function loadGames(storage) {
  let games = null
  try { games = JSON.parse(storage.getItem(GAMES_KEY)) } catch { games = null }
  if (!Array.isArray(games)) games = []
  games = games.filter(isGame).map(g => ({ ...g, moves: g.moves.filter(isMove) }))
  if (games.length === 0) games = [newGame()]
  const stored = storage.getItem(ACTIVE_KEY)
  const activeId = games.some(g => g.id === stored) ? stored : games[0].id
  return { games, activeId }
}

export function saveGames(storage, games, activeId) {
  storage.setItem(GAMES_KEY, JSON.stringify(games))
  storage.setItem(ACTIVE_KEY, activeId)
}

// Remove the last move. If it was my play, put its tiles back on the rack (up to 7).
export function undoLastMove(game) {
  if (!game.moves.length) return game
  const moves = game.moves.slice(0, -1)
  const last = game.moves[game.moves.length - 1]
  let rack = game.rack
  if (last.player === 'me' && last.kind === 'play') {
    const { board } = replay(moves)
    const r = evaluatePlay(board, last)
    if (r.ok) {
      const back = r.placed.map(t => (t.blank ? BLANK : t.letter)).join('')
      rack = (rack + back).slice(0, RACK_SIZE)
    }
  }
  return { ...game, moves, rack }
}

// Record (or clear, with null) the score Crossplay showed for move `index`.
export function setReported(game, index, value) {
  const moves = game.moves.map((m, i) => {
    if (i !== index) return m
    const { reported, ...rest } = m
    return value == null ? rest : { ...rest, reported: value }
  })
  return { ...game, moves }
}
