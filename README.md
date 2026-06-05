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
bun run preview -- --host  # serves dist/ over the network
```

The `preview` script doesn't include `--host` by default, so pass it through (the `--`
forwards the flag to Vite) or it will only bind to localhost. The hostnames
`rasp5.local` and `words.weivco.com` are whitelisted in `vite.config.js` under
`server.allowedHosts`.

`vite preview` serves a snapshot of `dist/` taken at startup, so a rebuild is **not**
picked up until the process is restarted.

## Deploying (rasp5.local)

The production site at `words.weivco.com` runs on the Pi as follows:

- A systemd service, **`wordfinder.service`**, runs `vite preview --host --port 5173`,
  serving the built `dist/`.
- **Cloudflare Tunnel** (`cloudflared`, `/etc/cloudflared/config.yml`) forwards
  `words.weivco.com` to that local port. Caddy and nginx also run on the box for other
  services and aren't involved in serving this app.

Because `vite preview` holds a snapshot of `dist/`, deploying a change is rebuild +
restart:

```bash
cd ~/src/wordfinder
git checkout main && git pull origin main
bun install                          # only if dependencies changed
bun run build                        # regenerate dist/
sudo systemctl restart wordfinder    # make preview pick up the new dist/
```

`bun run build` on its own is not enough — without the restart, `vite preview` keeps
serving the old build. Inspect the service with `systemctl cat wordfinder` or
`systemctl status wordfinder`.
