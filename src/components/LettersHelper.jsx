import { useState } from 'react'
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
  const counts = {}
  for (const l of available) counts[l] = (counts[l] || 0) + 1
  for (const l of word) {
    if (!counts[l]) return false
    counts[l]--
  }
  return true
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

  const handleLettersChange = (val) => {
    const clean = val.replace(/[^a-zA-Z]/g, '').toUpperCase()
    setLetters(clean)
    localStorage.setItem('letters', clean)
    setSearched(false)
  }

  const handlePosLettersChange = (val) => {
    const clean = val.replace(/[^a-zA-Z]/g, '').toUpperCase()
    setPosLetters(clean)
    localStorage.setItem('posLetters', clean)
    setSearched(false)
  }

  const handlePositionChange = (pos) => {
    setPosition(pos)
    localStorage.setItem('position', pos)
    setSearched(false)
  }

  const handleSearch = () => {
    const available = letters.split('')
    const sub = posLetters
    const matched = WORDS
      .filter(w => {
        const remainder = getRemainder(w, sub, position)
        return remainder !== null && canForm(remainder, available)
      })
      .map(w => ({ word: w, score: scrabbleScore(w) }))
      .sort((a, b) => b.score - a.score || a.word.localeCompare(b.word))
    setResults(matched)
    setSearched(true)
  }

  const handleReset = () => {
    setLetters('')
    setPosLetters('')
    setPosition('beginning')
    localStorage.setItem('letters', '')
    localStorage.setItem('posLetters', '')
    localStorage.setItem('position', 'beginning')
    setResults([])
    setSearched(false)
  }

  return (
    <div>
      <p className="text-sm text-gray-500 mb-4 text-center">
        Enter your available letters to find all words you can make,<br />
        sorted by Scrabble score.
      </p>

      <div className="space-y-3 mb-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Your letters
          </label>
          <input
            type="text"
            value={letters}
            onChange={e => handleLettersChange(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="e.g. DEROIBU"
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-lg font-mono uppercase tracking-widest focus:outline-none focus:border-wordle-green"
            autoCapitalize="characters"
            autoCorrect="off"
            autoComplete="off"
            spellCheck="false"
          />
          {letters.length > 0 && (
            <p className="text-xs text-gray-400 mt-1">{letters.length} letter{letters.length !== 1 ? 's' : ''}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Fixed letters at <span className="font-normal text-gray-400">(optional)</span>
          </label>
          <input
            type="text"
            value={posLetters}
            onChange={e => handlePosLettersChange(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
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

      <div className="flex gap-3 justify-center mb-4">
        <button
          onClick={handleSearch}
          className="px-6 py-2.5 bg-wordle-green text-white font-bold rounded-lg shadow hover:opacity-90 active:opacity-80 transition-opacity"
        >
          Find Words
        </button>
        <button
          onClick={handleReset}
          className="px-6 py-2.5 bg-gray-200 text-gray-700 font-bold rounded-lg hover:bg-gray-300 active:bg-gray-400 transition-colors"
        >
          Reset
        </button>
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
              {results.map(({ word, score }) => (
                <div
                  key={word}
                  className="flex items-center gap-1 px-3 py-1 bg-white border border-gray-300 rounded-md shadow-sm"
                >
                  <span className="text-sm font-mono font-semibold text-gray-800 tracking-wider uppercase">
                    {word}
                  </span>
                  <span className="text-xs font-bold text-wordle-green">
                    {score}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
