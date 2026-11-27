// Ranking plays by score plus a simple rack-leave estimate.
// The leave heuristic is deliberately small and self-contained so it can be replaced.

// Rough value (in points) of keeping each tile for future turns.
const TILE_LEAVE = {
  '?': 15, S: 6, E: 3, X: 3, Z: 2, R: 1.5, A: 1, H: 1,
  N: 0.5, T: 0.5, L: 0.5, D: 0.5, C: 0.5, M: 0.5, P: 0,
  I: -0.5, Y: -0.5, O: -1, K: -1, J: -1, B: -1.5, F: -1.5, G: -2,
  W: -2.5, U: -3, V: -4.5, Q: -7,
}
const DUPLICATE_PENALTY = 3   // per extra copy of a letter
const BALANCE_PENALTY = 2     // per vowel away from ~40% vowels
const Q_WITHOUT_U = 3
const VOWELS = new Set(['A', 'E', 'I', 'O', 'U'])

export function leaveValue(leave) {
  if (!leave) return 0
  let value = 0
  const seen = {}
  let vowels = 0, letters = 0
  for (const t of leave) {
    value += TILE_LEAVE[t] ?? 0
    if (t !== '?') {
      if (seen[t]) value -= DUPLICATE_PENALTY
      seen[t] = true
      letters++
      if (VOWELS.has(t)) vowels++
    }
  }
  if (letters >= 2) value -= BALANCE_PENALTY * Math.abs(vowels - Math.round(letters * 0.4))
  if (seen.Q && !seen.U) value -= Q_WITHOUT_U
  return Math.round(value * 10) / 10
}

const better = (a, b) => b.equity - a.equity || b.score - a.score || a.word.localeCompare(b.word)

// Rank plays by equity (score + leave value). With a limit, only the best `limit` plays
// are kept (and copied), which keeps ranking tens of thousands of plays cheap.
export function rankMoves(plays, limit = Infinity) {
  const leaveCache = new Map()
  const equityOf = p => {
    let lv = leaveCache.get(p.leave)
    if (lv === undefined) { lv = leaveValue(p.leave); leaveCache.set(p.leave, lv) }
    return p.score + lv
  }
  if (!Number.isFinite(limit)) {
    return plays.map(p => ({ ...p, equity: equityOf(p) })).sort(better)
  }
  const top = [] // sorted best-first, length <= limit
  for (const p of plays) {
    const candidate = { word: p.word, score: p.score, equity: equityOf(p) }
    if (top.length === limit && better(candidate, top[top.length - 1]) >= 0) continue
    let i = top.length
    while (i > 0 && better(candidate, top[i - 1]) < 0) i--
    top.splice(i, 0, { ...p, equity: candidate.equity })
    if (top.length > limit) top.pop()
  }
  return top
}
