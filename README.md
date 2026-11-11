# ⚡ JSON Toolkit

A free, open-source JSON diff checker, validator, and formatter built for developers.

![JSON Toolkit](https://img.shields.io/badge/JSON-Toolkit-6366f1?style=for-the-badge)
![React](https://img.shields.io/badge/React-18-61dafb?style=for-the-badge&logo=react)
![Vite](https://img.shields.io/badge/Vite-5-646cff?style=for-the-badge&logo=vite)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

## ✨ Features

### 🌳 Tree Diff View
- Visual hierarchy with expandable/collapsible nodes
- Side-by-side value comparison with arrows
- Color-coded changes (added, removed, modified, type changed)
- "Expand Changes" to auto-expand only paths with differences
- Search/filter by key path
- Toggle to show only changes

### 🌐 Import from URL or curl
- A **separate request field per side**, each with its own Fetch button, status line, and Clear
- Paste a **URL** or a full **curl command** into either one — responses load into the matching diff panel
- **Fetch Both** pulls both sides at once; the two requests are independent, so one failing never disturbs the other
- Supports the flags devtools' "Copy as cURL" emits — `-X`, `-H`, `-d/--data`, `-u`, `--url`, line continuations, both quote styles
- Everything downstream works unchanged: format, sort, convert, diff, and revert
- Headers `fetch` is not allowed to set (`Cookie`, `Host`, …) are parsed but reported as dropped rather than silently ignored

### ★ Bookmarks
- Save any request with **☆ Save** on either request field; the name is generated from the
  method and URL and can be renamed inline
- Organise into **folders** — create, rename, delete, and move requests between them
- Load a saved request into either side with **→L** / **→R** — it fills that side's field and
  fetches straight away

Bookmarks live in `localStorage` under `jsonToolkit.bookmarks` and never leave the browser:
origin-scoped, never transmitted, no backend involved. A saved curl command retains whatever
headers you pasted, auth tokens included — it is your own browser storage, but worth knowing
on a shared machine. Stored data is re-validated on load, so a corrupted or hand-edited key
falls back to defaults instead of breaking the Diff tab.

**On CORS:** requests go direct first. That works for APIs sending `Access-Control-Allow-Origin`
(GitHub, most public REST APIs) and is blocked by the browser for everything else — a curl that
works in your terminal can still fail here. For those, deploy a proxy you control and paste its
URL under **⚙ Proxy**:

```bash
# Public APIs — Cloudflare Workers (add your origin to ALLOWED_ORIGINS first)
npx wrangler deploy proxy/worker.js --name json-toolkit-proxy

# Internal/VPN-only APIs — a Worker has no route to your intranet, so run it locally
node proxy/local-proxy.mjs          # http://localhost:8787
```

Both proxies enforce an origin allowlist. The Worker additionally refuses private and
link-local targets so it can't be used to reach internal services or cloud metadata.
Anything sent through a proxy — including auth tokens — is visible to it, so only use one you own.

### 📐 YAML handling
- Parsing and serialisation use [js-yaml](https://github.com/nodeca/js-yaml) — anchors,
  aliases, block scalars, flow collections and quoted keys all behave per spec
- Syntax errors report the offending **line number** with surrounding context
- Input that is neither JSON nor YAML (an HTML error page, say) is identified as such rather
  than being reported as valid YAML

### 🔧 Auto-Fix & Validation
- **Unquoted keys support** — `{ name: "value" }` auto-converts to valid JSON
- **Single quotes** — `{ 'key': 'value' }` converted to double quotes
- **Trailing commas** — automatically removed
- **Line-by-line error reporting** with code preview

### 📏 Utilities
- **Format** — Pretty print with 2-space indentation
- **Minify** — Remove all whitespace
- **Sort Keys** — Alphabetically order object keys (deep)
- **Copy** — One-click copy to clipboard
- **Swap** — Quickly swap left/right panels

## 🚀 Quick Start

### Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Deployment

This project auto-deploys to GitHub Pages on every push to `main` branch.

## 🔍 SEO & AI crawler visibility

AI crawlers (GPTBot, ClaudeBot, PerplexityBot, CCBot and the rest) **do not execute
JavaScript** — they read the HTML the server returns and leave. A client-rendered React app
is therefore close to invisible to them.

`public/about.html` is the answer: a static page describing every tool, with a visible FAQ,
carrying ~1,100 words a crawler can read without running a line of JS. It also gives the
`FAQPage` structured data the visible counterpart Google requires.

It is linked three ways, because each reaches a different consumer:

| Route | Reaches |
|---|---|
| Static `<footer>` in `index.html` (outside `#root`) | crawlers that do not run JS — a React-rendered link would be invisible to them |
| `sitemap.xml` | Google and Bing |
| `llms.txt` | LLM-facing tooling |

Structured data is split to match where the content actually lives: `WebSite`,
`Organization` and `SoftwareApplication` stay on the app page; `FAQPage` and the two `HowTo`
entries moved to `about.html` alongside the prose they describe. `public/robots.txt`
explicitly allows the current AI crawlers.

> ### ⚠️ robots.txt and llms.txt are inert at the current URL
>
> Crawlers only read `robots.txt` at the **origin root**. For
> `https://sreenathch.github.io/json-toolkit/` that is
> `https://sreenathch.github.io/robots.txt` — which belongs to the `sreenathch.github.io`
> user-pages repo, not this one, and currently returns **404**. A `robots.txt` served from a
> subdirectory is never fetched.
>
> To make the rules take effect, copy `public/robots.txt` and `public/llms.txt` into the root
> of the `sreenathch.github.io` repository (adjusting the `Sitemap:` line), or move this
> project to its own domain. The copies here are correct and ready — they are just served
> from a path no crawler looks at.
>
> Note this does **not** block anything today: every rule in the file is `Allow`, and crawlers
> treat a missing robots.txt as "crawl freely". What is lost is the `Sitemap:` discovery line
> and the ability to disallow a crawler later.

### Telling search engines about an update

The old `google.com/ping?sitemap=` and `bing.com/ping?sitemap=` endpoints are dead (404 and
410 respectively). What works now:

- **Google** — no API without OAuth. Use Search Console: submit the sitemap once, then
  *URL Inspection → Request Indexing* after a significant content change. Google does not
  support IndexNow.
- **Bing, Yandex, Seznam, Naver** — one IndexNow call covers all four. The hex-named `.txt`
  file in `public/` is the IndexNow key; it must stay reachable or submissions start failing:

  ```bash
  KEY=$(basename public/[0-9a-f]*.txt .txt)
  curl -X POST https://api.indexnow.org/indexnow \
    -H 'Content-Type: application/json' \
    -d "{\"host\":\"sreenathch.github.io\",\"key\":\"$KEY\",
         \"keyLocation\":\"https://sreenathch.github.io/json-toolkit/$KEY.txt\",
         \"urlList\":[\"https://sreenathch.github.io/json-toolkit/\"]}"
  ```

  `keyLocation` is required because the key sits in a subdirectory rather than the origin
  root; submitted URLs must start with that path or the API returns 422.

AI crawlers (GPTBot, ClaudeBot, PerplexityBot) have no submission endpoint — they crawl on
their own schedule and discover pages through links and existing search indexes.

## 🛠️ Tech Stack

- **React 18** — UI library
- **Vite** — Build tool
- **GitHub Actions** — CI/CD
- **GitHub Pages** — Hosting

## 📁 Project Structure

```
json-toolkit/
├── .github/
│   └── workflows/
│       └── deploy.yml    # CI/CD pipeline
├── proxy/
│   ├── worker.js         # CORS proxy for Cloudflare Workers
│   └── local-proxy.mjs   # Same, for intranet APIs (Node 18+, no deps)
├── src/
│   ├── App.jsx           # Main component
│   ├── main.jsx          # Entry point
│   └── index.css         # Global styles
├── index.html            # HTML template
├── package.json          # Dependencies
├── vite.config.js        # Vite config
└── README.md
```

## 🤝 Contributing

Contributions are welcome! Feel free to:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [React](https://react.dev/)
- Bundled with [Vite](https://vitejs.dev/)
- Hosted on [GitHub Pages](https://pages.github.com/)

---

Made with ❤️ for developers who debug JSON daily
