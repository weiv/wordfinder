export default function ScrabbleTile({ letter, score, isDragging, width = 32 }) {
  if (isDragging) {
    return (
      <div className="h-10 rounded border-2 border-dashed border-gray-300 bg-gray-100 opacity-30 flex-shrink-0" style={{ width }} />
    )
  }

  const isAnchor = letter === '^' || letter === '$'
  const isBlank  = letter === '.'

  return (
    <div
      className="h-10 rounded flex items-center justify-center relative flex-shrink-0"
      style={{
        width,
        background: isAnchor ? '#dce8f5' : '#f5f0e0',
        border: isAnchor ? '2px solid #3b82f6' : isBlank ? '2px dashed #b5a882' : '2px solid #b5a882',
      }}
    >
      {!isBlank && (
        <span
          className="text-sm font-bold leading-none"
          style={{ color: isAnchor ? '#1d4ed8' : '#374151' }}
        >
          {letter}
        </span>
      )}
      {!isBlank && !isAnchor && score > 0 && (
        <span
          className="absolute bottom-0.5 right-0.5 leading-none font-semibold"
          style={{ fontSize: '8px', color: '#9ca3af' }}
        >
          {score}
        </span>
      )}
    </div>
  )
}
