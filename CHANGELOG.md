# Changelog

All notable changes to NoteBloom are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.2.0] — 2026-05-07

### Added
- Settings panel (popover) with toggles for UI elements, spell check, and context menu items
- Settings persistence via Rust file-based JSON (`settings.json`) — survives restarts
- Draft cache in `localStorage` — unsaved edits survive crashes and note switches
- "Save as" context menu item — exports note to `.txt` via OS file picker (Tauri plugin-dialog + plugin-fs)
- "Duplicate" context menu item
- "Copy text" context menu item
- "Wipe all data" button in settings with confirmation flow — deletes `notes.json` and `settings.json`
- Keyboard shortcut `Ctrl+P` / `Cmd+P` to toggle pin
- `wipe_all_data`, `get_settings`, `save_settings` Rust commands
- Windows 11 native window controls (minimize, maximize/restore, close)
- macOS traffic-light window controls

### Changed
- Notes no longer auto-open on launch — editor stays empty until a note is selected
- Editor now correctly restores content on app restart (race condition between `selectedId` and note list load fixed)
- Settings popover closes automatically after "Wipe all data" is confirmed
- Pin sort uses `Number(b.pinned) - Number(a.pinned)` for correct ordering
- Win11Controls cleanup avoids race condition with mounted ref pattern
- All icon buttons have tactile `active:scale` press feedback
- Minimum window size locked to 1100 × 720 (matches default)
- Version bumped to 1.2.0 across `package.json`, `tauri.conf.json`, and `Cargo.toml`

---

## [0.1.0] — 2026-05-06

### Added
- Initial release
- Create, edit, delete, and pin notes
- Frameless window with custom drag region
- Dark / light theme toggle with smooth CSS transition
- Auto-save (800 ms debounce)
- Right-click context menu on note list items
- Local JSON storage via Rust (`notes.json` in app data directory)
- Sidebar with note list, timestamps, and pin indicators
- Empty state for sidebar and editor

---

[1.2.0]: https://github.com/ChloeVPin/notebloom/releases/tag/v1.2.0
[0.1.0]: https://github.com/ChloeVPin/notebloom/releases/tag/v0.1.0
