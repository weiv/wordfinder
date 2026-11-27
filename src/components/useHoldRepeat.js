import { useRef, useEffect } from 'react'

// Fire an action on press, then auto-repeat while held. Spread the result onto a button.
export default function useHoldRepeat(callback) {
  const cbRef = useRef(callback)
  cbRef.current = callback
  const timers = useRef({})
  const stop = () => {
    clearTimeout(timers.current.t)
    clearInterval(timers.current.i)
    timers.current = {}
  }
  const start = (e) => {
    e.preventDefault()
    cbRef.current()
    timers.current.t = setTimeout(() => {
      timers.current.i = setInterval(() => cbRef.current(), 90)
    }, 400)
  }
  useEffect(() => stop, []) // clear timers on unmount
  return { onPointerDown: start, onPointerUp: stop, onPointerLeave: stop, onPointerCancel: stop }
}
