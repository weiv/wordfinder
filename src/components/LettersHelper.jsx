import { useState, useEffect, useRef, useMemo, Fragment } from 'react'
import { byLength } from '../data/words'
import ScrabbleTile from './ScrabbleTile'

const SCORES = {
  A:1, E:1, I:1, O:1, N:1, S:1, T:1, R:1,
  D:2, U:2, L:2,
  C:3, H:3, M:3, P:3,
  B:4, G:4, F:4, V:4, Y:4,
  W:5,
  K:6,
  X:8,
  J:10, Q:10, Z:10,
}

function scrabbleScore(word) {
  return word.split('').reduce((sum, l) => sum + (SCORES[l] || 0), 0)
}

function canForm(word, available) {
  const avail = {}
  for (const c of available) {
    if (c === '.') avail['_'] = (avail['_'] || 0) + 1
    else avail[c] = (avail[c] || 0) + 1
  }
  const blanksCover = []
  for (const c of word) {
    if (avail[c] > 0) {
      avail[c]--
    } else if (avail['_'] > 0) {
      avail['_']--
      blanksCover.push(c)
    } else {
      return null
    }
  }
  return blanksCover
}

function matchPattern(word, patternCore, anchorStart, anchorEnd, available) {
  const pLen = patternCore.length
  const wLen = word.length
  if (pLen > wLen) return null
  for (let start = 0; start <= wLen - pLen; start++) {
    if (anchorStart && start !== 0) continue
    if (anchorEnd && start !== wLen - pLen) continue
    let mismatch = false
    const pool = []
    for (let i = 0; i < pLen; i++) {
      const pc = patternCore[i], wc = word[start + i]
      if (pc === '.') pool.push(wc)
      else if (pc !== wc) { mismatch = true; break }
    }
    if (mismatch) continue
    for (let i = 0; i < start; i++) pool.push(word[i])
    for (let i = start + pLen; i < wLen; i++) pool.push(word[i])
    const result = canForm(pool.join(''), available)
    if (result !== null) return result
  }
  return null
}

// variant: 'prominent' (saved section) | 'saved' (result, in saved) | 'normal' (result, not saved)
function WordCard({ word, score, blanksCover, variant, usesAll, onClick,
                    onRemove, onScoreDown, onScoreUp }) {
  const blanksLeft = {}
  for (const l of blanksCover) blanksLeft[l] = (blanksLeft[l] || 0) + 1

  const wordLetters = (
    <span className="text-sm font-mono font-semibold uppercase text-white">
      {word.split('').map((c, i) => {
        if (blanksLeft[c] > 0) { blanksLeft[c]--; return <span key={i} className="text-green-200">{c}</span> }
        return <span key={i}>{c}</span>
      })}
    </span>
  )

  if (variant === 'prominent') {
    return (
      <div className="flex-shrink-0 flex items-center gap-1 px-1.5 py-1 rounded-md shadow-sm border bg-wordle-green border-wordle-green">
        <button onClick={onRemove} className="flex items-center">
          {wordLetters}
        </button>
        <div className="flex items-center gap-0">
          <button onClick={onScoreDown} className="text-green-200 text-xs leading-none px-0.5 active:opacity-60">▼</button>
          <span className="text-xs font-bold text-green-200 min-w-[1.5rem] text-center">{score}</span>
          <button onClick={onScoreUp} className="text-green-200 text-xs leading-none px-0.5 active:opacity-60">▲</button>
        </div>
      </div>
    )
  }

  const blanksLeft2 = {}
  for (const l of blanksCover) blanksLeft2[l] = (blanksLeft2[l] || 0) + 1
  // A word that uses every rack tile (a "bingo") is highlighted red.
  const cardClass = usesAll
    ? 'bg-red-50 border-red-400'
    : variant === 'saved' ? 'bg-green-50 border-wordle-green' : 'bg-white border-gray-300 hover:border-wordle-green'
  const letterClass = usesAll ? 'text-red-600' : 'text-gray-800'
  const blankClass  = usesAll ? 'text-red-300' : 'text-gray-400'
  const scoreClass  = usesAll ? 'text-red-500' : 'text-wordle-green'
  return (
    <button onClick={onClick} className={`flex items-center gap-1 px-3 py-1 rounded-md shadow-sm border transition-colors ${cardClass}`}>
      <span className="text-sm font-mono font-semibold tracking-wider uppercase">
        {word.split('').map((c, i) => {
          if (blanksLeft2[c] > 0) { blanksLeft2[c]--; return <span key={i} className={blankClass}>{c}</span> }
          return <span key={i} className={letterClass}>{c}</span>
        })}
      </span>
      <span className={`text-xs font-bold ${scoreClass}`}>{score}</span>
    </button>
  )
}

