import { useState, useEffect, useMemo, useRef } from 'react'
import { WORDS } from '../data/words'
import {
  SIZE, RACK_SIZE, BLANK, createLexicon, replay, evaluatePlay, playFromPlacement,
  generateMoves, rankMoves, emptyBoard, applyPlay, blankFixes, unseenTiles, bagCount, overdrawn, formatPlay, tileValue,
} from '../crossplay/index.js'
import { newGame, loadGames, saveGames, undoLastMove, setReported as withReportedScore, setMoveWord } from './crossplayStorage.js'
import CrossplayBoard from './CrossplayBoard'
import ScrabbleTile from './ScrabbleTile'

// The lexicon is immutable, so build it once per page load and share it across mounts.
let lexiconCache = null
const getLexicon = () => (lexiconCache ??= createLexicon(WORDS))

const KB_ROWS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'].map(r => r.split(''))
const MAX_SUGGESTIONS = 30

const ERRORS = {
  'no-center': 'The first word must cover the centre square.',
  'not-connected': 'The word must connect to tiles already on the board.',
  'too-short': 'Words need at least two letters.',
  'off-board': 'The word runs off the board.',
  'mismatch': "A letter doesn't match the tile on the board.",
  'no-new-tiles': 'Place at least one new tile.',
  'not-maximal': 'The word must include the adjacent tiles.',
}

// Remove used tiles from a rack. tiles: string of letters / '?' (blanks).
function removeRackTiles(rack, tiles) {
  const left = rack.split('')
  for (const t of tiles) {
    const i = left.indexOf(t)
    if (i >= 0) left.splice(i, 1)
  }
  return left.join('')
}

const playKey = p => `${p.row},${p.col},${p.dir},${p.word}`

const tilesOf = placed => placed.map(t => (t.blank ? BLANK : t.letter)).join('')

// Display a word with blanks (lowercase) shown as underlined uppercase.
function Word({ word }) {
  return (
    <span className="font-mono font-bold tracking-wide">
      {[...word].map((ch, i) =>
        ch === ch.toUpperCase()
          ? <span key={i}>{ch}</span>
          : <span key={i} className="underline decoration-dotted text-gray-400">{ch.toUpperCase()}</span>
      )}
    </span>
  )
}

function GamePill({ game, isActive, isPendingDelete, onTap, onLongPress, onConfirmDelete, onCancelDelete }) {
  const timer = useRef(null)
  const cancel = () => clearTimeout(timer.current)
  if (isPendingDelete) {
    return (
      <div className="flex items-center gap-1 flex-shrink-0">
        <span className="text-xs text-red-500 font-semibold px-1">Delete {game.name}?</span>
        <button onClick={onConfirmDelete} className="w-5 h-5 rounded-full bg-red-500 text-white text-xs">✓</button>
        <button onClick={onCancelDelete} className="w-5 h-5 rounded-full bg-gray-300 text-gray-600 text-xs">✕</button>
      </div>
    )
  }
  return (
    <button
      onPointerDown={() => { timer.current = setTimeout(onLongPress, 500) }}
      onPointerUp={cancel} onPointerLeave={cancel}
      onClick={onTap}
      className={`flex-shrink-0 px-3 h-6 rounded-full text-xs font-semibold select-none transition-colors ${
        isActive ? 'bg-wordle-green text-white' : 'bg-gray-200 text-gray-600 active:bg-gray-300'
      }`}
    >vs {game.name}</button>
  )
}

