import { SIZE, premiumAt, tileValue } from '../crossplay/rules.js'

const PREMIUM_STYLE = {
  TW: { bg: '#ead6f0', fg: '#8e3fa8', label: '3W' },
  DW: { bg: '#dbe3f2', fg: '#3f62a8', label: '2W' },
  TL: { bg: '#dfe8d6', fg: '#4f7a3a', label: '3L' },
  DL: { bg: '#f4ebcf', fg: '#a07a1c', label: '2L' },
}

const TILE_BG = '#3b67b8'
const COLS = 'ABCDEFGHIJKLMNO'
const LABEL = 'flex items-center justify-center text-gray-400 font-semibold select-none'
const LABEL_SIZE = { fontSize: 'clamp(7px, 2.2vw, 11px)' }

// board: Cell[225]; preview: {row,col,letter,blank}[]; highlight: Set of indices (last move);
// cursor: {row,col,dir} | null; onSquareTap(row, col)
export default function CrossplayBoard({ board, preview = [], highlight, cursor, onSquareTap }) {
  const previewAt = new Map(preview.map(t => [t.row * SIZE + t.col, t]))
  // Coordinates: a corner spacer and column letters A–O on top; each row starts with its number.
  const cells = [<div key="corner" />]
  for (let c = 0; c < SIZE; c++) cells.push(<div key={`col${c}`} className={LABEL} style={LABEL_SIZE}>{COLS[c]}</div>)
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
    if (c === 0) cells.push(<div key={`row${r}`} className={LABEL} style={LABEL_SIZE}>{r + 1}</div>)
    const i = r * SIZE + c
    const cell = board[i]
    const pv = previewAt.get(i)
    const tile = cell || pv
    const isCursor = cursor && cursor.row === r && cursor.col === c
    let content
    let style
    if (tile) {
      const ch = tile.blank ? tile.letter.toLowerCase() : tile.letter
      style = {
        background: pv ? '#f6c945' : TILE_BG,
        color: pv ? '#3a2c00' : '#fff',
        boxShadow: highlight?.has(i) ? 'inset 0 0 0 2px #f6c945' : undefined,
      }
      content = (
        <>
          <span className={`font-bold leading-none ${tile.blank ? 'opacity-70 italic' : ''}`}
            style={{ fontSize: 'clamp(9px, 3.4vw, 15px)' }}>{tile.letter}</span>
          {!tile.blank && (
            <span className="absolute top-[1px] right-[2px] leading-none font-semibold"
              style={{ fontSize: 'clamp(5px, 1.6vw, 8px)' }}>{tileValue(ch)}</span>
          )}
        </>
      )
    } else {
      const p = PREMIUM_STYLE[premiumAt(r, c)]
      style = { background: p ? p.bg : '#ececec', color: p ? p.fg : undefined }
      content = isCursor
        ? <span className="font-bold text-wordle-green" style={{ fontSize: 'clamp(9px, 3.4vw, 15px)' }}>{cursor.dir === 'down' ? '▼' : '▶'}</span>
        : p && <span className="font-bold leading-none" style={{ fontSize: 'clamp(6px, 2vw, 10px)' }}>{p.label}</span>
    }
    cells.push(
      <button key={i} type="button" onClick={() => onSquareTap?.(r, c)}
        className={`relative aspect-square rounded-[3px] focus:outline-none flex items-center justify-center select-none ${isCursor ? 'ring-2 ring-wordle-green z-10' : ''}`}
        style={style}
        aria-label={`row ${r + 1} column ${COLS[c]}`}>
        {content}
      </button>
    )
  }
  return (
    <div className="grid gap-[2px] w-full" style={{ gridTemplateColumns: `minmax(0, 0.55fr) repeat(${SIZE}, minmax(0, 1fr))` }}>
      {cells}
    </div>
  )
}
