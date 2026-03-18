import { useState, useEffect, useRef, useMemo } from 'react'
import { WORDS } from '../data/words'

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
function WordCard({ word, score, blanksCover, variant, onClick,
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
      <div className="flex items-center gap-1 px-1.5 py-1 rounded-md shadow-sm border bg-wordle-green border-wordle-green">
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
  return (
    <button onClick={onClick} className={`flex items-center gap-1 px-3 py-1 rounded-md shadow-sm border transition-colors ${
      variant === 'saved' ? 'bg-green-50 border-wordle-green' : 'bg-white border-gray-300 hover:border-wordle-green'
    }`}>
      <span className="text-sm font-mono font-semibold tracking-wider uppercase">
        {word.split('').map((c, i) => {
          if (blanksLeft2[c] > 0) { blanksLeft2[c]--; return <span key={i} className="text-gray-400">{c}</span> }
          return <span key={i} className="text-gray-800">{c}</span>
        })}
      </span>
      <span className="text-xs font-bold text-wordle-green">{score}</span>
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

export default function LettersHelper() {
  const [sessions, setSessions] = useState(_initialState.sessions)
  const [activeSessionId, setActiveSessionId] = useState(_initialState.activeSessionId)
  const [results, setResults] = useState([])
  const [searched, setSearched] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [activeField, setActiveField] = useState('letters')
  const [pendingDelete, setPendingDelete] = useState(null)
  const [creatingSession, setCreatingSession] = useState(false)
  const [newName, setNewName] = useState('')
  const newNameRef = useRef(null)
  const lettersRef = useRef(null)
  const posLettersRef = useRef(null)
  const pendingLettersCursor = useRef(null)
  const pendingPosLettersCursor = useRef(null)

  const activeSession = sessions.find(s => s.id === activeSessionId) ?? sessions[0]
  const letters    = activeSession.letters
  const posLetters = activeSession.posLetters
  const saved      = activeSession.savedWords
  const savedSet = useMemo(() => new Set(saved.map(s => s.word)), [saved])

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

  const handleLettersChange = (val) => {
    const clean = val.replace(/[^a-zA-Z.]/g, '').toUpperCase()
    updateActiveSession({ letters: clean })
  }

  const handlePosLettersChange = (val) => {
    const clean = val.replace(/[^a-zA-Z.^$#@!]/g, '').toUpperCase()
    updateActiveSession({ posLetters: clean })
  }

  useEffect(() => {
    if (pendingLettersCursor.current !== null) {
      lettersRef.current?.setSelectionRange(pendingLettersCursor.current, pendingLettersCursor.current)
      pendingLettersCursor.current = null
    }
  }, [letters])

  useEffect(() => {
    if (pendingPosLettersCursor.current !== null) {
      posLettersRef.current?.setSelectionRange(pendingPosLettersCursor.current, pendingPosLettersCursor.current)
      pendingPosLettersCursor.current = null
    }
  }, [posLetters])

  useEffect(() => {
    if (!letters) {
      setResults([])
      setSearched(false)
      return
    }
    const available = letters.split('')
    const anchorStart = /^[\^#@]/.test(posLetters)
    const anchorEnd = /[$!]$/.test(posLetters)
    const patternCore = posLetters.replace(/^[\^#@]/, '').replace(/[$!]$/, '')
    const matched = WORDS
      .flatMap(w => {
        const blanksCover = patternCore
          ? matchPattern(w, patternCore, anchorStart, anchorEnd, available)
          : canForm(w, available)
        if (blanksCover === null) return []
        const blankDeduction = blanksCover.reduce((sum, l) => sum + (SCORES[l] || 0), 0)
        return [{ word: w, score: scrabbleScore(w) - blankDeduction, blanksCover }]
      })
      .sort((a, b) => b.score - a.score || a.word.localeCompare(b.word))
    setResults(matched)
    setSearched(true)
  }, [letters, posLetters])

  useEffect(() => {
    if (creatingSession) newNameRef.current?.focus()
  }, [creatingSession])

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

  const handleReset = () => {
    updateActiveSession({ letters: '', posLetters: '', savedWords: [] })
    clearSearch()
    lettersRef.current?.focus()
  }

  const handleVirtualKey = (key) => {
    const isLetters = activeField === 'letters'
    const value = isLetters ? letters : posLetters
    const ref = isLetters ? lettersRef : posLettersRef
    const setter = isLetters ? handleLettersChange : handlePosLettersChange
    const pendingCursor = isLetters ? pendingLettersCursor : pendingPosLettersCursor

    // ^ and $ are not valid in the letters field
    if (key !== 'DEL' && key !== 'LEFT' && key !== 'RIGHT') {
      if (isLetters && !/^[A-Z.]$/.test(key)) return
    }

    const el = ref.current
    if (!el) return

    el.focus()
    const start = el.selectionStart ?? value.length
    const end = el.selectionEnd ?? value.length

    if (key === 'DEL') {
      if (start !== end) {
        const newVal = value.slice(0, start) + value.slice(end)
        pendingCursor.current = start
        setter(newVal)
      } else if (start > 0) {
        const newVal = value.slice(0, start - 1) + value.slice(start)
        pendingCursor.current = start - 1
        setter(newVal)
      }
    } else if (key === 'LEFT') {
      const newPos = Math.max(0, start - 1)
      el.setSelectionRange(newPos, newPos)
    } else if (key === 'RIGHT') {
      const newPos = Math.min(value.length, end + 1)
      el.setSelectionRange(newPos, newPos)
    } else {
      const newVal = value.slice(0, start) + key + value.slice(end)
      pendingCursor.current = start + 1
      setter(newVal)
    }
  }

  return (
    <div>
      {/* Fixed top bar */}
      <div className="fixed top-10 left-0 right-0 z-20 bg-white border-b border-gray-200">
        <div className="max-w-lg mx-auto px-4 py-1 flex justify-between items-center">
          <button
            onClick={() => setShowHelp(h => !h)}
            className={`w-6 h-6 rounded-full text-xs font-bold transition-colors ${showHelp ? 'bg-gray-400 text-white' : 'bg-gray-200 text-gray-500 hover:bg-gray-300'}`}
            aria-label="Toggle help"
          >?</button>
          <button
            onClick={handleReset}
            className="px-3 h-6 bg-gray-200 text-gray-500 text-xs font-bold rounded-full hover:bg-gray-300 active:bg-gray-400 transition-colors"
          >Reset</button>
        </div>
      </div>

      {/* Session strip */}
      <div className="fixed top-[4.5rem] left-0 right-0 z-20 bg-white border-b border-gray-200">
        <div className="flex items-center gap-1.5 overflow-x-auto px-3 py-1.5 max-w-lg mx-auto">
          {sessions.map(s => (
            <SessionPill key={s.id} session={s}
              isActive={s.id === activeSessionId}
              isPendingDelete={pendingDelete === s.id}
              onTap={() => { if (pendingDelete) { setPendingDelete(null); return } switchSession(s.id) }}
              onLongPress={() => setPendingDelete(s.id)}
              onConfirmDelete={() => deleteSession(s.id)}
              onCancelDelete={() => setPendingDelete(null)}
            />
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

      {/* Main layout column: from below session strip to bottom of screen */}
      <div className="fixed top-[6.75rem] bottom-0 left-0 right-0 flex flex-col">

        {/* Input panel */}
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
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-0.5">
                Your letters
              </label>
              <input
                ref={lettersRef}
                autoFocus
                type="text"
                inputMode="none"
                value={letters}
                onChange={e => handleLettersChange(e.target.value)}
                onFocus={() => setActiveField('letters')}
                placeholder="e.g. DEROIBU"
                className="w-full px-3 py-1.5 border-2 border-gray-300 rounded-lg text-base font-mono uppercase tracking-widest focus:outline-none focus:border-wordle-green"
                autoCapitalize="characters"
                autoCorrect="off"
                autoComplete="off"
                spellCheck="false"
              />
              {letters.length > 0 && (() => {
                const letterCount = letters.replace(/\./g, '').length
                const blankCount = (letters.match(/\./g) || []).length
                const display = letterCount > 0 && blankCount > 0
                  ? `${letterCount} letter${letterCount !== 1 ? 's' : ''} + ${blankCount} blank${blankCount !== 1 ? 's' : ''}`
                  : blankCount > 0
                  ? `${blankCount} blank${blankCount !== 1 ? 's' : ''}`
                  : `${letterCount} letter${letterCount !== 1 ? 's' : ''}`
                return <p className="text-xs text-gray-400 mt-0.5">{display}</p>
              })()}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-0.5">
                Fixed pattern <span className="font-normal text-gray-400">(optional)</span>
              </label>
              <input
                ref={posLettersRef}
                type="text"
                inputMode="none"
                value={posLetters}
                onChange={e => handlePosLettersChange(e.target.value)}
                onFocus={() => setActiveField('posLetters')}
                placeholder="e.g. ^A or A.B or ER$"
                className="w-full px-3 py-1.5 border-2 border-gray-300 rounded-lg text-base font-mono uppercase tracking-widest focus:outline-none focus:border-wordle-green"
                autoCapitalize="characters"
                autoCorrect="off"
                autoComplete="off"
                spellCheck="false"
              />
            </div>
          </div>
        </div>

        {/* Scrollable candidates */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-lg mx-auto px-4 py-2">
            {saved.length > 0 && (
              <div className="mb-4">
                <p className="text-sm font-semibold text-gray-700 mb-2">Saved</p>
                <div className="flex flex-wrap gap-2">
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
            )}
            {searched && (
              <div>
                <p className="text-sm text-gray-500 mb-2 font-medium">
                  {results.length === 0
                    ? 'No words found'
                    : `Found ${results.length} word${results.length !== 1 ? 's' : ''}`}
                </p>
                {results.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {results.map(({ word, score, blanksCover }) => (
                      <WordCard key={word} word={word} score={score} blanksCover={blanksCover}
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
        <div className="flex-shrink-0 border-t border-gray-100 py-2 px-2">
          <div className="max-w-lg mx-auto flex flex-col gap-1">
            <div className="flex gap-1 px-[10%]">
              <button onPointerDown={e => e.preventDefault()} onClick={() => handleVirtualKey('LEFT')}
                className="flex-[2] h-10 bg-gray-300 rounded text-xs font-bold hover:bg-gray-400 active:bg-gray-500">
                ←
              </button>
              {['^', '.', '$'].map(key => (
                <button key={key} onPointerDown={e => e.preventDefault()} onClick={() => handleVirtualKey(key)}
                  className="flex-1 h-10 bg-gray-300 rounded text-xs font-bold hover:bg-gray-400 active:bg-gray-500">
                  {key}
                </button>
              ))}
              <button onPointerDown={e => e.preventDefault()} onClick={() => handleVirtualKey('RIGHT')}
                className="flex-[2] h-10 bg-gray-300 rounded text-xs font-bold hover:bg-gray-400 active:bg-gray-500">
                →
              </button>
            </div>
            <div className="flex gap-1">
              {KB_ROW1.map(l => (
                <button key={l} onPointerDown={e => e.preventDefault()} onClick={() => handleVirtualKey(l)}
                  className="flex-1 min-w-0 h-10 bg-gray-200 rounded text-xs font-bold hover:bg-gray-300 active:bg-gray-400">
                  {l}
                </button>
              ))}
            </div>
            <div className="flex gap-1 px-[5%]">
              {KB_ROW2.map(l => (
                <button key={l} onPointerDown={e => e.preventDefault()} onClick={() => handleVirtualKey(l)}
                  className="flex-1 min-w-0 h-10 bg-gray-200 rounded text-xs font-bold hover:bg-gray-300 active:bg-gray-400">
                  {l}
                </button>
              ))}
            </div>
            <div className="flex gap-1">
              {KB_ROW3.map(l => (
                <button key={l} onPointerDown={e => e.preventDefault()} onClick={() => handleVirtualKey(l)}
                  className="flex-1 min-w-0 h-10 bg-gray-200 rounded text-xs font-bold hover:bg-gray-300 active:bg-gray-400">
                  {l}
                </button>
              ))}
              <button onPointerDown={e => e.preventDefault()} onClick={() => handleVirtualKey('DEL')}
                className="flex-[1.5] h-10 bg-gray-300 rounded text-xs font-bold hover:bg-gray-400 active:bg-gray-500">
                ⌫
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
