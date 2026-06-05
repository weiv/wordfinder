# wordfinder
Minimalistic word search app, should work well on mobile.

Supports solving Wordle, finding words in crosswords, and finding words for Scrabble or such.

You can use it at https://weiv-words.netlify.app/

## Running locally

This is a static [Vite](https://vitejs.dev/) + React app with no backend — all word
matching happens client-side. [Bun](https://bun.sh/) is used as the package manager
and script runner.

Get the latest code and install dependencies:

```bash
git checkout main && git pull origin main
bun install
```

### Dev server (hot reload, for editing)

```bash
bun dev            # = vite --host, reachable at http://rasp5.local:5173
```

### Production build + preview

```bash
bun run build              # outputs static files to dist/
bun run preview -- --host  # serves dist/ at http://rasp5.local:4173
```

The `preview` script doesn't include `--host` by default, so pass it through (the `--`
forwards the flag to Vite) or it will only bind to localhost and won't be reachable as
`rasp5.local`. The hostnames `rasp5.local` and `words.weivco.com` are whitelisted in
`vite.config.js` under `server.allowedHosts`.

`vite preview` is a dev-grade static server. For a stable always-on deployment, build
`dist/` and serve it with a real static server (nginx, Caddy, or `npx serve dist`),
keeping it running across reboots via systemd or pm2.
