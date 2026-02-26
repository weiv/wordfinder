import { useState } from 'react'
import Header from './components/Header'
import WordleHelper from './components/WordleHelper'
import CrosswordHelper from './components/CrosswordHelper'
import LettersHelper from './components/LettersHelper'

export default function App() {
  const [mode, setMode] = useState(() => localStorage.getItem('mode') || 'wordle')

  const handleModeChange = (m) => {
    localStorage.setItem('mode', m)
    setMode(m)
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Header mode={mode} onModeChange={handleModeChange} />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-lg mx-auto px-4 py-4">
          {mode === 'wordle' && <WordleHelper />}
          {mode === 'crossword' && <CrosswordHelper />}
          {mode === 'letters' && <LettersHelper />}
        </div>
      </main>
      <footer className="text-center text-xs text-gray-400 py-2 border-t border-gray-200 bg-white">
        WordFinder — Wordle &amp; Crossword Helper
      </footer>
    </div>
  )
}
