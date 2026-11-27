// Move generation (Appel–Jacobson): every legal play for a rack on a board.
// Pure data — no React, DOM, or storage.
//
// GenPlay = Play & { score, sweep, tiles /* rack tiles used, '?' for blanks */, leave }

import { SIZE, CENTER, RACK_SIZE, SWEEP_BONUS, BLANK, premiumAt, tileValue } from './rules.js'

const A = 65
const ALL = (1 << 26) - 1
const BLANK_IDX = 26

export function generateMoves(board, rack, lexicon) {
  const counts = new Int8Array(27)
  for (const ch of rack) {
    if (ch === BLANK) counts[BLANK_IDX]++
    else counts[ch.toUpperCase().charCodeAt(0) - A]++
  }
  const boardEmpty = board.every(c => c === null)
  const results = []
  // On an empty board, down plays mirror across plays (the layout is diagonal-symmetric).
  for (const dir of boardEmpty ? ['across'] : ['across', 'down']) {
    generateDir(board, dir, counts, lexicon, boardEmpty, results)
  }
  return results
}

function generateDir(board, dir, counts, lex, boardEmpty, results) {
  const across = dir === 'across'
  // (line, pos): line = row for across / col for down; pos runs along the play.
  const idx = (l, p) => (across ? l * SIZE + p : p * SIZE + l)
  const get = (l, p) => (l < 0 || l >= SIZE || p < 0 || p >= SIZE ? null : board[idx(l, p)])
  const premium = (l, p) => (across ? premiumAt(l, p) : premiumAt(p, l))

  // Cross-checks: for each empty square, which letters form a valid perpendicular word,
  // and the summed value of the perpendicular tiles already on the board.
  const crossMask = new Int32Array(SIZE * SIZE).fill(ALL)
  const crossSum = new Int32Array(SIZE * SIZE)
  const hasCross = new Uint8Array(SIZE * SIZE)
  const anchor = new Uint8Array(SIZE * SIZE)
  for (let l = 0; l < SIZE; l++) for (let p = 0; p < SIZE; p++) {
    if (get(l, p)) continue
    const k = l * SIZE + p
    if (get(l, p - 1) || get(l, p + 1) || get(l - 1, p) || get(l + 1, p)) anchor[k] = 1
    if (!get(l - 1, p) && !get(l + 1, p)) continue
    let before = '', after = '', sum = 0
    for (let x = l - 1; get(x, p); x--) { before = get(x, p).letter + before; sum += get(x, p).blank ? 0 : tileValue(get(x, p).letter) }
    for (let x = l + 1; get(x, p); x++) { after += get(x, p).letter; sum += get(x, p).blank ? 0 : tileValue(get(x, p).letter) }
    let mask = 0
    for (let c = 0; c < 26; c++) {
      if (lex.isWord(before + String.fromCharCode(A + c) + after)) mask |= 1 << c
    }
    crossMask[k] = mask
    crossSum[k] = sum
    hasCross[k] = 1
  }
  if (boardEmpty) anchor[CENTER * SIZE + CENTER] = 1

  const placed = [] // { pos, ch } in play order; ch lowercase = blank

  function record(l, start, end) {
    // A single tile with a word in both directions is reported once, as the across play.
    if (!across && placed.length === 1 && hasCross[l * SIZE + placed[0].pos]) return
    let word = ''
    let mainSum = 0, mainMult = 1, crossTotal = 0
    let pi = 0
    for (let p = start; p <= end; p++) {
      const cell = get(l, p)
      if (cell) {
        word += cell.blank ? cell.letter.toLowerCase() : cell.letter
        mainSum += cell.blank ? 0 : tileValue(cell.letter)
        continue
      }
      const ch = placed[pi++].ch
      word += ch
      let v = tileValue(ch)
      let wm = 1
      const prem = premium(l, p)
      if (prem === 'DL') v *= 2
      else if (prem === 'TL') v *= 3
      else if (prem === 'DW') wm = 2
      else if (prem === 'TW') wm = 3
      mainSum += v
      mainMult *= wm
      const k = l * SIZE + p
      if (hasCross[k]) crossTotal += (crossSum[k] + v) * wm
    }
    const sweep = placed.length === RACK_SIZE
    const score = mainSum * mainMult + crossTotal + (sweep ? SWEEP_BONUS : 0)
    const tiles = placed.map(t => (t.ch === t.ch.toUpperCase() ? t.ch : BLANK)).join('')
    let leave = ''
    for (let c = 0; c < 26; c++) leave += String.fromCharCode(A + c).repeat(counts[c])
    leave += BLANK.repeat(counts[BLANK_IDX])
    const pos = across ? { row: l, col: start } : { row: start, col: l }
    results.push({ ...pos, dir, word, score, sweep, tiles, leave })
  }

  // Place a rack tile (real letter and/or blank) for letter code c, then continue.
  function withTile(pos, c, next) {
    if (counts[c] > 0) {
      counts[c]--; placed.push({ pos, ch: String.fromCharCode(A + c) })
      next()
      placed.pop(); counts[c]++
    }
    if (counts[BLANK_IDX] > 0) {
      counts[BLANK_IDX]--; placed.push({ pos, ch: String.fromCharCode(A + 32 + c) })
      next()
      placed.pop(); counts[BLANK_IDX]++
    }
  }

  function extendRight(l, pos, node, start, anchorPos) {
    if (pos >= SIZE) {
      if (pos > anchorPos && lex.isTerminal(node)) record(l, start, pos - 1)
      return
    }
    const cell = get(l, pos)
    if (cell) {
      const child = lex.child(node, cell.letter)
      if (child !== -1) extendRight(l, pos + 1, child, start, anchorPos)
      return
    }
    if (pos > anchorPos && lex.isTerminal(node)) record(l, start, pos - 1)
    const mask = crossMask[l * SIZE + pos]
    lex.forEachChild(node, (letter, child) => {
      const c = letter.charCodeAt(0) - A
      if (mask & (1 << c)) withTile(pos, c, () => extendRight(l, pos + 1, child, start, anchorPos))
    })
  }

  // Left part built from rack tiles on the empty non-anchor squares left of the anchor.
  function leftPart(l, anchorPos, node, limit, len) {
    extendRight(l, anchorPos, node, anchorPos - len, anchorPos)
    if (limit === 0) return
    lex.forEachChild(node, (letter, child) => {
      const c = letter.charCodeAt(0) - A
      // record() walks squares left to right and consumes `placed` in order, so left-part
      // tiles don't need their position (-1); only a lone anchor tile's pos is read.
      withTile(-1, c,() => leftPart(l, anchorPos, child, limit - 1, len + 1))
    })
  }

  for (let l = 0; l < SIZE; l++) {
    for (let p = 0; p < SIZE; p++) {
      if (!anchor[l * SIZE + p]) continue
      if (get(l, p - 1)) {
        let start = p - 1
        while (get(l, start - 1)) start--
        let node = lex.root
        for (let x = start; x < p && node !== -1; x++) node = lex.child(node, get(l, x).letter)
        if (node !== -1) extendRight(l, p, node, start, p)
      } else {
        let limit = 0
        for (let x = p - 1; x >= 0 && !get(l, x) && !anchor[l * SIZE + x]; x--) limit++
        leftPart(l, p, lex.root, limit, 0)
      }
    }
  }
}
