# Contributing to NoteBloom

Thanks for taking the time to help improve NoteBloom.

---

## Before you start

- Check [open issues](https://github.com/ChloeVPin/notebloom/issues) to see if your bug or feature is already being tracked.
- For significant changes, open an issue first to discuss the direction before writing code.
- Read [BUILD.md](BUILD.md) to get a working development environment.

---

## Local setup

```bash
git clone https://github.com/ChloeVPin/notebloom.git
cd notebloom
npm install
npm run tauri dev
```

The app opens in dev mode with hot-reload on the frontend. Rust changes require a restart.

---

## Useful checks

Before opening a pull request, verify these pass:

```bash
# TypeScript
npx tsc --noEmit

# Rust
cargo check --manifest-path src-tauri/Cargo.toml
cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings
cargo fmt --manifest-path src-tauri/Cargo.toml -- --check
```

---

## Where to make changes

| Area | Location |
|------|----------|
| UI / frontend logic | `src/App.tsx` |
| Note and settings API helpers | `src/lib/notes.ts` |
| Rust commands (backend) | `src-tauri/src/lib.rs` |
| shadcn/ui components | `src/components/ui/` |
| Global styles | `src/index.css` |
| App config (window size, permissions) | `src-tauri/tauri.conf.json` |
| Tauri capabilities | `src-tauri/capabilities/default.json` |

---

## Style expectations

**Frontend:**
- TypeScript strict mode — no `any` without justification
- Tailwind CSS for all styling — avoid inline `style=` except for Tauri-specific drag regions
- No new dependencies without a clear reason — check `package.json` before importing
- Components stay in `src/App.tsx` unless they're reusable UI primitives

**Rust:**
- Run `cargo fmt` before committing
- No `unwrap()` in command handlers — return `Result<_, String>` and use `map_err`
- Keep commands small; heavy logic belongs in helper functions

---

## Pull requests

A good PR description includes:
- What changed and why
- Commands you ran to verify it works
- Screenshots if the UI changed

Keep changes focused. A PR that fixes a bug should not also refactor unrelated code.

---

## Bug reports

Open an issue and include:
- NoteBloom version (shown in the title bar or `tauri.conf.json`)
- Your OS and architecture
- Steps to reproduce
- What you expected vs. what happened

---

## Feature requests

Open an issue describing the problem you're trying to solve, not just the solution. Features that add complexity or network access are unlikely to be merged — NoteBloom is intentionally minimal and local-only.

---

## Code of Conduct

Please read [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
