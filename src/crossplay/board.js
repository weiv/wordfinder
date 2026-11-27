// Board state, play validation and scoring. Pure data — no React, DOM, or storage.
//
// Board = Cell[225] (index row*15+col), Cell = null | { letter: 'A'–'Z', blank: boolean }
// Play  = { row, col, dir: 'across'|'down', word }  — word spans the whole contiguous
//         line including tiles already on the board; a lowercase letter is a blank.
// Move  = { player: 'me'|'opp', kind: 'play'|'swap'|'pass', ...Play, reported?: number }

import { SIZE, CENTER, RACK_SIZE, SWEEP_BONUS, TILE_COUNTS, premiumAt, tileValue } from './rules.js'

const BLANK_COUNT = TILE_COUNTS['?']

const DELTA = { across: [0, 1], down: [1, 0] }
const PERP = { across: 'down', down: 'across' }

const inside = (r, c) => r >= 0 && r < SIZE && c >= 0 && c < SIZE

export function emptyBoard() {
  return new Array(SIZE * SIZE).fill(null)
}

export function cellAt(board, row, col) {
  return inside(row, col) ? board[row * SIZE + col] : null
}

function isEmptyBoard(board) {
  return board.every(c => c === null)
}

// Letter of a cell as it appears in a word (lowercase when it's a blank).
function cellChar(cell) {
  return cell.blank ? cell.letter.toLowerCase() : cell.letter
}

// Score one word given its squares; only newly placed squares get premiums.
// squares: { row, col, ch, isNew }[]
export function scoreSquares(squares) {
  let sum = 0
  let mult = 1
  for (const s of squares) {
    let v = tileValue(s.ch)
    if (s.isNew) {
      const p = premiumAt(s.row, s.col)
      if (p === 'DL') v *= 2
      else if (p === 'TL') v *= 3
      else if (p === 'DW') mult *= 2
      else if (p === 'TW') mult *= 3
    }
    sum += v
  }
  return sum * mult
}

// The perpendicular word through a newly placed tile, or null if it is a single letter.
function crossWord(board, row, col, ch, dir) {
  const [dr, dc] = DELTA[PERP[dir]]
  let r = row - dr, c = col - dc
  while (cellAt(board, r, c)) { r -= dr; c -= dc }
  r += dr; c += dc
  const squares = []
  while (inside(r, c)) {
    if (r === row && c === col) squares.push({ row: r, col: c, ch, isNew: true })
    else {
      const cell = cellAt(board, r, c)
      if (!cell) break
      squares.push({ row: r, col: c, ch: cellChar(cell), isNew: false })
    }
    r += dr; c += dc
  }
  return squares.length > 1 ? squares : null
}

const fail = error => ({ ok: false, error, placed: [], words: [], score: 0, sweep: false, unknownWords: [] })

export function evaluatePlay(board, play, lexicon) {
  const { row, col, dir, word } = play
  const delta = DELTA[dir]
  if (!delta || !word) return fail('too-short')
  const [dr, dc] = delta
  if (word.length < 2) return fail('too-short')
  const endR = row + dr * (word.length - 1)
  const endC = col + dc * (word.length - 1)
  if (!inside(row, col) || !inside(endR, endC)) return fail('off-board')

  const placed = []
  const main = []
  let touchesExisting = false
  for (let i = 0; i < word.length; i++) {
    const r = row + dr * i, c = col + dc * i
    const ch = word[i]
    const cell = cellAt(board, r, c)
    if (cell) {
      if (cell.letter !== ch.toUpperCase()) return fail('mismatch')
      touchesExisting = true
      main.push({ row: r, col: c, ch: cellChar(cell), isNew: false })
    } else {
      const blank = ch !== ch.toUpperCase()
      placed.push({ row: r, col: c, letter: ch.toUpperCase(), blank })
      main.push({ row: r, col: c, ch, isNew: true })
    }
  }
  if (placed.length === 0) return fail('no-new-tiles')
  if (cellAt(board, row - dr, col - dc) || cellAt(board, endR + dr, endC + dc)) return fail('not-maximal')

  const words = [{ word: word.toUpperCase(), score: scoreSquares(main) }]
  for (const p of placed) {
    const ch = p.blank ? p.letter.toLowerCase() : p.letter
    const cross = crossWord(board, p.row, p.col, ch, dir)
    if (cross) {
      touchesExisting = true
      words.push({ word: cross.map(s => s.ch).join('').toUpperCase(), score: scoreSquares(cross) })
    }
  }

  if (isEmptyBoard(board)) {
    if (!placed.some(p => p.row === CENTER && p.col === CENTER)) return fail('no-center')
  } else if (!touchesExisting) {
    return fail('not-connected')
  }

  const sweep = placed.length === RACK_SIZE
  const score = words.reduce((s, w) => s + w.score, 0) + (sweep ? SWEEP_BONUS : 0)
  const unknownWords = lexicon ? words.map(w => w.word).filter(w => !lexicon.isWord(w)) : []
  return { ok: true, placed, words, score, sweep, unknownWords }
}

