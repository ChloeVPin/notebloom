# Architecture

NoteBloom is a [Tauri v2](https://tauri.app) desktop application. The frontend is a React SPA built with Vite; the backend is a Rust library crate embedded in the same binary.

---

## Runtime layers

```
┌──────────────────────────────────────────────────────────┐
│                    React frontend                        │
│                                                          │
│  src/App.tsx          — full application, ~900 lines     │
│  src/lib/notes.ts     — IPC wrappers, draft cache,       │
│                         settings API, time helpers       │
│  src/components/ui/   — shadcn/ui primitives             │
│  src/index.css        — Tailwind v4, theme transitions   │
└────────────────────────┬─────────────────────────────────┘
                         │
              invoke("command_name", { ...args })
              (Tauri IPC — no HTTP, no WebSockets)
                         │
┌────────────────────────▼─────────────────────────────────┐
│                   Tauri v2 core                          │
│                                                          │
│  src-tauri/src/lib.rs  — all Rust command handlers       │
│  src-tauri/src/main.rs — entry point (calls lib::run)    │
│                                                          │
│  Registered commands:                                    │
│    list_notes       create_note      update_note         │
│    delete_note      toggle_pin       duplicate_note      │
│    get_settings     save_settings    wipe_all_data       │
│                                                          │
│  Plugins:                                                │
│    tauri-plugin-dialog  — OS file-save dialog            │
│    tauri-plugin-fs      — write text files               │
│    tauri-plugin-opener  — open URLs / files externally   │
└────────────────────────┬─────────────────────────────────┘
                         │
                      std::fs
                         │
┌────────────────────────▼─────────────────────────────────┐
│                  Local file system                       │
│                                                          │
│  Windows  %APPDATA%\com.chloe.notebloom\                 │
│  macOS    ~/Library/Application Support/com.chloe.…     │
│  Linux    ~/.local/share/com.chloe.notebloom/            │
│                                                          │
│    notes.json      — array of Note objects               │
│    settings.json   — flat key/value settings map         │
└──────────────────────────────────────────────────────────┘
```

---

## Data shapes

### Note (Rust struct / TypeScript interface)

```typescript
interface Note {
  id: string;          // UUIDv4
  title: string;
  body: string;
  created_at: number;  // Unix ms
  updated_at: number;  // Unix ms
  pinned: boolean;
}
```

Notes are stored as a JSON array in `notes.json`. Every write serializes the full array — there is no append-only log. This is intentional: the file stays human-readable and trivially inspectable.

### Settings

Flat JSON object keyed by setting name. Unknown keys are ignored; missing keys fall back to defaults defined in `DEFAULT_SETTINGS` in `src/App.tsx`.

---

## Frontend state

All state lives in the root `App` component — there is no global state manager.

| State | Type | Purpose |
|-------|------|---------|
| `notes` | `Note[]` | The canonical in-memory list, sorted (pinned first, then by recency) |
| `selectedId` | `string \| null` | Which note is open in the editor |
| `title`, `body` | `string` | Live editor content (may diverge from saved note) |
| `saving` | `boolean` | Debounce save in-flight indicator |
| `savedAt` | `number \| null` | Timestamp of last successful persist |
| `settings` | `AppSettings` | Loaded from disk on mount, written back on every change |
| `dark` | `boolean` | Theme, synced to `localStorage` and `document.documentElement` |
| `deleteTarget` | `string \| null` | Which note is pending delete confirmation |
| `settingsOpen` | `boolean` | Controls the settings popover |

---

## Save flow

```
User types
  → handleTitleChange / handleBodyChange
  → draftCache.set(id, { title, body })   ← localStorage, immediate
  → scheduleSave(id, title, body)          ← debounce 800 ms
      → persistSave(id, title, body)
          → notesApi.update(id, title, body)
          → invoke("update_note", { id, title, body })
          → Rust: mutates notes array, writes notes.json
          → draftCache.clear(id)
```

If the app closes before the debounce fires, the draft survives in `localStorage` and is restored next time that note is selected.

---

## Design boundaries

- **No database** — plain JSON files only. No SQLite, no IndexedDB.
- **No network** — no HTTP calls, no WebSockets, no remote CDN assets.
- **No global state library** — React built-ins only (`useState`, `useCallback`, `useRef`).
- **No CSS-in-JS** — Tailwind CSS v4 utility classes only, plus one inline `WebkitAppRegion` style for the drag region.
- **No router** — single-page, single view. Navigation is just showing/hiding the editor.

---

## Why this shape

Tauri gives a tiny binary (~3 MB MSI) compared to Electron, with a Rust backend that handles file I/O safely and quickly. The React frontend stays thin — it never touches the file system directly; all I/O goes through `invoke()`. This makes the IPC boundary the only thing that needs auditing for security.

Keeping notes as plain JSON means users can inspect, back up, or migrate their data with any text editor. No lock-in.
