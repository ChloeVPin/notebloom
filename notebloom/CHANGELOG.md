# Changelog

All notable changes to Notebloom are recorded here.

## 1.1.0 - March 22, 2026

### Added
- Migrated the desktop app from Electron to Wails for a lighter runtime.
- Rebuilt the frontend with React, TypeScript, and Vite.
- Added a frameless custom titlebar with the Notebloom logo.
- Added a thin flat command bar for note actions.
- Added autosave with a short debounce so edits are saved automatically.
- Added safer note writes with atomic replace behavior.
- Added backend tests for save and load behavior.
- Added a GitHub release workflow that uploads the Windows installer and changelog.

### Changed
- Flattened the repository layout so the source lives at the repository root.
- Simplified the UI to reduce visual clutter and sectioning.
- Moved the note title into the native window title.
- Updated the README and release metadata to match version 1.1.0.

### Fixed
- Long note titles now truncate correctly in the sidebar.
- Empty editor state is centered instead of sitting at the top.
- Sidebar action spacing no longer collapses into the edges.
- Footer labels now show only active state.

## 1.0.0 - February 11, 2026

- Initial public release of Notebloom.

[1.1.0]: https://github.com/ChloeVPin/notebloom/releases/tag/v1.1.0
[1.0.0]: https://github.com/ChloeVPin/notebloom/releases/tag/v1.0.0
