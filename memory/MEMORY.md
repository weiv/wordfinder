# Project Memory

## Stack
- React 18 + Vite + Tailwind CSS
- **Use bun** (not npm) — `bun dev`, `bun run build`, `bun preview`
- No test runner configured

## Dev server
- `bun dev` runs on port 5173, binds to all interfaces (`--host` is default in package.json)
- Allowed hosts: `rasp5.local`, `words.weivco.com`
- Cloudflare tunnel config lives at `/etc/cloudflared/config.yml` (system service), not `~/.cloudflared/config.yml`

## Git identity
- Name: Vladimir Weinstein
- Email: github@weivsara.com

## Architecture
- Three tabs: Wordle Helper, Crossword Helper, Letters
- Tab selection persisted in `localStorage` key `mode`
- Word list: `src/data/words.js` — 63k+ uppercase words from `/usr/share/dict/words` (lowercase-only entries, lengths 3–15, no proper nouns)
- All filtering is client-side; no backend

## Letters tab
- Available letters → finds all words formable from any subset
- Optional fixed letters + position (beginning/middle/end): fixed letters are removed from the word, remainder must be formable from available pool
- State persisted: `letters`, `posLetters`, `position` in localStorage
- Scrabble scores displayed, results sorted by score descending
