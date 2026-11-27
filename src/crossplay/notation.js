// Scrabble-style square notation: rows 1–15, columns A–O.
// Across plays are written row-first ("8H"), down plays column-first ("H8").

const COLS = 'ABCDEFGHIJKLMNO'

export function formatPlay({ row, col, dir }) {
  return dir === 'down' ? `${COLS[col]}${row + 1}` : `${row + 1}${COLS[col]}`
}

export function parseSquare(text) {
  const m = /^([A-O])(\d{1,2})$/i.exec(text) || /^(\d{1,2})([A-O])$/i.exec(text)
  if (!m) return null
  const [letter, num] = /\d/.test(m[1]) ? [m[2], m[1]] : [m[1], m[2]]
  return { row: Number(num) - 1, col: COLS.indexOf(letter.toUpperCase()) }
}
