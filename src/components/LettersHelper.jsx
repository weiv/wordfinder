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
function WordCard({ word, score, blanksCover, variant, onClick }) {
  const blanksLeft = {}
  for (const l of blanksCover) blanksLeft[l] = (blanksLeft[l] || 0) + 1
  const prominent = variant === 'prominent'
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1 px-3 py-1 rounded-md shadow-sm border transition-colors ${
        prominent ? 'bg-wordle-green border-wordle-green' :
        variant === 'saved' ? 'bg-green-50 border-wordle-green' :
        'bg-white border-gray-300 hover:border-wordle-green'
      }`}
    >
      <span className={`text-sm font-mono font-semibold tracking-wider uppercase${prominent ? ' text-white' : ''}`}>
        {word.split('').map((c, i) => {
          if (blanksLeft[c] > 0) {
            blanksLeft[c]--
            return <span key={i} className={prominent ? 'text-green-200' : 'text-gray-400'}>{c}</span>
          }
          return <span key={i} className={prominent ? '' : 'text-gray-800'}>{c}</span>
        })}
      </span>
      <span className={`text-xs font-bold ${prominent ? 'text-green-200' : 'text-wordle-green'}`}>{score}</span>
    </button>
  )
}

export default function LettersHelper() {
  const [letters, setLetters] = useState(() => localStorage.getItem('letters') || '')
  const [posLetters, setPosLetters] = useState(() => localStorage.getItem('posLetters') || '')
  const [results, setResults] = useState([])
  const [searched, setSearched] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [saved, setSaved] = useState(() => JSON.parse(localStorage.getItem('savedWords') || '[]'))
  const [activeField, setActiveField] = useState('letters')
  const savedSet = useMemo(() => new Set(saved.map(s => s.word)), [saved])
  const lettersRef = useRef(null)
  const posLettersRef = useRef(null)
  const pendingLettersCursor = useRef(null)
  const pendingPosLettersCursor = useRef(null)

  const handleLettersChange = (val) => {
    const clean = val.replace(/[^a-zA-Z.]/g, '').toUpperCase()
    setLetters(clean)
    localStorage.setItem('letters', clean)
  }

  const handlePosLettersChange = (val) => {
    const clean = val.replace(/[^a-zA-Z.^$#@!]/g, '').toUpperCase()
    setPosLetters(clean)
    localStorage.setItem('posLetters', clean)
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

  const toggleSaved = (wordObj) => {
    setSaved(prev => {
      const next = prev.some(s => s.word === wordObj.word)
        ? prev.filter(s => s.word !== wordObj.word)
        : [...prev, wordObj]
      localStorage.setItem('savedWords', JSON.stringify(next))
      return next
    })
  }

  const handleReset = () => {
    setLetters('')
    setPosLetters('')
    localStorage.setItem('letters', '')
    localStorage.setItem('posLetters', '')
    setSaved([])
    localStorage.setItem('savedWords', '[]')
    setResults([])
    setSearched(false)
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
      <div className="fixed top-0 left-0 right-0 z-20 bg-white border-b border-gray-200">
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
      <div className="h-8" />
      {showHelp && (
        <div className="text-sm text-gray-500 mb-4 space-y-1">
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

      <div className="space-y-3 mb-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
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
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-lg font-mono uppercase tracking-widest focus:outline-none focus:border-wordle-green"
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
            return <p className="text-xs text-gray-400 mt-1">{display}</p>
          })()}
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
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
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-lg font-mono uppercase tracking-widest focus:outline-none focus:border-wordle-green"
            autoCapitalize="characters"
            autoCorrect="off"
            autoComplete="off"
            spellCheck="false"
          />
        </div>
      </div>

      {saved.length > 0 && (
        <div className="mb-4">
          <p className="text-sm font-semibold text-gray-700 mb-2">Saved</p>
          <div className="flex flex-wrap gap-2">
            {saved.map(({ word, score, blanksCover }) => (
              <WordCard key={word} word={word} score={score} blanksCover={blanksCover}
                variant="prominent" onClick={() => toggleSaved({ word, score, blanksCover })} />
            ))}
          </div>
        </div>
      )}

      {searched && (
        <div className="mt-2">
          <p className="text-sm text-gray-500 mb-2 font-medium">
            {results.length === 0
              ? 'No words found'
              : `Found ${results.length} word${results.length !== 1 ? 's' : ''}`}
          </p>
          {results.length > 0 && (
            <div className="flex flex-wrap gap-2 max-h-96 overflow-y-auto pr-1">
              {results.map(({ word, score, blanksCover }) => (
                <WordCard key={word} word={word} score={score} blanksCover={blanksCover}
                  variant={savedSet.has(word) ? 'saved' : 'normal'}
                  onClick={() => toggleSaved({ word, score, blanksCover })} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Virtual keyboard */}
      <div className="fixed bottom-14 left-0 right-0 z-10 bg-gray-100 border-t border-gray-200 py-1.5 px-2">
        <div className="max-w-lg mx-auto space-y-1">
          <div className="flex gap-1 px-[10%]">
            <button onPointerDown={e => e.preventDefault()} onClick={() => handleVirtualKey('LEFT')}
              className="flex-[2] h-9 bg-gray-200 rounded text-xs font-bold hover:bg-gray-300 active:bg-gray-400">
              ←
            </button>
            {['^', '.', '$'].map(key => (
              <button key={key} onPointerDown={e => e.preventDefault()} onClick={() => handleVirtualKey(key)}
                className="flex-1 h-9 bg-gray-200 rounded text-xs font-bold hover:bg-gray-300 active:bg-gray-400">
                {key}
              </button>
            ))}
            <button onPointerDown={e => e.preventDefault()} onClick={() => handleVirtualKey('RIGHT')}
              className="flex-[2] h-9 bg-gray-200 rounded text-xs font-bold hover:bg-gray-300 active:bg-gray-400">
              →
            </button>
          </div>
          <div className="flex gap-1">
            {'QWERTYUIOP'.split('').map(l => (
              <button key={l} onPointerDown={e => e.preventDefault()} onClick={() => handleVirtualKey(l)}
                className="flex-1 min-w-0 h-9 bg-white rounded text-xs font-bold shadow-sm border border-gray-300 hover:bg-gray-50 active:bg-gray-200">
                {l}
              </button>
            ))}
          </div>
          <div className="flex gap-1 px-[5%]">
            {'ASDFGHJKL'.split('').map(l => (
              <button key={l} onPointerDown={e => e.preventDefault()} onClick={() => handleVirtualKey(l)}
                className="flex-1 min-w-0 h-9 bg-white rounded text-xs font-bold shadow-sm border border-gray-300 hover:bg-gray-50 active:bg-gray-200">
                {l}
              </button>
            ))}
          </div>
          <div className="flex gap-1">
            {'ZXCVBNM'.split('').map(l => (
              <button key={l} onPointerDown={e => e.preventDefault()} onClick={() => handleVirtualKey(l)}
                className="flex-1 min-w-0 h-9 bg-white rounded text-xs font-bold shadow-sm border border-gray-300 hover:bg-gray-50 active:bg-gray-200">
                {l}
              </button>
            ))}
            <button onPointerDown={e => e.preventDefault()} onClick={() => handleVirtualKey('DEL')}
              className="flex-[1.5] h-9 bg-gray-200 rounded text-xs font-bold hover:bg-gray-300 active:bg-gray-400">
              ⌫
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
