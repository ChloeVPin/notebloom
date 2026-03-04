# 🌸 Notebloom

A calm and lightweight desktop notepad application built with Wails and Go.

![Version](https://img.shields.io/badge/version-1.0.0-pink)
![Platform](https://img.shields.io/badge/platform-Windows-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## 📥 Download

Download the latest installer from the [Releases](../../releases) page.

### Latest Release
- **Notebloom-windows-amd64-installer.exe** - Windows x64 Installer

## ✨ Features

- Clean and intuitive interface
- Lightweight and fast
- Multiple notes with pinning support
- Auto-save functionality
- Export notes to text files
- Beautiful, calming design
- Word and character count
- Context menu for quick actions

## 🖥️ System Requirements

- Windows 10 or later (x64)
- 100 MB free disk space
- 4 GB RAM (recommended)

## 📦 Installation

1. Download the installer from the [Releases](../../releases) page
2. Run `Notebloom-windows-amd64-installer.exe`
3. Follow the installation wizard
4. Launch Notebloom from your Start Menu or Desktop shortcut

## 🔧 Building from Source

If you want to build the application yourself:

```bash
# Install dependencies
cd frontend
npm install
cd ..

# Run in development mode
wails dev

# Build installer
wails build

# Build for production with NSIS installer
wails build -nsis
```

## 🛠️ Technology Stack

- **Backend**: Go
- **Frontend**: Vanilla JavaScript, HTML, CSS
- **Framework**: Wails v2
- **UI**: Custom design with Nunito font

## 📄 License

MIT License. See the repository [LICENSE](../LICENSE).

## 👩‍💻 Author

Created by Chloe

---
