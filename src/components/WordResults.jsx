export default function WordResults({ words, searched }) {
  if (!searched) return null

  return (
    <div className="mt-4">
      <p className="text-sm text-gray-500 mb-2 font-medium">
        {words.length === 0
          ? 'No matching words found'
          : `Found ${words.length} word${words.length !== 1 ? 's' : ''}`}
      </p>
      {words.length > 0 && (
        <div className="flex flex-wrap gap-2 max-h-64 overflow-y-auto pr-1">
          {words.map(word => (
            <span
              key={word}
              className="px-3 py-1 bg-white border border-gray-300 rounded-md text-sm font-mono font-semibold text-gray-800 shadow-sm tracking-wider uppercase"
            >
              {word}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
