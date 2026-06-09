import { useState, useRef } from 'react'
import WordleHelper from './components/WordleHelper'
import CrosswordHelper from './components/CrosswordHelper'
import LettersHelper from './components/LettersHelper'

export default function App() {
  const [mode, setMode] = useState(() => localStorage.getItem('mode') || 'wordle')
  const [showHelp, setShowHelp] = useState(false)
  const resetRef = useRef(() => {})

  const handleModeChange = (m) => {
    localStorage.setItem('mode', m)
    setMode(m)
    setShowHelp(false)
  }

  const tabs = [
    { key: 'wordle', label: 'Wordle' },
    { key: 'crossword', label: 'Crossword' },
    { key: 'letters', label: 'Letters' },
  ]

  const helperProps = { showHelp, resetRef }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <main className={`flex-1 overflow-y-auto pt-10 ${mode === 'wordle' ? 'pb-[60vh]' : ''}`}>
        <div className="max-w-lg mx-auto px-4 py-4">
          {mode === 'wordle' && <WordleHelper {...helperProps} />}
          {mode === 'crossword' && <CrosswordHelper {...helperProps} />}
          {mode === 'letters' && <LettersHelper {...helperProps} />}
        </div>
      </main>
      <nav className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-30 h-10">
        <div className="max-w-lg mx-auto flex h-full items-stretch">
          <button
            onClick={() => setShowHelp(h => !h)}
            aria-label="Toggle help"
            className={`px-3 text-sm font-bold transition-colors ${
              showHelp ? 'bg-gray-100 text-wordle-green' : 'text-gray-400 hover:bg-gray-50'
            }`}
          >?</button>
          {tabs.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => handleModeChange(key)}
              className={`flex-1 min-w-0 text-sm font-semibold border-l border-gray-200 transition-colors
                ${mode === key ? 'bg-wordle-green text-white' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              {label}
            </button>
          ))}
          <button
            onClick={() => resetRef.current()}
            className="px-3 text-xs font-bold text-gray-500 border-l border-gray-200 hover:bg-gray-50 active:bg-gray-100 transition-colors"
          >Reset</button>
        </div>
      </nav>
    </div>
  )
}
