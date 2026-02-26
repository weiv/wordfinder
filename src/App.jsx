import { useState } from 'react'
import WordleHelper from './components/WordleHelper'
import CrosswordHelper from './components/CrosswordHelper'
import LettersHelper from './components/LettersHelper'

export default function App() {
  const [mode, setMode] = useState(() => localStorage.getItem('mode') || 'wordle')

  const handleModeChange = (m) => {
    localStorage.setItem('mode', m)
    setMode(m)
  }

  const tabs = [
    { key: 'wordle', label: 'Wordle Helper' },
    { key: 'crossword', label: 'Crossword' },
    { key: 'letters', label: 'Letters' },
  ]

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <main className="flex-1 overflow-y-auto pb-14">
        <div className="max-w-lg mx-auto px-4 py-4">
          {mode === 'wordle' && <WordleHelper />}
          {mode === 'crossword' && <CrosswordHelper />}
          {mode === 'letters' && <LettersHelper />}
        </div>
      </main>
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-10">
        <div className="max-w-lg mx-auto flex">
          {tabs.map(({ key, label }, i) => (
            <button
              key={key}
              onClick={() => handleModeChange(key)}
              className={`flex-1 py-3 text-sm font-semibold transition-colors
                ${i > 0 ? 'border-l border-gray-200' : ''}
                ${mode === key ? 'bg-wordle-green text-white' : 'text-gray-600 hover:bg-gray-50'}
              `}
            >
              {label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}
