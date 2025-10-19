# Zenith PDF Desktop

<div align="center">

**🔒 Privacy-First Offline PDF Annotation Desktop App**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-2.0.0-green.svg)](https://github.com/yourorg/zenith-pdf/releases)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey.svg)](https://github.com/yourorg/zenith-pdf/releases)

[Download](#-download) • [Features](#-features) • [Quick Start](#-quick-start) • [Documentation](#-documentation)

</div>

---

## 🎯 Overview

Zenith PDF is a **free, open-source desktop application** for PDF annotation. All your documents stay on your computer - **no cloud, no servers, complete privacy**.

### Why Zenith PDF Desktop?

- 🔒 **Complete Privacy** - All data stored locally on your computer
- ⚡ **Lightning Fast** - No network latency, instant response
- 📴 **Works Offline** - No internet connection required
- 💾 **Local Storage** - SQLite database + local file system
- 🎨 **Rich Annotations** - 5 annotation types with full customization
- 🆓 **100% Free** - No subscriptions, no ads, no tracking
- 🌐 **Cross-Platform** - Windows, macOS, and Linux

---

## ✨ Features

### 📝 Annotation Tools

| Tool | Description | Status |
|------|-------------|--------|
| **Highlight** | Mark important text with customizable colors | ✅ Available |
| **Underline** | Emphasize text with clean underlines | ✅ Available |
| **Strikethrough** | Mark deletions or outdated content | ✅ Available |
| **Sticky Notes** | Add notes without covering text | ✅ Available |
| **Comments** | Thread discussions with replies | ✅ Available |
| **Drawing** | Freehand, shapes, arrows | 🔄 Coming in v2.1 |

### 🎨 Advanced Capabilities

- ✅ **Multi-layer Annotations** - Overlay multiple types
- ✅ **Color Customization** - 8+ color palettes
- ✅ **Opacity Control** - Adjust transparency
- ✅ **Export with Annotations** - Flatten to PDF
- ✅ **Comments Summary Export** - Separate document
- ✅ **Keyboard Shortcuts** - 20+ shortcuts
- ✅ **Activity Tracking** - Complete history
- ✅ **Search & Filter** - Find anything instantly

### 🔐 Security & Privacy

- 🔒 **Local-Only Storage** - Never leaves your computer
- 🔑 **Strong Passwords** - Advanced validation (zxcvbn)
- 🛡️ **No Telemetry** - Zero tracking or analytics
- 💯 **Open Source** - Audit the code yourself
- 🚫 **No Cloud Dependency** - Works 100% offline

---

## 📥 Download

### Latest Release: v2.0.0

| Platform | Download | Size |
|----------|----------|------|
| **Windows 10/11** | [Zenith-PDF-Setup-2.0.0.exe](#) | ~80 MB |
| **Windows Portable** | [Zenith-PDF-Portable-2.0.0.exe](#) | ~80 MB |
| **macOS 10.13+** | [Zenith-PDF-2.0.0.dmg](#) | ~85 MB |
| **Linux AppImage** | [Zenith-PDF-2.0.0.AppImage](#) | ~90 MB |
| **Linux deb** | [zenith-pdf_2.0.0_amd64.deb](#) | ~85 MB |

### System Requirements

- **OS**: Windows 10/11, macOS 10.13+, or Linux (64-bit)
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 200MB for app + space for documents
- **Display**: 1366x768 minimum, 1920x1080+ recommended

---

## 🚀 Quick Start

### Installation

#### Windows
1. Download `Zenith-PDF-Setup-2.0.0.exe`
2. Run the installer (SmartScreen may warn - click "More info" → "Run anyway")
3. Follow installation wizard
4. Launch from Start Menu

#### macOS
1. Download `Zenith-PDF-2.0.0.dmg`
2. Open DMG file
3. Drag Zenith PDF to Applications
4. First launch: Right-click → Open (to bypass Gatekeeper)

#### Linux (AppImage)
```bash
# Download
wget https://github.com/yourorg/zenith-pdf/releases/download/v2.0.0/Zenith-PDF-2.0.0.AppImage

# Make executable
chmod +x Zenith-PDF-2.0.0.AppImage

# Run
./Zenith-PDF-2.0.0.AppImage
```

### First Time Setup

1. **Launch App** - Double-click the icon
2. **Create Account** - Local account (stored on your computer only)
3. **Upload PDF** - Click "Upload" and select a file
4. **Start Annotating!** - Use toolbar to add highlights, comments, etc.

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────┐
│       Zenith PDF Desktop App             │
├──────────────────────────────────────────┤
│  Renderer Process (React)                │
│  ├─ PDF.js (rendering)                   │
│  ├─ Chakra UI (components)               │
│  └─ Zustand (state)                      │
├──────────────────────────────────────────┤
│  IPC Bridge (secure context isolation)   │
├──────────────────────────────────────────┤
│  Main Process (Electron + Node.js)       │
│  ├─ SQLite Database                      │
│  ├─ Local File System                    │
│  ├─ bcrypt (passwords)                   │
│  └─ JWT (auth tokens)                    │
└──────────────────────────────────────────┘
```

**Data Storage:**
- **Windows**: `C:\Users\<You>\AppData\Roaming\zenith-pdf\`
- **macOS**: `~/Library/Application Support/zenith-pdf/`
- **Linux**: `~/.config/zenith-pdf/`

See [DESKTOP_MIGRATION.md](./DESKTOP_MIGRATION.md) for architecture details.

---

## 📚 Documentation

### User Guides
- [**User Guide**](./Documentation/USER_GUIDE.md) - Complete end-user documentation
- [**Keyboard Shortcuts Reference**](./Documentation/USER_GUIDE.md#keyboard-shortcuts)
- [**Troubleshooting**](./Documentation/USER_GUIDE.md#troubleshooting)

### Developer Guides
- [**Development Setup**](./DESKTOP_MIGRATION.md#-how-to-run) - Build from source
- [**Desktop Migration Guide**](./DESKTOP_MIGRATION.md) - Web → Desktop conversion
- [**Integration Guide**](./Documentation/INTEGRATION_GUIDE.md) - Extend functionality
- [**Testing Guide**](./Documentation/TESTING_GUIDE.md) - Run tests (98% coverage!)

---

## 🛠️ Development

### Prerequisites

- **Node.js** 20+
- **npm** 10+
- **Git**

### Setup

```bash
# Clone repository
git clone https://github.com/yourorg/zenith-pdf.git
cd zenith-pdf

# Install dependencies
npm install
cd frontend && npm install && cd ..

# Run in development
npm run dev
```

This starts:
1. Vite dev server (frontend) on `http://localhost:5173`
2. Electron app with DevTools enabled

### Build

```bash
# Build for current platform
npm run build
npm run package

# Build installer
npm run make
```

Output: `./release/` directory

### Testing

```bash
# Run all tests
cd frontend && npm test

# With coverage
npm run test:coverage
```

**Coverage**: 128 tests, 98% coverage ✅

---

## 🗺️ Roadmap

### ✅ Phase 1: Desktop MVP (COMPLETE - v2.0)

- [x] Electron desktop app architecture
- [x] SQLite local database
- [x] Local file system storage
- [x] User authentication (local)
- [x] 5 annotation types
- [x] Comments & threads
- [x] Export with flattened annotations
- [x] Keyboard shortcuts (20+)
- [x] Activity tracking
- [x] 98% test coverage

### 🔄 Phase 2: Markup Toolkit (Q2 2025 - v2.1)

- [ ] Expanded annotation tools (shapes, freehand drawing)
- [ ] Annotation templates
- [ ] Page reordering and deletion
- [ ] Full-text search across documents
- [ ] PDF form filling

### 🎯 Phase 3: Full Editor (Q3-Q4 2025 - v2.2)

- [ ] Direct text editing
- [ ] Image manipulation
- [ ] Digital signatures
- [ ] WCAG 2.1 AA compliance
- [ ] Document templates
- [ ] Auto-update system

### 🌐 Future: Optional Cloud Sync (TBD)

- [ ] End-to-end encrypted cloud backup
- [ ] Cross-device synchronization
- [ ] Optional collaboration mode

---

## 🤝 Contributing

We welcome contributions!

### Ways to Contribute

- 🐛 **Report Bugs** - [Open an issue](https://github.com/yourorg/zenith-pdf/issues/new)
- 💡 **Suggest Features** - [Start a discussion](https://github.com/yourorg/zenith-pdf/discussions)
- 📝 **Improve Docs** - Fix typos, add examples
- 💻 **Submit Code** - See issues labeled `good first issue`

### Development Process

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open Pull Request

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

---

## 📊 Comparison

| Feature | Zenith PDF | Adobe Acrobat | Foxit Reader |
|---------|------------|---------------|--------------|
| **Price** | Free | $19.99/mo | $9.99/mo |
| **Privacy** | ✅ Local only | ⚠️ Cloud | ⚠️ Cloud |
| **Offline** | ✅ 100% | ✅ Yes | ✅ Yes |
| **Open Source** | ✅ MIT | ❌ No | ❌ No |
| **Annotations** | ✅ 5 types | ✅ 10+ types | ✅ 8 types |
| **Export** | ✅ Flattened | ✅ Yes | ✅ Yes |
| **File Size** | 80MB | 600MB+ | 250MB |
| **Platforms** | Win/Mac/Linux | Win/Mac | Win/Mac |
| **Telemetry** | ✅ None | ❌ Yes | ❌ Yes |

---

## 📄 License

**MIT License** - See [LICENSE](./LICENSE) for details.

```
Copyright (c) 2025 Zenith PDF Team

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software... [full MIT license text]
```

---

## 🙏 Acknowledgments

Built with amazing open-source technologies:

- [Electron](https://www.electronjs.org/) - Desktop framework
- [React](https://react.dev/) - UI library
- [PDF.js](https://mozilla.github.io/pdf.js/) - PDF rendering
- [Chakra UI](https://chakra-ui.com/) - Components
- [SQLite](https://www.sqlite.org/) / [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) - Database
- [TypeScript](https://www.typescriptlang.org/) - Type safety
- [Vitest](https://vitest.dev/) - Testing

---

## 📞 Support

### Get Help

- 📖 **Documentation**: [Documentation/](./Documentation/)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/yourorg/zenith-pdf/discussions)
- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/yourorg/zenith-pdf/issues)

### Community

- 💬 **Discord**: [Join server](https://discord.gg/zenithpdf)
- 📧 **Email**: support@zenithpdf.com

---

<div align="center">

**Made with ❤️ for privacy and freedom**

**[Download](https://github.com/yourorg/zenith-pdf/releases)** • **[Star on GitHub](https://github.com/yourorg/zenith-pdf)** • **[Contribute](./CONTRIBUTING.md)**

</div>
