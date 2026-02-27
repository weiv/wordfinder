import { useState, useEffect, useRef } from 'react'
import { WORDS } from '../data/words'

const SCORES = {
  A:1, E:1, I:1, O:1, U:1, L:1, N:1, S:1, T:1, R:1,
  D:2, G:2,
  B:3, C:3, M:3, P:3,
  F:4, H:4, V:4, W:4, Y:4,
  K:5,
  J:8, X:8,
  Q:10, Z:10,
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

// Returns the part of word that must come from available letters after
// removing the fixed sub at the given position, or null if it doesn't match.
function getRemainder(word, sub, position) {
  if (!sub) return word
  if (position === 'beginning') {
    if (!word.startsWith(sub)) return null
    return word.slice(sub.length)
  }
  if (position === 'end') {
    if (!word.endsWith(sub)) return null
    return word.slice(0, word.length - sub.length)
  }
  // middle: sub appears somewhere not at start or end
  for (let i = 1; i <= word.length - sub.length - 1; i++) {
    if (word.slice(i, i + sub.length) === sub) {
      return word.slice(0, i) + word.slice(i + sub.length)
    }
  }
  return null
}

const POSITIONS = ['beginning', 'middle', 'end']

export default function LettersHelper() {
  const [letters, setLetters] = useState(() => localStorage.getItem('letters') || '')
  const [posLetters, setPosLetters] = useState(() => localStorage.getItem('posLetters') || '')
  const [position, setPosition] = useState(() => localStorage.getItem('position') || 'beginning')
  const [results, setResults] = useState([])
  const [searched, setSearched] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const lettersRef = useRef(null)

  const handleLettersChange = (val) => {
    const clean = val.replace(/[^a-zA-Z.]/g, '').toUpperCase()
    setLetters(clean)
    localStorage.setItem('letters', clean)
  }

  const handlePosLettersChange = (val) => {
    const clean = val.replace(/[^a-zA-Z]/g, '').toUpperCase()
    setPosLetters(clean)
    localStorage.setItem('posLetters', clean)
  }

  const handlePositionChange = (pos) => {
    setPosition(pos)
    localStorage.setItem('position', pos)
  }

  useEffect(() => {
    if (!letters) {
      setResults([])
      setSearched(false)
      return
    }
    const available = letters.split('')
    const sub = posLetters
    const matched = WORDS
      .flatMap(w => {
        const remainder = getRemainder(w, sub, position)
        if (remainder === null) return []
        const blanksCover = canForm(remainder, available)
        if (blanksCover === null) return []
        const blankDeduction = blanksCover.reduce((sum, l) => sum + (SCORES[l] || 0), 0)
        return [{ word: w, score: scrabbleScore(w) - blankDeduction, blanksCover }]
      })
      .sort((a, b) => b.score - a.score || a.word.localeCompare(b.word))
    setResults(matched)
    setSearched(true)
  }, [letters, posLetters, position])

  const handleReset = () => {
    setLetters('')
    setPosLetters('')
    setPosition('beginning')
    localStorage.setItem('letters', '')
    localStorage.setItem('posLetters', '')
    localStorage.setItem('position', 'beginning')
    setResults([])
    setSearched(false)
    lettersRef.current?.focus()
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-1">
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
      {showHelp && (
        <p className="text-sm text-gray-500 mb-4 text-center">
          Enter your available letters to find all words you can make,<br />
          sorted by Scrabble score. Use . for a blank tile (any letter, worth 0).
        </p>
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
            value={letters}
            onChange={e => handleLettersChange(e.target.value)}
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
            Fixed letters at <span className="font-normal text-gray-400">(optional)</span>
          </label>
          <input
            type="text"
            value={posLetters}
            onChange={e => handlePosLettersChange(e.target.value)}
            placeholder="e.g. D"
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-lg font-mono uppercase tracking-widest focus:outline-none focus:border-wordle-green mb-2"
            autoCapitalize="characters"
            autoCorrect="off"
            autoComplete="off"
            spellCheck="false"
          />
          <div className="flex rounded-lg overflow-hidden border border-gray-300 text-sm font-semibold">
            {POSITIONS.map((pos, i) => (
              <button
                key={pos}
                onClick={() => handlePositionChange(pos)}
                className={`flex-1 py-2 capitalize transition-colors ${
                  position === pos
                    ? 'bg-wordle-green text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                } ${i > 0 ? 'border-l border-gray-300' : ''}`}
              >
                {pos}
              </button>
            ))}
          </div>
        </div>
      </div>

      {searched && (
        <div className="mt-2">
          <p className="text-sm text-gray-500 mb-2 font-medium">
            {results.length === 0
              ? 'No words found'
              : `Found ${results.length} word${results.length !== 1 ? 's' : ''}`}
          </p>
          {results.length > 0 && (
            <div className="flex flex-wrap gap-2 max-h-96 overflow-y-auto pr-1">
              {results.map(({ word, score, blanksCover }) => {
                const blanksLeft = {}
                for (const l of blanksCover) blanksLeft[l] = (blanksLeft[l] || 0) + 1
                return (
                  <div
                    key={word}
                    className="flex items-center gap-1 px-3 py-1 bg-white border border-gray-300 rounded-md shadow-sm"
                  >
                    <span className="text-sm font-mono font-semibold tracking-wider uppercase">
                      {word.split('').map((c, i) => {
                        if (blanksLeft[c] > 0) {
                          blanksLeft[c]--
                          return <span key={i} className="text-gray-400">{c}</span>
                        }
                        return <span key={i} className="text-gray-800">{c}</span>
                      })}
                    </span>
                    <span className="text-xs font-bold text-wordle-green">
                      {score}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
