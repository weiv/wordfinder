import { useState, useEffect } from 'react'
import { WORDS } from '../data/words'
import WordResults from './WordResults'

export default function CrosswordHelper() {
  const [pattern, setPattern] = useState('')
  const [mustInclude, setMustInclude] = useState('')
  const [results, setResults] = useState([])
  const [searched, setSearched] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setError('')
    const raw = pattern.trim().toUpperCase()
    if (!raw) {
      setResults([])
      setSearched(false)
      return
    }

    const regexStr = '^' + raw.replace(/[_?]/g, '.') + '$'
    let regex
    try {
      regex = new RegExp(regexStr, 'i')
    } catch {
      setError('Invalid pattern')
      return
    }

    const required = mustInclude.toUpperCase().replace(/[^A-Z]/g, '').split('')

    const matched = WORDS.filter(w => {
      if (w.length !== raw.length) return false
      if (!regex.test(w)) return false
      for (const l of required) {
        if (!w.includes(l)) return false
      }
      return true
    }).sort()

    setResults(matched)
    setSearched(true)
  }, [pattern, mustInclude])

  const handleReset = () => {
    setPattern('')
    setMustInclude('')
    setResults([])
    setSearched(false)
    setError('')
  }

  const wordLen = pattern.trim().length

  return (
    <div>
      <p className="text-sm text-gray-500 mb-4 text-center">
        Use <code className="bg-gray-100 px-1 rounded font-mono">_</code> or{' '}
        <code className="bg-gray-100 px-1 rounded font-mono">?</code> for unknown letters.
        <br />
        <span className="text-xs">Example: <strong>C_T</strong> → CAT, CUT, COT…</span>
      </p>

      <div className="space-y-3 mb-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Pattern
          </label>
          <input
            type="text"
            value={pattern}
            onChange={e => setPattern(e.target.value)}
            placeholder="e.g. _IGHT or C_OWN"
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-lg font-mono uppercase tracking-widest focus:outline-none focus:border-wordle-green"
            autoCapitalize="characters"
            autoCorrect="off"
            autoComplete="off"
            spellCheck="false"
          />
          {wordLen > 0 && (
            <p className="text-xs text-gray-400 mt-1">{wordLen}-letter word</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Must include letters <span className="font-normal text-gray-400">(optional)</span>
          </label>
          <input
            type="text"
            value={mustInclude}
            onChange={e => setMustInclude(e.target.value)}
            placeholder="e.g. AE"
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-lg font-mono uppercase tracking-widest focus:outline-none focus:border-wordle-green"
            autoCapitalize="characters"
            autoCorrect="off"
            autoComplete="off"
            spellCheck="false"
          />
        </div>
      </div>

      {error && (
        <p className="text-red-500 text-sm mb-3">{error}</p>
      )}

      <div className="flex justify-center mb-2">
        <button
          onClick={handleReset}
          className="px-6 py-2.5 bg-gray-200 text-gray-700 font-bold rounded-lg hover:bg-gray-300 active:bg-gray-400 transition-colors"
        >
          Reset
        </button>
      </div>

      <WordResults words={results} searched={searched} />
    </div>
  )
}
