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

export default function LettersHelper() {
  const [letters, setLetters] = useState(() => localStorage.getItem('letters') || '')
  const [results, setResults] = useState([])
  const [searched, setSearched] = useState(false)

  const handleLettersChange = (val) => {
    const clean = val.replace(/[^a-zA-Z]/g, '').toUpperCase()
    setLetters(clean)
    localStorage.setItem('letters', clean)
    setSearched(false)
  }

  const handleSearch = () => {
    const available = letters.split('')
    const matched = WORDS
      .filter(w => canForm(w, available))
      .map(w => ({ word: w, score: scrabbleScore(w) }))
      .sort((a, b) => b.score - a.score || a.word.localeCompare(b.word))
    setResults(matched)
    setSearched(true)
  }

  const handleReset = () => {
    setLetters('')
    localStorage.setItem('letters', '')
    setResults([])
    setSearched(false)
  }

  return (
    <div>
      <p className="text-sm text-gray-500 mb-4 text-center">
        Enter your available letters to find all words you can make,<br />
        sorted by Scrabble score.
      </p>

      <div className="mb-4">
        <label className="block text-sm font-semibold text-gray-700 mb-1">
          Your letters
        </label>
        <input
          type="text"
          value={letters}
          onChange={e => handleLettersChange(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
          placeholder="e.g. AEINRST"
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
