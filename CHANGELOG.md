# Changelog

All notable changes to Notebloom will be documented in this file.

## Version 1.1.0
*March 22, 2026*

Desktop rewrite and release workflow update.

**Added**
- Migrated the desktop app from Electron to Wails with a Go backend
- Added a React + TypeScript + Vite frontend stack
- Added a frameless custom titlebar with the Notebloom logo and native window controls
- Added a thin flat command bar for `New`, `Save`, `Save As`, and `Delete`
- Added live note-aware window titles
- Added autosave with debounced writes
- Added atomic note writes and safer export handling
- Added a release workflow that publishes the Windows app executable and release notes
- Added backend tests for save/load and corrupt-file handling

**Changed**
- Reworked the sidebar and editor to feel less boxed-in and less sectioned off
- Moved stateful controls out of the sidebar and into a dedicated command bar
- Simplified the footer so it only shows active state
- Updated the app branding and release metadata to match the new version

**Fixed**
- Long note titles now truncate properly in the sidebar
- Empty editor state is centered correctly
- The command bar buttons align edge-to-edge
- Corrupt note files are skipped during load instead of breaking startup
- Save operations no longer rely on direct overwrite writes

## Version 1.0.0
*February 11, 2026*

Initial release of Notebloom.

**Added**
- Clean notepad interface with pastel pink theme
- Automatic note saving
- Sidebar for organizing multiple notes
- Simple and distraction-free writing experience
- Windows installer with desktop shortcuts

[1.1.0]: https://github.com/ChloeVPin/notebloom/releases/tag/v1.1.0
[1.0.0]: https://github.com/ChloeVPin/notebloom/releases/tag/v1.0.0
