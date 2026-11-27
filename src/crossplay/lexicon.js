// Compact trie over A–Z words, stored in typed arrays (first-child / next-sibling).
// Node ids are integers; -1 means "no node". The word list is passed in so other
// platforms can load the dictionary their own way.

const A = 65

export function createLexicon(words) {
  let list = words
  for (let i = 1; i < list.length; i++) {
    if (list[i - 1] > list[i]) { list = [...words].sort(); break }
  }

  let cap = 1
  for (const w of list) cap += w.length
  let firstChild  = new Int32Array(cap).fill(-1)
  let nextSibling = new Int32Array(cap).fill(-1)
  let lastChild   = new Int32Array(cap).fill(-1)
  let letter      = new Uint8Array(cap)
  let terminal    = new Uint8Array(cap)
  let count = 1 // node 0 = root

  for (const w of list) {
    let node = 0
    for (let i = 0; i < w.length; i++) {
      const code = w.charCodeAt(i) - A
      // Input is sorted, so an existing child for this letter is always the last one added.
      const last = lastChild[node]
      if (last !== -1 && letter[last] === code) { node = last; continue }
      const n = count++
      letter[n] = code
      if (last === -1) firstChild[node] = n
      else nextSibling[last] = n
      lastChild[node] = n
      node = n
    }
    terminal[node] = 1
  }

  firstChild  = firstChild.slice(0, count)
  nextSibling = nextSibling.slice(0, count)
  letter      = letter.slice(0, count)
  terminal    = terminal.slice(0, count)

  function childByCode(node, code) {
    for (let n = firstChild[node]; n !== -1; n = nextSibling[n]) {
      if (letter[n] === code) return n
      if (letter[n] > code) return -1 // siblings are in alphabetical order
    }
    return -1
  }

  function child(node, ch) {
    return childByCode(node, ch.charCodeAt(0) - A)
  }

  function isTerminal(node) {
    return node >= 0 && terminal[node] === 1
  }

  function isWord(word) {
    let node = 0
    for (let i = 0; i < word.length && node !== -1; i++) {
      node = childByCode(node, word.charCodeAt(i) - A)
    }
    return isTerminal(node)
  }

  // Iterate a node's children: calls fn(letter, childNode) in alphabetical order.
  function forEachChild(node, fn) {
    for (let n = firstChild[node]; n !== -1; n = nextSibling[n]) {
      fn(String.fromCharCode(letter[n] + A), n)
    }
  }

  return { root: 0, nodeCount: count, child, isTerminal, isWord, forEachChild }
}
