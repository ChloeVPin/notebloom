# Notebloom Repository Guide

This document covers the current GitHub and release workflow for Notebloom.

## Repository Information

- Repository URL: `https://github.com/ChloeVPin/notebloom`
- Visibility: Public
- Purpose: Source code, releases, and project documentation for Notebloom

## Repository Layout

```text
.
|- .github/              GitHub templates and workflows
|- build/                Wails build configuration and Windows assets
|- frontend/             React + TypeScript frontend source
|- app.go                Go backend application logic
|- app_test.go           Backend tests
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
2. Update `frontend/package.json` with the matching frontend version.
3. Update `CHANGELOG.md` with the new release section.
4. Build the Windows installer locally if needed with:

```bash
wails build -nsis
```

5. Push a tag in the form `vX.X.X`.
6. GitHub Actions publishes the release and uploads:
   - `Notebloom.exe`

## Release Assets

Each GitHub release should include:

- Windows app executable
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
