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