export default function CrossplayHelper({ showHelp, resetRef }) {
  // Read storage on every mount, and re-sync when another copy saves or the page
  // comes back on screen (same pattern as LettersHelper).
  const [state, setState] = useState(() => loadGames(localStorage))
  useEffect(() => {
    const resync = () => setState(loadGames(localStorage))
    const onStorage = e => { if (e.key === null || e.key?.startsWith('crossplay')) resync() }
    const onVisible = () => { if (document.visibilityState === 'visible') resync() }
    window.addEventListener('storage', onStorage)
    window.addEventListener('pageshow', resync)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('pageshow', resync)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  function update(fn) {
    setState(prev => {
      const next = fn(prev)
      saveGames(localStorage, next.games, next.activeId)
      return next
    })
  }
  const updateGame = fn => update(s => ({ ...s, games: s.games.map(g => (g.id === s.activeId ? fn(g) : g)) }))

  const { games, activeId } = state
  const game = games.find(g => g.id === activeId) ?? games[0]

  // UI state
  const [editing, setEditing] = useState(null)       // null | 'rack' | 'move'
  const [cursorStart, setCursorStart] = useState(null) // { row, col, dir }
  const [draft, setDraft] = useState([])             // placed tiles being typed
  const [pendingBlank, setPendingBlank] = useState(false)
  const [playerOverride, setPlayerOverride] = useState(null)
  const [reported, setReported] = useState('')
  const [confirmUnknown, setConfirmUnknown] = useState(false)
  const [selected, setSelected] = useState(null)     // playKey of the previewed suggestion
  const [blankEdit, setBlankEdit] = useState(null)   // index of the logged move whose blanks are being edited
  const [scoreEntry, setScoreEntry] = useState(null) // { index, value }: entering Crossplay's score for a logged move
  const [showLog, setShowLog] = useState(false)
  const [showUnseen, setShowUnseen] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  const [pendingDelete, setPendingDelete] = useState(null)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [renaming, setRenaming] = useState(null)
  const [renameName, setRenameName] = useState('')

  const lexicon = useMemo(getLexicon, [])
  const { board, results, totals } = useMemo(() => replay(game.moves), [game.moves])
  // boardsBefore[i] = the board just before move i (for blank fixes and editing).
  const boardsBefore = useMemo(() => {
    const out = []
    let b = emptyBoard()
    for (const m of game.moves) {
      out.push(b)
      if (m.kind === 'play' && evaluatePlay(b, m).ok) b = applyPlay(b, m)
    }
    return out
  }, [game.moves])
  const lastMoveTiles = useMemo(() => {
    const last = game.moves[game.moves.length - 1]
    if (!last || last.kind !== 'play') return null
    const before = replay(game.moves.slice(0, -1)).board
    const r = evaluatePlay(before, last)
    return r.ok ? new Set(r.placed.map(t => t.row * SIZE + t.col)) : null
  }, [game.moves])

  const lastPlayer = game.moves[game.moves.length - 1]?.player
  const player = playerOverride ?? (lastPlayer === 'me' ? 'opp' : 'me')

  const suggestions = useMemo(
    () => (game.rack ? rankMoves(generateMoves(board, game.rack, lexicon), MAX_SUGGESTIONS) : []),
    [board, game.rack, lexicon],
  )
  const unseen = useMemo(() => unseenTiles(board, game.rack), [board, game.rack])
  const unseenTotal = Object.values(unseen).reduce((a, b) => a + b, 0)
  const bag = bagCount(board, game.rack)
  const tooMany = overdrawn(board, game.rack)

  // Next empty square along the cursor line, skipping board tiles and draft tiles.
  function nextSquare(tiles = draft) {
    if (!cursorStart) return null
    const [dr, dc] = cursorStart.dir === 'down' ? [1, 0] : [0, 1]
    let r = cursorStart.row, c = cursorStart.col
    while (r < SIZE && c < SIZE) {
      if (!board[r * SIZE + c] && !tiles.some(t => t.row === r && t.col === c)) return { row: r, col: c }
      r += dr; c += dc
    }
    return null
  }
  const cursorSq = editing === 'move' ? nextSquare() : null
  const draftPlay = draft.length ? playFromPlacement(board, draft) : null
  const draftEval = draftPlay ? evaluatePlay(board, draftPlay, lexicon) : null
  const selectedPlay = selected != null ? suggestions.find(p => playKey(p) === selected) ?? null : null
  const preview = editing === 'move'
    ? draft
    : selectedPlay ? evaluatePlay(board, selectedPlay).placed : []

  function resetDraft() {
    setDraft([]); setPendingBlank(false); setReported(''); setConfirmUnknown(false)
  }
  function stopEditing() {
    setEditing(null); setCursorStart(null); resetDraft()
  }

  function logMove(move, rackAfter) {
    updateGame(g => ({ ...g, moves: [...g.moves, move], rack: rackAfter ?? g.rack }))
    setPlayerOverride(null)
    setSelected(null)
  }

  function logDraft() {
    if (!draftEval?.ok) return
    if (draftEval.unknownWords.length && !confirmUnknown) { setConfirmUnknown(true); return }
    const move = { player, kind: 'play', ...draftPlay }
    if (reported !== '' && !Number.isNaN(Number(reported))) move.reported = Number(reported)
    logMove(move, player === 'me' ? removeRackTiles(game.rack, tilesOf(draftEval.placed)) : undefined)
    stopEditing()
  }

  function playSuggestion(p) {
    const { row, col, dir, word } = p
    logMove({ player: 'me', kind: 'play', row, col, dir, word }, removeRackTiles(game.rack, p.tiles))
    setScoreEntry({ index: game.moves.length, value: '' }) // offer to record Crossplay's score
  }

  function saveScoreEntry() {
    if (!scoreEntry) return
    const v = scoreEntry.value === '' ? null : Number(scoreEntry.value)
    updateGame(g => withReportedScore(g, scoreEntry.index, v))
    if (v != null && v !== results[scoreEntry.index]?.score) setShowLog(true) // show the ⚠ and any blank fix
    setScoreEntry(null)
  }

  function handleSquareTap(row, col) {
    setSelected(null)
    if (editing === 'move' && cursorStart && cursorStart.row === row && cursorStart.col === col && !draft.length) {
      setCursorStart({ ...cursorStart, dir: cursorStart.dir === 'across' ? 'down' : 'across' })
      return
    }
    setCursorStart({ row, col, dir: cursorStart?.dir ?? 'across' })
    resetDraft()
    setEditing('move')
  }

  function handleKey(key) {
    if (editing === 'rack') {
      if (key === 'DEL') updateGame(g => ({ ...g, rack: g.rack.slice(0, -1) }))
      else if (key === 'ENTER') setEditing(null)
      else if (key === BLANK || /^[A-Z]$/.test(key)) {
        updateGame(g => (g.rack.length >= RACK_SIZE ? g : { ...g, rack: g.rack + key }))
      }
    } else if (editing === 'move') {
      setConfirmUnknown(false)
      if (key === 'DEL') { setDraft(d => d.slice(0, -1)); setPendingBlank(false) }
      else if (key === 'ENTER') logDraft()
      else if (key === BLANK) setPendingBlank(b => !b)
      else if (/^[A-Z]$/.test(key)) {
        const blank = pendingBlank
        setDraft(d => {
          const sq = nextSquare(d)
          return sq ? [...d, { ...sq, letter: key, blank }] : d
        })
        setPendingBlank(false)
      }
    }
  }
  const handleKeyRef = useRef(handleKey)
  handleKeyRef.current = handleKey

  // Physical keyboard while editing (ignored inside text inputs).
  useEffect(() => {
    function onKey(e) {
      if (e.target instanceof HTMLInputElement) return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      let key = null
      if (/^[a-zA-Z]$/.test(e.key)) key = e.key.toUpperCase()
      else if (e.key === 'Backspace') key = 'DEL'
      else if (e.key === 'Enter') key = 'ENTER'
      else if (e.key === '?' || e.key === ' ') key = BLANK
      else if (e.key === 'Escape') { setEditing(null); setCursorStart(null); setDraft([]); return }
      if (!key) return
      e.preventDefault()
      handleKeyRef.current(key)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  // Games
  function switchGame(id) {
    update(s => ({ ...s, activeId: id }))
    stopEditing(); setSelected(null); setPlayerOverride(null)
  }
  function createGame(name) {
    const g = newGame(name)
    update(s => ({ games: [...s.games, g], activeId: g.id }))
    stopEditing(); setSelected(null); setPlayerOverride(null)
  }
  function deleteGame(id) {
    update(s => {
      let rest = s.games.filter(g => g.id !== id)
      if (!rest.length) rest = [newGame()]
      return { games: rest, activeId: rest.some(g => g.id === s.activeId) ? s.activeId : rest[0].id }
    })
    setPendingDelete(null); stopEditing(); setSelected(null)
  }
  function renameGame(id, name) {
    update(s => ({ ...s, games: s.games.map(g => (g.id === id ? { ...g, name, opponent: name } : g)) }))
    setRenaming(null)
  }

  if (resetRef) resetRef.current = () => setConfirmReset(true)

  const keyBtn = 'flex-1 min-w-0 h-9 sm:h-10 rounded text-xs font-bold select-none'

  return (
    <div className="fixed top-10 bottom-0 left-0 right-0 flex flex-col bg-white">
      {/* Games strip */}
      <div className="flex-shrink-0 border-b border-gray-200">
        <div className="flex flex-wrap items-center gap-1.5 px-3 py-1.5 max-w-lg mx-auto max-h-[4.25rem] overflow-y-auto">
          {games.map(g => (
            renaming === g.id ? (
              <input key={g.id} autoFocus value={renameName}
                onChange={e => setRenameName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && renameName.trim()) renameGame(g.id, renameName.trim())
                  if (e.key === 'Escape') setRenaming(null)
                }}
                onBlur={() => (renameName.trim() ? renameGame(g.id, renameName.trim()) : setRenaming(null))}
                className="w-24 h-6 px-2 text-xs border border-wordle-green rounded-full focus:outline-none" />
            ) : (
              <GamePill key={g.id} game={g} isActive={g.id === game.id} isPendingDelete={pendingDelete === g.id}
                onTap={() => {
                  if (pendingDelete) { setPendingDelete(null); return }
                  if (g.id === game.id) { setRenameName(g.name); setRenaming(g.id) } else switchGame(g.id)
                }}
                onLongPress={() => setPendingDelete(g.id)}
                onConfirmDelete={() => deleteGame(g.id)}
                onCancelDelete={() => setPendingDelete(null)} />
            )
          ))}
          {creating ? (
            <input autoFocus value={newName} placeholder="Opponent"
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && newName.trim()) { createGame(newName.trim()); setCreating(false); setNewName('') }
                if (e.key === 'Escape') { setCreating(false); setNewName('') }
              }}
              onBlur={() => { if (newName.trim()) createGame(newName.trim()); setCreating(false); setNewName('') }}
              className="w-24 h-6 px-2 text-xs border border-wordle-green rounded-full focus:outline-none" />
          ) : (
            <button onClick={() => setCreating(true)} aria-label="New game"
              className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-200 text-gray-600 text-sm font-bold active:bg-gray-300">+</button>
          )}
        </div>
      </div>

      {/* Scrolling content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-lg mx-auto px-2 py-2 flex flex-col gap-2">
          {showHelp && (
            <div className="text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded p-2 space-y-1">
              <p><b>Log every move</b>, yours and your opponent's: tap the square where the word starts (tap it again to switch ▶ across / ▼ down), then type only the new letters — tiles already on the board are skipped. Press <b>?</b> before a letter to mark it as a blank.</p>
              <p>Optionally enter the score Crossplay showed; if it differs from the app's score the move gets a ⚠ and the totals use Crossplay's number.</p>
              <p><b>Your rack</b>: tap it and type your tiles (<b>?</b> = blank). The best plays appear below, ranked by score plus how good the tiles you keep are. Tap one to preview it, then <b>Play</b> to log it — then type the tiles you drew.</p>
              <p>Positions: across plays are row-then-column (<b>8H</b>), down plays column-then-row (<b>H8</b>). Underlined letters are blanks.</p>
              <p><b>Blanks:</b> in Crossplay a tile showing <b>0</b> is a blank. Forgot to mark one? Open <b>Moves</b> and tap the word to toggle its tiles, or use the suggested fix when Crossplay's score differs.</p>
            </div>
          )}

          {confirmReset && (
            <div className="flex items-center justify-between gap-2 text-sm bg-red-50 border border-red-200 rounded px-2 py-1.5">
              <span>Clear all moves and the rack of this game?</span>
              <span className="flex gap-1">
                <button className="px-2 py-0.5 rounded bg-red-500 text-white text-xs font-bold"
                  onClick={() => { updateGame(g => ({ ...g, moves: [], rack: '' })); stopEditing(); setSelected(null); setConfirmReset(false) }}>Clear</button>
                <button className="px-2 py-0.5 rounded bg-gray-200 text-xs font-bold" onClick={() => setConfirmReset(false)}>Cancel</button>
              </span>
            </div>
          )}

          {/* Scores */}
          <div className="flex items-baseline justify-between text-sm px-1">
            <span><b className="text-base">{totals.me}</b> You</span>
            <span className="text-xs text-gray-500">bag {bag}</span>
            <span>{game.name} <b className="text-base">{totals.opp}</b></span>
          </div>

          <CrossplayBoard board={board} preview={preview} highlight={lastMoveTiles}
            cursor={cursorSq && { ...cursorSq, dir: cursorStart.dir }} onSquareTap={handleSquareTap} />

          {/* Turn controls */}
          <div className="flex items-center gap-1 text-xs">
            <div className="flex rounded overflow-hidden border border-gray-300">
              {[['me', 'Me'], ['opp', game.name]].map(([p, label]) => (
                <button key={p} onClick={() => setPlayerOverride(p)}
                  className={`px-2 h-7 font-semibold max-w-[7rem] truncate ${player === p ? 'bg-wordle-green text-white' : 'bg-white text-gray-600'}`}>{label}</button>
              ))}
            </div>
            <button onClick={() => logMove({ player, kind: 'swap' })} className="px-2 h-7 rounded bg-gray-200 font-semibold">Swap</button>
            <button onClick={() => logMove({ player, kind: 'pass' })} className="px-2 h-7 rounded bg-gray-200 font-semibold">Pass</button>
            <button disabled={!game.moves.length}
              onClick={() => { updateGame(undoLastMove); stopEditing(); setPlayerOverride(null) }}
              className="px-2 h-7 rounded bg-gray-200 font-semibold disabled:opacity-40 ml-auto">Undo</button>
          </div>

          {/* Move entry */}
          {editing === 'move' && (
            <div className="border border-wordle-green rounded p-2 text-sm flex flex-col gap-1.5">
              {!draft.length && (
                <p className="text-xs text-gray-500">
                  Type the new letters for {player === 'me' ? 'your' : `${game.name}'s`} word.
                  Tap the square again to switch to {cursorStart?.dir === 'across' ? 'down ▼' : 'across ▶'}.
                </p>
              )}
              {draft.length > 0 && draftEval?.ok && (
                <div>
                  <div className="flex items-baseline gap-2">
                    <Word word={draftPlay.word} />
                    <span className="text-xs text-gray-500">{formatPlay(draftPlay)}</span>
                    <span className="ml-auto font-bold">{draftEval.score} pts{draftEval.sweep && ' (sweep!)'}</span>
                  </div>
                  {draftEval.words.length > 1 && (
                    <div className="text-xs text-gray-500">also {draftEval.words.slice(1).map(w => `${w.word} ${w.score}`).join(', ')}</div>
                  )}
                  {draftEval.unknownWords.length > 0 && (
                    <div className="text-xs text-amber-700">
                      Not in the dictionary: {draftEval.unknownWords.join(', ')}.
                      {confirmUnknown ? ' Tap Log again if Crossplay accepted it.' : ''}
                    </div>
                  )}
                </div>
              )}
              {draft.length > 0 && !draftEval?.ok && (
                <p className="text-xs text-red-600">{draftPlay ? ERRORS[draftEval.error] : 'Tiles must be in one line.'}</p>
              )}
              <div className="flex items-center gap-1.5">
                <label className="text-xs text-gray-500 flex items-center gap-1">
                  Crossplay score
                  <input value={reported} inputMode="numeric" placeholder="—"
                    onChange={e => setReported(e.target.value.replace(/\D/g, ''))}
                    className="w-12 h-7 px-1 border border-gray-300 rounded text-sm text-center" />
                </label>
                <button onClick={stopEditing} className="ml-auto px-3 h-7 rounded bg-gray-200 text-xs font-bold">Cancel</button>
                <button onClick={logDraft} disabled={!draftEval?.ok}
                  className="px-3 h-7 rounded bg-wordle-green text-white text-xs font-bold disabled:opacity-40">
                  Log {player === 'me' ? 'my' : `${game.name}'s`} move
                </button>
              </div>
            </div>
          )}

          {/* Crossplay's score for a logged move */}
          {scoreEntry && game.moves[scoreEntry.index] && (
            <div className="flex items-center gap-1.5 text-xs border border-gray-200 rounded px-2 py-1.5">
              <span>
                Crossplay's score for{' '}
                {game.moves[scoreEntry.index].kind === 'play' ? <Word word={game.moves[scoreEntry.index].word} /> : game.moves[scoreEntry.index].kind}
                {' '}(app: {results[scoreEntry.index]?.score})
              </span>
              <input autoFocus value={scoreEntry.value} inputMode="numeric" placeholder="—"
                onChange={e => setScoreEntry({ ...scoreEntry, value: e.target.value.replace(/\D/g, '') })}
                onKeyDown={e => { if (e.key === 'Enter') saveScoreEntry(); if (e.key === 'Escape') setScoreEntry(null) }}
                className="w-12 h-7 px-1 border border-gray-300 rounded text-sm text-center" />
              <button onClick={() => setScoreEntry(null)} className="ml-auto px-2 h-7 rounded bg-gray-200 font-bold">Skip</button>
              <button onClick={saveScoreEntry} className="px-2 h-7 rounded bg-wordle-green text-white font-bold">Save</button>
            </div>
          )}

          {/* Rack */}
          <button type="button" onClick={() => { setEditing(editing === 'rack' ? null : 'rack'); setCursorStart(null); resetDraft() }}
            className={`flex items-center gap-1 min-h-[3rem] px-2 rounded border-2 text-left ${editing === 'rack' ? 'border-wordle-green' : 'border-gray-200'}`}>
            <span className="text-xs text-gray-500 w-10 flex-shrink-0">Rack</span>
            {game.rack
              ? [...game.rack].map((t, i) => (
                  <ScrabbleTile key={i} letter={t === BLANK ? '.' : t} score={t === BLANK ? 0 : tileValue(t)} width={32} />
                ))
              : <span className="text-sm text-gray-400">Tap to enter your tiles</span>}
          </button>
          {tooMany.length > 0 && (
            <p className="text-xs text-red-600 px-1">More {tooMany.join(', ')} than are left in the game — check the rack or the board.</p>
          )}

          {/* Best moves */}
          {editing !== 'move' && game.rack && (
            <div className="flex flex-col">
              <div className="text-xs font-semibold text-gray-500 px-1 pb-1">
                Best moves {suggestions.length === 0 && '— none found (swap?)'}
              </div>
              {suggestions.map((p, i) => (
                <div key={playKey(p)}
                  onClick={() => setSelected(selected === playKey(p) ? null : playKey(p))}
                  className={`flex items-center gap-2 px-2 py-1 text-sm rounded cursor-pointer ${selected === playKey(p) ? 'bg-amber-100' : i % 2 ? 'bg-gray-50' : ''}`}>
                  <Word word={p.word} />
                  <span className="text-xs text-gray-500">{formatPlay(p)}</span>
                  {p.sweep && <span className="text-[10px] font-bold text-red-600">SWEEP</span>}
                  <span className="ml-auto text-xs text-gray-400">{p.leave ? `keeps ${p.leave}` : ''}</span>
                  <span className="w-8 text-right font-bold">{p.score}</span>
                  {selected === playKey(p) && (
                    <button onClick={e => { e.stopPropagation(); playSuggestion(p) }}
                      className="px-2 h-6 rounded bg-wordle-green text-white text-xs font-bold">Play</button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Move log */}
          <div className="border-t border-gray-100 pt-1">
            <button onClick={() => setShowLog(s => !s)} className="text-xs font-semibold text-gray-500 px-1">
              {showLog ? '▾' : '▸'} Moves ({game.moves.length})
            </button>
            {showLog && (
              <ol className="text-xs mt-1">
                {game.moves.map((m, i) => {
                  const r = results[i]
                  const who = m.player === 'me' ? 'You' : game.name
                  const row = (
                    <li key={i} className={`flex gap-2 px-1 py-0.5 ${i % 2 ? 'bg-gray-50' : ''}`}>
                      <span className="w-5 text-gray-400">{i + 1}</span>
                      <span className="w-16 truncate">{who}</span>
                      {m.kind === 'play'
                        ? <>
                            <button title="Mark blanks" onClick={() => setBlankEdit(blankEdit === i ? null : i)}><Word word={m.word} /></button>
                            <span className="text-gray-500">{formatPlay(m)}</span>
                          </>
                        : <span className="italic text-gray-500">{m.kind}</span>}
                      {r.error && <span className="text-red-600">invalid: {ERRORS[r.error]}</span>}
                      {r.mismatch && <span className="text-amber-700">⚠ app {r.score}</span>}
                      <button className="ml-auto font-bold underline decoration-dotted"
                        title="Enter the score Crossplay showed"
                        onClick={() => setScoreEntry({ index: i, value: m.reported != null ? String(m.reported) : '' })}>{r.counted}</button>
                    </li>
                  )
                  const fixes = r.mismatch && m.kind === 'play' ? blankFixes(boardsBefore[i], m, m.reported).slice(0, 3) : []
                  const editRow = blankEdit === i && m.kind === 'play' && (
                    <li key={`${i}-blanks`} className="flex flex-wrap items-center gap-1 px-1 py-1 bg-amber-50">
                      <span className="text-gray-500 mr-1">Tap a tile to mark it as a blank:</span>
                      {[...m.word].map((ch, k) => {
                        const [dr, dc] = m.dir === 'down' ? [1, 0] : [0, 1]
                        const existing = boardsBefore[i][(m.row + dr * k) * SIZE + (m.col + dc * k)]
                        const isBlank = ch !== ch.toUpperCase()
                        return existing
                          ? <span key={k} className="w-6 h-6 flex items-center justify-center rounded bg-gray-200 text-gray-400 font-bold">{ch.toUpperCase()}</span>
                          : <button key={k}
                              onClick={() => {
                                const flipped = [...m.word].map((c, j) => (j === k ? (isBlank ? c.toUpperCase() : c.toLowerCase()) : c)).join('')
                                updateGame(g => setMoveWord(g, i, flipped))
                              }}
                              className={`w-6 h-6 rounded font-bold ${isBlank ? 'border-2 border-dashed border-gray-400 text-gray-500 bg-white' : 'bg-[#3b67b8] text-white'}`}>
                              {ch.toUpperCase()}
                            </button>
                      })}
                      <button onClick={() => setBlankEdit(null)} className="ml-auto px-2 h-6 rounded bg-gray-200 font-bold">Done</button>
                    </li>
                  )
                  return [row, editRow, ...fixes.map(f => (
                    <li key={`${i}-fix-${f.word}`} className="flex items-center gap-2 px-1 py-1 bg-amber-50">
                      <span className="text-amber-800">Crossplay's {m.reported} fits if {f.blanks.join(' and ')} {f.blanks.length > 1 ? 'were blanks' : 'was a blank'}.</span>
                      <button onClick={() => updateGame(g => setMoveWord(g, i, f.word))}
                        className="ml-auto px-2 h-6 rounded bg-wordle-green text-white font-bold">Fix</button>
                    </li>
                  ))]
                })}
              </ol>
            )}
          </div>

          {/* Unseen tiles */}
          <div className="pb-2">
            <button onClick={() => setShowUnseen(s => !s)} className="text-xs font-semibold text-gray-500 px-1">
              {showUnseen ? '▾' : '▸'} Unseen tiles ({unseenTotal})
            </button>
            {showUnseen && (
              <div className="grid grid-cols-9 gap-1 mt-1 text-xs">
                {Object.entries(unseen).map(([t, n]) => (
                  <div key={t} className={`flex justify-between px-1 rounded ${n ? 'bg-gray-100' : 'text-gray-300'}`}>
                    <b>{t}</b><span>{n}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* On-screen keyboard while editing the rack or a move */}
      {editing && (
        <div className="flex-shrink-0 border-t border-gray-100 pt-2 px-2 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          <div className="max-w-lg mx-auto flex flex-col gap-1">
            {KB_ROWS.map((row, ri) => (
              <div key={ri} className={`flex gap-1 ${ri === 1 ? 'px-[5%]' : ''}`}>
                {ri === 2 && (
                  <button onClick={() => handleKey(BLANK)}
                    className={`${keyBtn} flex-[1.5] ${pendingBlank ? 'bg-amber-400 text-white' : 'bg-blue-100 text-blue-700'}`}>?</button>
                )}
                {row.map(l => (
                  <button key={l} onClick={() => handleKey(l)} className={`${keyBtn} bg-gray-200 active:bg-gray-400`}>{l}</button>
                ))}
                {ri === 2 && (
                  <button onClick={() => handleKey('DEL')} className={`${keyBtn} flex-[1.5] bg-gray-300`}>⌫</button>
                )}
              </div>
            ))}
            <div className="flex gap-1">
              <button onClick={stopEditing} className={`${keyBtn} bg-gray-300`}>Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