function SessionPill({ session, isActive, isPendingDelete, onTap, onLongPress, onConfirmDelete, onCancelDelete }) {
  const timer = useRef(null)
  const cancel = () => clearTimeout(timer.current)

  if (isPendingDelete) {
    return (
      <div className="flex items-center gap-1 flex-shrink-0">
        <span className="text-xs text-red-500 font-semibold px-1">{session.name}?</span>
        <button onClick={onConfirmDelete}
          className="w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center active:opacity-70">✓</button>
        <button onClick={onCancelDelete}
          className="w-5 h-5 rounded-full bg-gray-300 text-gray-600 text-xs flex items-center justify-center active:opacity-70">✕</button>
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
    >
      {session.name}
    </button>
  )
}

const KB_ROW1 = 'QWERTYUIOP'.split('')
const KB_ROW2 = 'ASDFGHJKL'.split('')
const KB_ROW3 = 'ZXCVBNM'.split('')

function newSession(name, id = Date.now().toString()) {
  return { id, name, letters: '', posLetters: '', savedWords: [] }
}

function loadSessions() {
  const raw = localStorage.getItem('sessions')
  if (!raw) {
    const session = {
      id: '1', name: 'Game 1',
      letters:    localStorage.getItem('letters') || '',
      posLetters: localStorage.getItem('posLetters') || '',
      savedWords: JSON.parse(localStorage.getItem('savedWords') || '[]'),
    }
    localStorage.setItem('sessions', JSON.stringify([session]))
    localStorage.setItem('activeSessionId', '1')
    localStorage.removeItem('letters')
    localStorage.removeItem('posLetters')
    localStorage.removeItem('savedWords')
    return { sessions: [session], activeSessionId: '1' }
  }
  const sessions = JSON.parse(raw)
  return {
    sessions,
    activeSessionId: localStorage.getItem('activeSessionId') || sessions[0].id,
  }
}

const _initialState = loadSessions()

// Serialize tile arrays back to strings
function rackToString(tiles) { return tiles.join('') }
function patternToString(tiles) {
  const hasStart = tiles[0] === '^'
  const hasEnd   = tiles[tiles.length - 1] === '$'
  const core     = tiles.filter(t => t !== '^' && t !== '$').join('')
  return (hasStart ? '^' : '') + core + (hasEnd ? '$' : '')
}

// Drop indicator line
function DropIndicator() {
  return (
    <div
      className="self-center rounded flex-shrink-0"
      style={{ width: 2, height: 40, background: '#6aaa64', pointerEvents: 'none' }}
    />
  )
}

// Small per-section clear button
function ClearButton({ onClick }) {
  return (
    <button onClick={onClick}
      className="flex-shrink-0 px-2 h-6 rounded-full bg-gray-200 text-gray-500 text-xs font-semibold hover:bg-gray-300 active:bg-gray-400 transition-colors">
      Clear
    </button>
  )
}

export default function LettersHelper() {
  const [sessions, setSessions] = useState(_initialState.sessions)
  const [activeSessionId, setActiveSessionId] = useState(_initialState.activeSessionId)
  const [results, setResults] = useState([])
  const [searched, setSearched] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [activeRow, setActiveRow] = useState('rack')
  const [drag, setDrag] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(null)
  const [creatingSession, setCreatingSession] = useState(false)
  const [newName, setNewName] = useState('')
  const newNameRef = useRef(null)
  const [renamingSession, setRenamingSession] = useState(null)
  const [renameName, setRenameName] = useState('')
  const renameRef = useRef(null)
  const rackRowRef    = useRef(null)
  const patternRowRef = useRef(null)

  // Keep a ref to the latest drag state for use inside event listeners
  const dragRef = useRef(null)
  dragRef.current = drag

  const activeSession = sessions.find(s => s.id === activeSessionId) ?? sessions[0]
  const letters    = activeSession.letters
  const posLetters = activeSession.posLetters
  const saved      = activeSession.savedWords
  const savedSet   = useMemo(() => new Set(saved.map(s => s.word)), [saved])

  // Derive tile arrays from strings
  const rackTiles = useMemo(() => letters ? letters.split('') : [], [letters])
  const patternTiles = useMemo(() => {
    const arr = []
    if (/^[\^#@]/.test(posLetters)) arr.push('^')
    const core = posLetters.replace(/^[\^#@]/, '').replace(/[$!]$/, '')
    if (core) arr.push(...core.split(''))
    if (/[$!]$/.test(posLetters)) arr.push('$')
    return arr
  }, [posLetters])

  // Keep refs updated so event-listener closures always see current arrays
  const rackTilesRef    = useRef(rackTiles)
  rackTilesRef.current  = rackTiles
  const patternTilesRef = useRef(patternTiles)
  patternTilesRef.current = patternTiles

  function updateActiveSession(patch) {
    setSessions(prev => {
      const next = prev.map(s => s.id === activeSessionId ? { ...s, ...patch } : s)
      localStorage.setItem('sessions', JSON.stringify(next))
      return next
    })
  }

  const clearSearch = () => { setResults([]); setSearched(false) }

  function createSession(name) {
    const s = newSession(name)
    setSessions(prev => {
      const next = [...prev, s]
      localStorage.setItem('sessions', JSON.stringify(next))
      return next
    })
    setActiveSessionId(s.id)
    localStorage.setItem('activeSessionId', s.id)
    clearSearch()
  }

  function switchSession(id) {
    setSessions(prev => {
      const idx = prev.findIndex(s => s.id === id)
      if (idx <= 0) return prev
      const next = [prev[idx], ...prev.slice(0, idx), ...prev.slice(idx + 1)]
      localStorage.setItem('sessions', JSON.stringify(next))
      return next
    })
    setActiveSessionId(id)
    localStorage.setItem('activeSessionId', id)
    clearSearch()
  }

  function deleteSession(id) {
    setSessions(prev => {
      let next = prev.filter(s => s.id !== id)
      if (next.length === 0) next = [newSession('Game 1')]
      localStorage.setItem('sessions', JSON.stringify(next))
      if (id === activeSessionId) {
        setActiveSessionId(next[0].id)
        localStorage.setItem('activeSessionId', next[0].id)
      }
      return next
    })
    setPendingDelete(null)
    clearSearch()
  }

  function renameSession(id, name) {
    setSessions(prev => {
      const idx = prev.findIndex(s => s.id === id)
      const updated = { ...prev[idx], name }
      const next = idx > 0
        ? [updated, ...prev.slice(0, idx), ...prev.slice(idx + 1)]
        : prev.map(s => s.id === id ? { ...s, name } : s)
      localStorage.setItem('sessions', JSON.stringify(next))
      return next
    })
    setRenamingSession(null)
  }

  const updateGameScore = (word, gameScore) => {
    const next = saved.map(s => s.word === word ? { ...s, gameScore } : s)
    updateActiveSession({ savedWords: next })
  }

  const toggleSaved = (wordObj) => {
    const next = saved.some(s => s.word === wordObj.word)
      ? saved.filter(s => s.word !== wordObj.word)
      : [...saved, wordObj]
    updateActiveSession({ savedWords: next })
  }

  // Tile mutation helpers
  function removeTile(row, index) {
    if (row === 'rack') {
      const next = [...rackTilesRef.current]
      next.splice(index, 1)
      updateActiveSession({ letters: rackToString(next) })
    } else {
      const next = [...patternTilesRef.current]
      next.splice(index, 1)
      updateActiveSession({ posLetters: patternToString(next) })
    }
  }

  function commitDrop(dragState) {
    const newRack    = [...rackTilesRef.current]
    const newPattern = [...patternTilesRef.current]

    if (dragState.srcRow === 'rack') newRack.splice(dragState.srcIndex, 1)
    else if (dragState.srcRow === 'pattern') newPattern.splice(dragState.srcIndex, 1)

    // When moving within the same row, the placeholder was counted in dropIndex,
    // so we shift down by one to compensate.
    let dropIdx = dragState.dropIndex
    if (dragState.srcRow === dragState.dropRow && dropIdx > dragState.srcIndex) {
      dropIdx--
    }

    if (dragState.dropRow === 'rack') {
      dropIdx = Math.max(0, Math.min(dropIdx, newRack.length))
      newRack.splice(dropIdx, 0, dragState.letter)
    } else if (dragState.dropRow === 'pattern') {
      if (dragState.letter === '^') dropIdx = 0
      else if (dragState.letter === '$') dropIdx = newPattern.length
      else dropIdx = Math.max(0, Math.min(dropIdx, newPattern.length))
      newPattern.splice(dropIdx, 0, dragState.letter)
    }

    updateActiveSession({
      letters:    rackToString(newRack),
      posLetters: patternToString(newPattern),
    })
  }

  // Keep refs to handlers so effects don't need them as deps
  const dragHandlersRef = useRef({})
  dragHandlersRef.current = { removeTile, commitDrop }

  function handleTilePointerDown(e, row, index, letter) {
    e.preventDefault()
    setActiveRow(row)
    const rect = e.currentTarget.getBoundingClientRect()
    setDrag({
      srcRow: row, srcIndex: index, letter,
      pointerX: e.clientX, pointerY: e.clientY,
      originX:  e.clientX, originY:  e.clientY,
      offsetX:  e.clientX - rect.left,
      offsetY:  e.clientY - rect.top,
      tileW: rect.width, tileH: rect.height,
      dropRow: null, dropIndex: null,
    })
  }

  // Attach/detach document pointer listeners while a drag is active
  useEffect(() => {
    if (!drag) return

    function onMove(e) {
      const prev = dragRef.current
      if (!prev) return

      const rackRect = rackRowRef.current?.getBoundingClientRect()
      const patRect  = patternRowRef.current?.getBoundingClientRect()

      // Generous vertical hit zone (+/-20px) for easier mobile drop
      const inRect = (rect, x, y) =>
        rect &&
        x >= rect.left && x <= rect.right &&
        y >= rect.top - 20 && y <= rect.bottom + 20

      let dropRow = null, dropIndex = null

      // Anchors (^ $) can only land in the pattern row
      if (prev.letter !== '^' && prev.letter !== '$' && inRect(rackRect, e.clientX, e.clientY)) {
        dropRow = 'rack'
      } else if (inRect(patRect, e.clientX, e.clientY)) {
        dropRow = 'pattern'
      }

      if (dropRow !== null) {
        const rowRef  = dropRow === 'rack' ? rackRowRef : patternRowRef
        const tileEls = rowRef.current?.querySelectorAll('[data-tile]')
        dropIndex = tileEls ? tileEls.length : 0
        if (tileEls) {
          for (let i = 0; i < tileEls.length; i++) {
            const r = tileEls[i].getBoundingClientRect()
            if (e.clientX < r.left + r.width / 2) {
              dropIndex = i
              break
            }
          }
        }
        // Clamp anchors to fixed positions
        if (prev.letter === '^') dropIndex = 0
        if (prev.letter === '$') dropIndex = patternTilesRef.current.length
      }

      setDrag(d => d ? { ...d, pointerX: e.clientX, pointerY: e.clientY, dropRow, dropIndex } : null)
    }

    function onUp(e) {
      const prev = dragRef.current
      if (!prev) return
      setDrag(null)
      const dx = Math.abs(e.clientX - prev.originX)
      const dy = Math.abs(e.clientY - prev.originY)
      if (dx < 6 && dy < 6) {
        dragHandlersRef.current.removeTile(prev.srcRow, prev.srcIndex)
      } else if (prev.dropRow !== null && prev.dropIndex !== null) {
        dragHandlersRef.current.commitDrop(prev)
      }
    }

    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
    return () => {
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
    }
  }, [!!drag]) // eslint-disable-line react-hooks/exhaustive-deps

  // Physical keyboard input — append to active row
  useEffect(() => {
    function onKey(e) {
      // Ignore when typing into a session name input
      const tag = document.activeElement?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (e.metaKey || e.ctrlKey || e.altKey) return

      if (e.key === 'Backspace') {
        e.preventDefault()
        handleVirtualKey('DEL')
      } else if (e.key === '^' || e.key === '$' || e.key === '.') {
        e.preventDefault()
        handleVirtualKey(e.key)
      } else if (/^[a-zA-Z]$/.test(e.key)) {
        e.preventDefault()
        handleVirtualKey(e.key.toUpperCase())
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [activeRow])

  // Auto-search whenever letters or pattern change
  useEffect(() => {
    if (!letters) {
      setResults([])
      setSearched(false)
      return
    }
    const available = letters.split('')
    const anchorStart = /^[\^#@]/.test(posLetters)
    const anchorEnd   = /[$!]$/.test(posLetters)
    const patternCore = posLetters.replace(/^[\^#@]/, '').replace(/[$!]$/, '')
    const fixedCount = patternCore.replace(/\./g, '').length // board letters, not from rack
    // A word can use at most (rack size + fixed board letters) tiles, and must be at
    // least as long as the pattern. Only scan the length buckets that can possibly match.
    const maxLen = available.length + fixedCount
    const minLen = patternCore.length || 1
    const candidates = []
    for (let len = minLen; len <= maxLen; len++) {
      if (byLength[len]) candidates.push(...byLength[len])
    }
    const matched = candidates
      .flatMap(w => {
        const blanksCover = patternCore
          ? matchPattern(w, patternCore, anchorStart, anchorEnd, available)
          : canForm(w, available)
        if (blanksCover === null) return []
        const blankDeduction = blanksCover.reduce((sum, l) => sum + (SCORES[l] || 0), 0)
        // "Bingo": the word consumes every tile in the rack
        const usesAll = w.length - fixedCount === available.length
        return [{ word: w, score: scrabbleScore(w) - blankDeduction, blanksCover, usesAll }]
      })
      .sort((a, b) => b.score - a.score || a.word.localeCompare(b.word))
    setResults(matched)
    setSearched(true)
  }, [letters, posLetters])

  useEffect(() => {
    if (creatingSession) newNameRef.current?.focus()
  }, [creatingSession])

  useEffect(() => {
    if (renamingSession) renameRef.current?.focus()
  }, [renamingSession])

  const handleReset = () => {
    updateActiveSession({ letters: '', posLetters: '', savedWords: [] })
    clearSearch()
    setActiveRow('rack')
  }

  function handleVirtualKey(key) {
    if (key === 'DEL') {
      if (activeRow === 'rack') {
        if (rackTilesRef.current.length === 0) return
        const next = [...rackTilesRef.current]
        next.pop()
        updateActiveSession({ letters: rackToString(next) })
      } else {
        if (patternTilesRef.current.length === 0) return
        const next = [...patternTilesRef.current]
        next.pop()
        updateActiveSession({ posLetters: patternToString(next) })
      }
    } else if (key === '^') {
      if (patternTilesRef.current[0] === '^') return
      updateActiveSession({ posLetters: patternToString(['^', ...patternTilesRef.current]) })
    } else if (key === '$') {
      const pat = patternTilesRef.current
      if (pat[pat.length - 1] === '$') return
      updateActiveSession({ posLetters: patternToString([...pat, '$']) })
    } else if (/^[A-Z.]$/.test(key)) {
      if (activeRow === 'rack') {
        updateActiveSession({ letters: rackToString([...rackTilesRef.current, key]) })
      } else {
        const next = [...patternTilesRef.current]
        // Insert before trailing $ if present
        if (next[next.length - 1] === '$') next.splice(next.length - 1, 0, key)
        else next.push(key)
        updateActiveSession({ posLetters: patternToString(next) })
      }
    }
  }

  return (
    <div>
      {/* Ghost tile — follows pointer during drag */}
      {drag && (
        <div
          style={{
            position: 'fixed',
            left: drag.pointerX - drag.offsetX,
            top:  drag.pointerY - drag.offsetY,
            width: drag.tileW, height: drag.tileH,
            pointerEvents: 'none',
            zIndex: 9999,
            opacity: 0.85,
          }}
        >
          <ScrabbleTile letter={drag.letter} score={SCORES[drag.letter] || 0} />
        </div>
      )}

      {/* Single fixed column below the top nav */}
      <div className="fixed top-10 bottom-0 left-0 right-0 flex flex-col bg-white">

      {/* Top bar */}
      <div className="flex-shrink-0 border-b border-gray-200">
        <div className="max-w-lg mx-auto px-4 py-1 flex justify-between items-center">
          <button
            onClick={() => setShowHelp(h => !h)}
            className={`w-6 h-6 rounded-full text-xs font-bold transition-colors ${showHelp ? 'bg-gray-400 text-white' : 'bg-gray-200 text-gray-500 hover:bg-gray-300'}`}
            aria-label="Toggle help"
          >?</button>
          <button
            onClick={handleReset}
            className="px-6 h-9 bg-gray-200 text-gray-600 text-sm font-bold rounded-full hover:bg-gray-300 active:bg-gray-400 transition-colors"
          >Reset</button>
        </div>
      </div>

      {/* Session strip — wraps to multiple rows */}
      <div className="flex-shrink-0 border-b border-gray-200">
        <div className="flex flex-wrap items-center gap-1.5 px-3 py-1.5 max-w-lg mx-auto">
          {sessions.map(s => (
            renamingSession === s.id ? (
              <input key={s.id} ref={renameRef} value={renameName}
                onChange={e => setRenameName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && renameName.trim()) renameSession(s.id, renameName.trim())
                  if (e.key === 'Escape') setRenamingSession(null)
                }}
                onBlur={() => { if (renameName.trim()) renameSession(s.id, renameName.trim()); else setRenamingSession(null) }}
                className="w-20 h-6 px-2 text-xs border border-wordle-green rounded-full focus:outline-none"
                autoComplete="off"
              />
            ) : (
              <SessionPill key={s.id} session={s}
                isActive={s.id === activeSessionId}
                isPendingDelete={pendingDelete === s.id}
                onTap={() => {
                  if (pendingDelete) { setPendingDelete(null); return }
                  if (s.id === activeSessionId) { setRenameName(s.name); setRenamingSession(s.id) }
                  else switchSession(s.id)
                }}
                onLongPress={() => setPendingDelete(s.id)}
                onConfirmDelete={() => deleteSession(s.id)}
                onCancelDelete={() => setPendingDelete(null)}
              />
            )
          ))}
          {creatingSession ? (
            <input ref={newNameRef} value={newName} onChange={e => setNewName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && newName.trim()) { createSession(newName.trim()); setCreatingSession(false); setNewName('') }
                if (e.key === 'Escape') { setCreatingSession(false); setNewName('') }
              }}
              onBlur={() => { if (newName.trim()) createSession(newName.trim()); setCreatingSession(false); setNewName('') }}
              placeholder="Name…"
              className="w-20 h-6 px-2 text-xs border border-wordle-green rounded-full focus:outline-none"
              autoComplete="off"
            />
          ) : (
            <button onClick={() => setCreatingSession(true)}
              className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-200 text-gray-500 text-sm font-bold flex items-center justify-center active:bg-gray-300">
              +
            </button>
          )}
        </div>
      </div>

        {/* Tile input panel */}
        <div className="flex-shrink-0 bg-white border-b border-gray-200 px-4 py-2">
          <div className="max-w-lg mx-auto space-y-2">
            {showHelp && (
              <div className="text-sm text-gray-500 space-y-1">
                <p>Enter available letters to find all makeable words, sorted by Scrabble score. Use <code className="bg-gray-100 px-1 rounded font-mono">.</code> in Your letters for a blank tile.</p>
                <p className="mt-1 font-semibold text-gray-600">Fixed pattern syntax:</p>
                <ul className="text-xs space-y-0.5 list-disc list-inside">
                  <li><code className="bg-gray-100 px-1 rounded font-mono">A</code> — word contains A; rest from your letters</li>
                  <li><code className="bg-gray-100 px-1 rounded font-mono">^A</code> — word starts with A</li>
                  <li><code className="bg-gray-100 px-1 rounded font-mono">A$</code> — word ends with A</li>
                  <li><code className="bg-gray-100 px-1 rounded font-mono">.</code> in pattern — uses one letter from your pool</li>
                  <li><code className="bg-gray-100 px-1 rounded font-mono">A.B</code> — A, one pool letter, B (anywhere unless anchored)</li>
                </ul>
              </div>
            )}

            {/* Rack row */}
            <div>
              <div className="flex items-center justify-between mb-0.5">
                <label className="text-xs font-semibold text-gray-700">Your letters</label>
                {letters.length > 0 && <ClearButton onClick={() => updateActiveSession({ letters: '' })} />}
              </div>
              <div
                ref={rackRowRef}
                onPointerDown={() => setActiveRow('rack')}
                className={`flex flex-wrap gap-1 min-h-[2.75rem] px-1 py-1 rounded-lg border-2 transition-colors ${
                  activeRow === 'rack' ? 'border-wordle-green' : 'border-gray-200'
                }`}
              >
                {rackTiles.map((letter, i) => (
                  <Fragment key={i}>
                    {drag?.dropRow === 'rack' && drag?.dropIndex === i && <DropIndicator />}
                    <div
                      data-tile=""
                      className="cursor-grab active:cursor-grabbing touch-none select-none"
                      onPointerDown={e => handleTilePointerDown(e, 'rack', i, letter)}
                    >
                      <ScrabbleTile
                        letter={letter}
                        score={SCORES[letter] || 0}
                        isDragging={drag?.srcRow === 'rack' && drag?.srcIndex === i}
                      />
                    </div>
                  </Fragment>
                ))}
                {drag?.dropRow === 'rack' && drag?.dropIndex === rackTiles.length && <DropIndicator />}
              </div>
              {letters.length > 0 && (() => {
                const letterCount = letters.replace(/\./g, '').length
                const blankCount  = (letters.match(/\./g) || []).length
                const display = letterCount > 0 && blankCount > 0
                  ? `${letterCount} letter${letterCount !== 1 ? 's' : ''} + ${blankCount} blank${blankCount !== 1 ? 's' : ''}`
                  : blankCount > 0
                  ? `${blankCount} blank${blankCount !== 1 ? 's' : ''}`
                  : `${letterCount} letter${letterCount !== 1 ? 's' : ''}`
                return <p className="text-xs text-gray-400 mt-0.5">{display}</p>
              })()}
            </div>

            {/* Pattern row */}
            <div>
              <div className="flex items-center justify-between mb-0.5">
                <label className="text-xs font-semibold text-gray-700">
                  Fixed pattern <span className="font-normal text-gray-400">(optional)</span>
                </label>
                {patternTiles.length > 0 && <ClearButton onClick={() => updateActiveSession({ posLetters: '' })} />}
              </div>
              <div
                ref={patternRowRef}
                onPointerDown={() => setActiveRow('pattern')}
                className={`flex flex-wrap gap-1 min-h-[2.75rem] px-1 py-1 rounded-lg border-2 transition-colors ${
                  activeRow === 'pattern' ? 'border-wordle-green' : 'border-gray-200'
                }`}
              >
                {patternTiles.map((letter, i) => (
                  <Fragment key={i}>
                    {drag?.dropRow === 'pattern' && drag?.dropIndex === i && <DropIndicator />}
                    <div
                      data-tile=""
                      className="cursor-grab active:cursor-grabbing touch-none select-none"
                      onPointerDown={e => handleTilePointerDown(e, 'pattern', i, letter)}
                    >
                      <ScrabbleTile
                        letter={letter}
                        score={SCORES[letter] || 0}
                        isDragging={drag?.srcRow === 'pattern' && drag?.srcIndex === i}
                      />
                    </div>
                  </Fragment>
                ))}
                {drag?.dropRow === 'pattern' && drag?.dropIndex === patternTiles.length && <DropIndicator />}
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable candidates — Saved is pinned at the top via sticky so it
            stays visible without consuming its own fixed band (which crowded out
            the candidate list on short screens). */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {saved.length > 0 && (
            <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-2">
              <div className="max-w-lg mx-auto">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-semibold text-gray-700">Saved</p>
                  <ClearButton onClick={() => updateActiveSession({ savedWords: [] })} />
                </div>
                <div className="flex flex-nowrap gap-2 overflow-x-auto pb-1">
                  {saved.map(({ word, score, blanksCover, gameScore }) => (
                    <WordCard key={word} word={word} score={gameScore ?? score} blanksCover={blanksCover}
                      variant="prominent"
                      onRemove={() => toggleSaved({ word, score, blanksCover, gameScore })}
                      onScoreDown={() => updateGameScore(word, (gameScore ?? score) - 1)}
                      onScoreUp={() => updateGameScore(word, (gameScore ?? score) + 1)}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div className="max-w-lg mx-auto px-4 py-2">
            {searched && (
              <div>
                <p className="text-sm text-gray-500 mb-2 font-medium">
                  {results.length === 0
                    ? 'No words found'
                    : `Found ${results.length} word${results.length !== 1 ? 's' : ''}`}
                </p>
                {results.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {results.map(({ word, score, blanksCover, usesAll }) => (
                      <WordCard key={word} word={word} score={score} blanksCover={blanksCover}
                        usesAll={usesAll}
                        variant={savedSet.has(word) ? 'saved' : 'normal'}
                        onClick={() => toggleSaved({ word, score, blanksCover })} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Virtual keyboard */}
        <div className="flex-shrink-0 border-t border-gray-100 pt-2 px-2 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          <div className="max-w-lg mx-auto flex flex-col gap-1">
            {/* Special keys: anchors + blank */}
            <div className="flex gap-1 px-[30%]">
              {['^', '.', '$'].map(key => (
                <button key={key}
                  onClick={() => handleVirtualKey(key)}
                  className="flex-1 h-7 sm:h-8 bg-blue-100 text-blue-700 rounded text-sm font-bold hover:bg-blue-200 active:bg-blue-300 select-none">
                  {key}
                </button>
              ))}
            </div>
            <div className="flex gap-1">
              {KB_ROW1.map(l => (
                <button key={l}
                  onClick={() => handleVirtualKey(l)}
                  className="flex-1 min-w-0 h-9 sm:h-10 bg-gray-200 rounded text-xs font-bold hover:bg-gray-300 active:bg-gray-400 select-none">
                  {l}
                </button>
              ))}
            </div>
            <div className="flex gap-1 px-[5%]">
              {KB_ROW2.map(l => (
                <button key={l}
                  onClick={() => handleVirtualKey(l)}
                  className="flex-1 min-w-0 h-9 sm:h-10 bg-gray-200 rounded text-xs font-bold hover:bg-gray-300 active:bg-gray-400 select-none">
                  {l}
                </button>
              ))}
            </div>
            <div className="flex gap-1">
              {KB_ROW3.map(l => (
                <button key={l}
                  onClick={() => handleVirtualKey(l)}
                  className="flex-1 min-w-0 h-9 sm:h-10 bg-gray-200 rounded text-xs font-bold hover:bg-gray-300 active:bg-gray-400 select-none">
                  {l}
                </button>
              ))}
              <button
                onClick={() => handleVirtualKey('DEL')}
                className="flex-[1.5] h-9 sm:h-10 bg-gray-300 rounded text-xs font-bold hover:bg-gray-400 active:bg-gray-500 select-none">
                ⌫
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
