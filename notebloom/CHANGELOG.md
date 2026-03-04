# Changelog

All notable changes to Notebloom will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-02-12

### Added
- Initial release of Notebloom (Wails version)
- Clean and intuitive notepad interface
- Multiple notes support with sidebar
- Pin notes to top functionality
- Auto-save with unsaved indicators
- Export notes to text files (Save As)
- Context menu for quick actions
- Word and character count
- Keyboard shortcuts (Ctrl+S to save, Ctrl+Shift+S to save as)
- Beautiful, calming design with Nunito font
- Windows x64 installer

### Technical
- Built with Wails v2 and Go
- Vanilla JavaScript frontend
- Notes stored in `~/.notebloom-wails/notes/` directory
- JSON-based note storage
- Custom window chrome with Wails runtime
- Optimized build size

[1.0.0]: https://github.com/ChloeVPin/notebloom/releases/tag/v1.0.0
