export default function Header({ mode, onModeChange }) {
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
      <div className="max-w-lg mx-auto px-4 py-3">
        <h1 className="text-center text-xl font-bold tracking-widest text-gray-800 mb-3">
          WORDFINDER
        </h1>
        <div className="flex rounded-lg overflow-hidden border border-gray-300">
          <button
            onClick={() => onModeChange('wordle')}
            className={`flex-1 py-2 text-sm font-semibold transition-colors ${
              mode === 'wordle'
                ? 'bg-wordle-green text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            Wordle Helper
          </button>
          <button
            onClick={() => onModeChange('crossword')}
            className={`flex-1 py-2 text-sm font-semibold transition-colors border-l border-gray-300 ${
              mode === 'crossword'
                ? 'bg-wordle-green text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            Crossword Helper
          </button>
        </div>
      </div>
    </header>
  )
}
