import { useState, useCallback, useEffect, useRef } from 'react'
import { WORDS } from '../data/words'
import WordResults from './WordResults'

const WORD_LEN = 5
const NUM_ROWS = 6

const NEXT_STATE = { empty: 'green', green: 'yellow', yellow: 'gray', gray: 'empty' }

const STATE_CLASSES = {
  empty: 'tile-empty text-gray-800',
  green: 'tile-green text-white border-transparent',
  yellow: 'tile-yellow text-white border-transparent',
  gray: 'tile-gray text-white border-transparent',
}

function emptyGrid() {
  return Array.from({ length: NUM_ROWS }, () =>
    Array.from({ length: WORD_LEN }, () => ({ letter: '', state: 'empty' }))
  )
}

export default function WordleHelper() {
  const [grid, setGrid] = useState(emptyGrid())
  const [activeCell, setActiveCell] = useState({ row: 0, col: 0 })
  const [results, setResults] = useState([])
  const [searched, setSearched] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const containerRef = useRef(null)

  const updateCell = useCallback((row, col, updates) => {
    setGrid(prev => {
      const next = prev.map(r => r.map(c => ({ ...c })))
      Object.assign(next[row][col], updates)
      return next
    })
  }, [])

  const handleCellClick = useCallback((row, col) => {
    setActiveCell({ row, col })
    const cell = grid[row][col]
    if (cell.letter) {
      // Cycle the state
      updateCell(row, col, { state: NEXT_STATE[cell.state] })
    }
  }, [grid, updateCell])

  const handleKeyDown = useCallback((e) => {
    const { row, col } = activeCell
    if (e.key === 'Backspace') {
      if (grid[row][col].letter) {
        updateCell(row, col, { letter: '', state: 'empty' })
      } else if (col > 0) {
        const prevCol = col - 1
        updateCell(row, prevCol, { letter: '', state: 'empty' })
        setActiveCell({ row, col: prevCol })
      }
      return
    }
    if (e.key === 'Enter') {
      handleSearch()
      return
    }
    if (e.key === 'Tab') {
      e.preventDefault()
      // Move to next row start
      const nextRow = (row + 1) % NUM_ROWS
      setActiveCell({ row: nextRow, col: 0 })
      return
    }
    if (e.key.length === 1 && /[a-zA-Z]/.test(e.key)) {
      const letter = e.key.toUpperCase()
      const currentCell = grid[row][col]
      updateCell(row, col, {
        letter,
        state: currentCell.state === 'empty' ? 'green' : currentCell.state,
      })
      if (col < WORD_LEN - 1) {
        setActiveCell({ row, col: col + 1 })
      } else if (row < NUM_ROWS - 1) {
        setActiveCell({ row: row + 1, col: 0 })
      }
    }
  }, [activeCell, grid, updateCell])

  const handleSearch = useCallback(() => {
    // Build constraints from grid
    const greens = Array(WORD_LEN).fill(null) // exact position
    const yellowSets = Array.from({ length: WORD_LEN }, () => new Set()) // present but not here
    const required = new Set() // must contain
    const excluded = new Set() // must not contain

    for (const row of grid) {
      for (let col = 0; col < WORD_LEN; col++) {
        const { letter, state } = row[col]
        if (!letter) continue
        if (state === 'green') {
          greens[col] = letter
          required.add(letter)
        } else if (state === 'yellow') {
          yellowSets[col].add(letter)
          required.add(letter)
        } else if (state === 'gray') {
          excluded.add(letter)
        }
      }
    }

    // Remove from excluded any letter that's required (gray can overlap with green/yellow in multi-instance scenarios)
    for (const l of required) excluded.delete(l)

    const matched = WORDS.filter(w => {
      if (w.length !== WORD_LEN) return false
      // Check greens
      for (let i = 0; i < WORD_LEN; i++) {
        if (greens[i] && w[i] !== greens[i]) return false
      }
      // Check yellows (must contain letter, but not at this position)
      for (let i = 0; i < WORD_LEN; i++) {
        for (const l of yellowSets[i]) {
          if (!w.includes(l)) return false
          if (w[i] === l) return false
        }
      }
      // Check required
      for (const l of required) {
        if (!w.includes(l)) return false
      }
      // Check excluded
      for (const l of excluded) {
        if (w.includes(l)) return false
      }
      return true
    }).sort()

    setResults(matched)
    setSearched(true)
  }, [grid])

  const handleVirtualKey = useCallback((l) => {
    const { row, col } = activeCell
    const currentCell = grid[row][col]
    updateCell(row, col, {
      letter: l,
      state: currentCell.state === 'empty' ? 'green' : currentCell.state,
    })
    if (col < WORD_LEN - 1) setActiveCell({ row, col: col + 1 })
    else if (row < NUM_ROWS - 1) setActiveCell({ row: row + 1, col: 0 })
  }, [activeCell, grid, updateCell])

  useEffect(() => {
    const hasAnyLetter = grid.some(row => row.some(cell => cell.letter))
    if (!hasAnyLetter) {
      setResults([])
      setSearched(false)
      return
    }
    handleSearch()
  }, [grid, handleSearch])

  useEffect(() => {
    containerRef.current?.focus()
  }, [])

  const handleReset = useCallback(() => {
    setGrid(emptyGrid())
    setActiveCell({ row: 0, col: 0 })
    setResults([])
    setSearched(false)
    containerRef.current?.focus()
  }, [])

  return (
    <div
      ref={containerRef}
      className="outline-none"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <div className="flex justify-between items-center mb-1">
        <button
          onClick={() => setShowHelp(h => !h)}
          className={`w-6 h-6 rounded-full text-xs font-bold transition-colors ${showHelp ? 'bg-gray-400 text-white' : 'bg-gray-200 text-gray-500 hover:bg-gray-300'}`}
          aria-label="Toggle help"
        >?</button>
        <button
          onClick={handleReset}
          className="px-3 h-6 bg-gray-200 text-gray-500 text-xs font-bold rounded-full hover:bg-gray-300 active:bg-gray-400 transition-colors"
        >Reset</button>
      </div>
      {showHelp && (
        <p className="text-sm text-gray-500 mb-3 text-center">
          Tap a cell to enter a letter. Tap again to cycle color:<br />
          <span className="inline-flex gap-2 mt-1 text-xs font-semibold">
            <span className="px-2 py-0.5 rounded tile-green text-white">Green = correct</span>
            <span className="px-2 py-0.5 rounded tile-yellow text-white">Yellow = wrong spot</span>
            <span className="px-2 py-0.5 rounded tile-gray text-white">Gray = not in word</span>
          </span>
        </p>
      )}

      {/* Grid */}
      <div className="flex flex-col gap-1.5 mb-4">
        {grid.map((row, ri) => (
          <div key={ri} className="flex gap-1.5 justify-center">
            {row.map((cell, ci) => {
              const isActive = activeCell.row === ri && activeCell.col === ci
              return (
                <button
                  key={ci}
                  onClick={() => handleCellClick(ri, ci)}
                  className={`
                    w-12 h-12 sm:w-14 sm:h-14 rounded text-lg font-bold uppercase
                    border-2 transition-all select-none
                    ${STATE_CLASSES[cell.state]}
                    ${isActive ? 'ring-2 ring-offset-1 ring-blue-400' : ''}
                  `}
                >
                  {cell.letter}
                </button>
              )
            })}
          </div>
        ))}
      </div>

      {/* On-screen keyboard (mobile UX) */}
      <div className="flex flex-col gap-1 mb-4">
        <div className="flex gap-1">
          {'QWERTYUIOP'.split('').map(l => (
            <button key={l} onClick={() => handleVirtualKey(l)}
              className="flex-1 min-w-0 h-10 bg-gray-200 rounded text-xs font-bold hover:bg-gray-300 active:bg-gray-400">
              {l}
            </button>
          ))}
        </div>
        <div className="flex gap-1 px-[5%]">
          {'ASDFGHJKL'.split('').map(l => (
            <button key={l} onClick={() => handleVirtualKey(l)}
              className="flex-1 min-w-0 h-10 bg-gray-200 rounded text-xs font-bold hover:bg-gray-300 active:bg-gray-400">
              {l}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => {
              const { row, col } = activeCell
              if (grid[row][col].letter) {
                updateCell(row, col, { letter: '', state: 'empty' })
              } else if (col > 0) {
                const prevCol = col - 1
                updateCell(row, prevCol, { letter: '', state: 'empty' })
                setActiveCell({ row, col: prevCol })
              }
            }}
            className="flex-[1.5] h-10 bg-gray-300 rounded text-xs font-bold hover:bg-gray-400 active:bg-gray-500">
            ⌫
          </button>
          {'ZXCVBNM'.split('').map(l => (
            <button key={l} onClick={() => handleVirtualKey(l)}
              className="flex-1 min-w-0 h-10 bg-gray-200 rounded text-xs font-bold hover:bg-gray-300 active:bg-gray-400">
              {l}
            </button>
          ))}
        </div>
      </div>


      <WordResults words={results} searched={searched} />
    </div>
  )
}
