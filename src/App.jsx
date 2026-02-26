import { useState } from 'react'
import Header from './components/Header'
import WordleHelper from './components/WordleHelper'
import CrosswordHelper from './components/CrosswordHelper'

export default function App() {
  const [mode, setMode] = useState('wordle')

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Header mode={mode} onModeChange={setMode} />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-lg mx-auto px-4 py-4">
          {mode === 'wordle' ? <WordleHelper /> : <CrosswordHelper />}
        </div>
      </main>
      <footer className="text-center text-xs text-gray-400 py-2 border-t border-gray-200 bg-white">
        WordFinder — Wordle &amp; Crossword Helper
      </footer>
    </div>
  )
}
