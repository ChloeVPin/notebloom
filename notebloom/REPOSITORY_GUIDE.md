# Notebloom Repository Guide

This document covers the current GitHub and release workflow for Notebloom.

## Repository Information

- Repository URL: `https://github.com/ChloeVPin/notebloom`
- Visibility: Public
- Purpose: Source code, releases, and project documentation for Notebloom

## Repository Layout

```text
notebloom/
|- .github/              GitHub templates and workflows
|- build/                Wails build configuration and Windows assets
|- frontend/             React + TypeScript frontend source
|- app.go                Go backend application logic
|- main.go               Wails entry point
|- go.mod                Go module definition
|- go.sum                Go module checksums
|- README.md             Public project README
|- CHANGELOG.md          Version history
|- LICENSE               MIT license
|- wails.json            Wails app configuration
```

## Release Flow

1. Update `wails.json` with the new `productVersion`.
2. Update `CHANGELOG.md` with the new release section.
3. Build the Windows installer locally if needed with:

```bash
wails build -nsis
```

4. Push a tag in the form `vX.X.X`.
5. GitHub Actions publishes the release and uploads:
   - `Notebloom Setup X.X.X.exe`
   - `CHANGELOG.md`

## Release Assets

Each GitHub release should include:

- Windows installer executable
- Matching `CHANGELOG.md`
- Release notes derived from the top changelog section

## Development

```bash
cd frontend
npm install
cd ..
wails dev
```

## Production Build Commands

```bash
wails build
wails build -nsis
```

## Notes

- Keep the README structure stable so the public GitHub landing page stays familiar.
- Keep release notes aligned with the changelog so the release page and the repository history match.
- Update the bug report version placeholder whenever the app version changes.