export function applyPlay(board, play) {
  const next = board.slice()
  const [dr, dc] = DELTA[play.dir]
  for (let i = 0; i < play.word.length; i++) {
    const idx = (play.row + dr * i) * SIZE + (play.col + dc * i)
    if (!next[idx]) {
      const ch = play.word[i]
      next[idx] = { letter: ch.toUpperCase(), blank: ch !== ch.toUpperCase() }
    }
  }
  return next
}

// Build the full-line Play for tiles placed on the board, or null if they are not
// in one line, or leave a gap.
export function playFromPlacement(board, placed) {
  if (!placed.length) return null
  const temp = board.slice()
  for (const p of placed) {
    if (!inside(p.row, p.col) || temp[p.row * SIZE + p.col]) return null
    temp[p.row * SIZE + p.col] = { letter: p.letter.toUpperCase(), blank: !!p.blank }
  }

  const lineFrom = (dir, r0, c0) => {
    const [dr, dc] = DELTA[dir]
    let r = r0, c = c0
    while (cellAt(temp, r - dr, c - dc)) { r -= dr; c -= dc }
    const start = { row: r, col: c }
    let word = ''
    while (cellAt(temp, r, c)) { word += cellChar(cellAt(temp, r, c)); r += dr; c += dc }
    return { ...start, dir, word }
  }

  let dir
  if (placed.length === 1) {
    const across = lineFrom('across', placed[0].row, placed[0].col)
    if (across.word.length >= 2) return across
    const down = lineFrom('down', placed[0].row, placed[0].col)
    return down.word.length >= 2 ? down : across
  }
  if (placed.every(p => p.row === placed[0].row)) dir = 'across'
  else if (placed.every(p => p.col === placed[0].col)) dir = 'down'
  else return null

  const play = lineFrom(dir, placed[0].row, placed[0].col)
  // Every placed tile must lie inside the contiguous line (no gaps).
  const [dr, dc] = DELTA[dir]
  const covers = p => {
    const i = dir === 'across' ? p.col - play.col : p.row - play.row
    return i >= 0 && i < play.word.length && play.row + dr * i === p.row && play.col + dc * i === p.col
  }
  return placed.every(covers) ? play : null
}

export function replay(moves) {
  let board = emptyBoard()
  const totals = { me: 0, opp: 0 }
  const results = moves.map(m => {
    let score = 0
    let error
    if (m.kind === 'play') {
      const r = evaluatePlay(board, m)
      if (r.ok) { score = r.score; board = applyPlay(board, m) }
      else error = r.error
    }
    const counted = m.reported ?? score
    totals[m.player] += counted
    const result = { score, counted, mismatch: m.reported != null && m.reported !== score }
    if (error) result.error = error
    return result
  })
  return { board, results, totals }
}

// Which of a play's new tiles must be blanks for it to score `reported`?
// Tries every way of flipping one or two new tiles between real and blank, keeping
// within the game's 3 blanks. Returns [{ word, blanks: letters newly marked blank }].
export function blankFixes(board, play, reported) {
  const base = evaluatePlay(board, play)
  if (!base.ok || base.score === reported) return []
  const [dr, dc] = DELTA[play.dir]
  const newIdx = []
  for (let i = 0; i < play.word.length; i++) {
    if (!cellAt(board, play.row + dr * i, play.col + dc * i)) newIdx.push(i)
  }
  const boardBlanks = board.filter(c => c && c.blank).length
  const flip = ch => (ch === ch.toUpperCase() ? ch.toLowerCase() : ch.toUpperCase())
  const subsets = []
  for (let a = 0; a < newIdx.length; a++) {
    subsets.push([newIdx[a]])
    for (let b = a + 1; b < newIdx.length; b++) subsets.push([newIdx[a], newIdx[b]])
  }
  const fixes = []
  for (const s of subsets) {
    const chars = [...play.word]
    for (const i of s) chars[i] = flip(chars[i])
    const word = chars.join('')
    const blanksUsed = newIdx.filter(i => word[i] !== word[i].toUpperCase()).length
    if (boardBlanks + blanksUsed > BLANK_COUNT) continue
    const r = evaluatePlay(board, { ...play, word })
    if (r.ok && r.score === reported) {
      fixes.push({ word, blanks: s.filter(i => word[i] !== word[i].toUpperCase()).map(i => word[i].toUpperCase()) })
    }
  }
  return fixes
}
