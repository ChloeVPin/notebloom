import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { DeleteNote, GetCurrentTime, LoadNotes, SaveAsNote, SaveNote } from "../wailsjs/go/main/App";
import { WindowSetTitle } from "../wailsjs/runtime/runtime";
import {
  Quit,
  WindowIsMaximised,
  WindowMinimise,
  WindowToggleMaximise,
} from "../wailsjs/runtime/runtime";
import { Copy, FilePlus, FileUp, Minus, Save, Square, Trash2, X } from "lucide-react";
import type { main } from "../wailsjs/go/models";
import type { Note, SaveAsResult } from "./types";
import logoUrl from "./assets/images/notebloom-official-logo.png";

function App() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [unsavedNoteIds, setUnsavedNoteIds] = useState<Set<string>>(new Set());
  const [persistedNoteIds, setPersistedNoteIds] = useState<Set<string>>(new Set());
  const [statusMessage, setStatusMessage] = useState("No notes");
  const [cursorLine, setCursorLine] = useState(1);
  const [cursorCol, setCursorCol] = useState(1);
  const [isMaximised, setIsMaximised] = useState(false);
  const editorRef = useRef<HTMLTextAreaElement | null>(null);
  const autosaveTimerRef = useRef<number | null>(null);
  const noteVersionsRef = useRef<Map<string, number>>(new Map());

  const activeNote = useMemo(() => notes.find((note) => note.id === activeNoteId) ?? null, [notes, activeNoteId]);

  useEffect(() => {
    void loadNotesFromDisk();
  }, []);

  useEffect(() => {
    const noteTitle = activeNote?.title?.trim() || "Untitled";
    WindowSetTitle(`Notebloom - ${noteTitle}`);
  }, [activeNote?.title]);

  useEffect(() => {
    const syncMaxState = () => {
      WindowIsMaximised()
        .then(setIsMaximised)
        .catch(() => {
          // Keep last known state on transient runtime failures.
        });
    };

    syncMaxState();
    const timer = window.setInterval(syncMaxState, 300);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "s") {
        return;
      }

      event.preventDefault();
      if (!activeNoteId) {
        return;
      }

      if (event.shiftKey) {
        void saveAsCurrentNote();
      } else {
        void saveCurrentNote();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [activeNoteId, activeNote]);

  async function getTimestamp(): Promise<number> {
    try {
      return await GetCurrentTime();
    } catch {
      return Date.now();
    }
  }

  async function loadNotesFromDisk(): Promise<void> {
    try {
      const loaded = (await LoadNotes()) as main.Note[];
      const normalized = loaded.map((note) => ({ ...note }));
      const sorted = sortNotes(normalized);
      setNotes(sorted);
      setPersistedNoteIds(new Set(normalized.map((note) => note.id)));
      setStatusMessage(sorted.length > 0 ? "Saved" : "No notes");
      setActiveNoteId((prev) => {
        if (prev && sorted.some((note) => note.id === prev)) {
          return prev;
        }
        return sorted[0]?.id ?? null;
      });
    } catch {
      setNotes([]);
      setPersistedNoteIds(new Set());
      setActiveNoteId(null);
      setStatusMessage("Load failed");
    }
  }

  function sortNotes(items: Note[]): Note[] {
    return [...items].sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return b.updatedAt - a.updatedAt;
    });
  }

  function countWords(text: string): number {
    const trimmed = text.trim();
    return trimmed ? trimmed.split(/\s+/).length : 0;
  }

  function truncate(text: string, maxLength: number): string {
    return text.length <= maxLength ? text : `${text.slice(0, maxLength)}...`;
  }

  function updateNote(id: string, patch: Partial<Note>): void {
    setNotes((prev) =>
      prev.map((note) => (note.id === id ? { ...note, ...patch } : note)),
    );
  }

  function getNoteVersion(noteId: string): number {
    return noteVersionsRef.current.get(noteId) ?? 0;
  }

  function bumpNoteVersion(noteId: string): number {
    const nextVersion = getNoteVersion(noteId) + 1;
    noteVersionsRef.current.set(noteId, nextVersion);
    return nextVersion;
  }

  function markDirty(noteId: string): void {
    bumpNoteVersion(noteId);
    setUnsavedNoteIds((prev) => {
      const next = new Set(prev);
      next.add(noteId);
      return next;
    });
  }

  function selectNote(id: string): void {
    setActiveNoteId(id);
  }

  async function createNote(): Promise<void> {
    const now = await getTimestamp();
    const note: Note = {
      id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
      title: "",
      content: "",
      pinned: false,
      createdAt: now,
      updatedAt: now,
    };

    noteVersionsRef.current.set(note.id, 0);
    setNotes((prev) => [note, ...sortNotes(prev)]);
    setActiveNoteId(note.id);
    markDirty(note.id);
    setStatusMessage("Unsaved");
    setCursorLine(1);
    setCursorCol(1);
    editorRef.current?.focus();
  }

  async function persistNote(note: Note, version: number, successMessage: string): Promise<boolean> {
    try {
      await SaveNote({
        id: note.id,
        title: note.title,
        content: note.content,
        pinned: note.pinned,
        createdAt: note.createdAt,
        updatedAt: note.updatedAt,
      });

      if (getNoteVersion(note.id) !== version) {
        return false;
      }

      setUnsavedNoteIds((prev) => {
        const next = new Set(prev);
        next.delete(note.id);
        return next;
      });
      setPersistedNoteIds((prev) => {
        const next = new Set(prev);
        next.add(note.id);
        return next;
      });
      setStatusMessage(successMessage);
      return true;
    } catch {
      setStatusMessage("Save failed");
      return false;
    }
  }

  async function saveCurrentNote(): Promise<void> {
    if (!activeNote) {
      return;
    }

    const version = getNoteVersion(activeNote.id);
    await persistNote({ ...activeNote }, version, "Saved");
  }

  async function saveAsCurrentNote(): Promise<void> {
    if (!activeNote) {
      return;
    }

    try {
      const result = (await SaveAsNote(activeNote.title || "Untitled", activeNote.content || "")) as SaveAsResult;
      if (result.success) {
        setStatusMessage("Exported");
      }
    } catch {
      setStatusMessage("Export failed");
    }
  }

  async function deleteCurrentNote(): Promise<void> {
    if (!activeNote) {
      return;
    }

    if (autosaveTimerRef.current !== null) {
      window.clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }

    try {
      if (persistedNoteIds.has(activeNote.id)) {
        await DeleteNote(activeNote.id);
      }
    } catch {
      setStatusMessage("Delete failed");
      return;
    }

    const remaining = notes.filter((note) => note.id !== activeNote.id);
    setNotes(remaining);
    setUnsavedNoteIds((prev) => {
      const next = new Set(prev);
      next.delete(activeNote.id);
      return next;
    });
    setPersistedNoteIds((prev) => {
      const next = new Set(prev);
      next.delete(activeNote.id);
      return next;
    });
    noteVersionsRef.current.delete(activeNote.id);
    setActiveNoteId(remaining[0]?.id ?? null);
    setCursorLine(1);
    setCursorCol(1);
    setStatusMessage("Deleted");
  }

  async function onTitleChange(value: string): Promise<void> {
    if (!activeNote) {
      return;
    }

    updateNote(activeNote.id, { title: value, updatedAt: Date.now() });
    markDirty(activeNote.id);
    setStatusMessage("Unsaved");
  }

  async function onBodyChange(value: string): Promise<void> {
    if (!activeNote) {
      return;
    }

    updateNote(activeNote.id, { content: value, updatedAt: Date.now() });
    markDirty(activeNote.id);
    setStatusMessage("Unsaved");
  }

  useEffect(() => {
    if (!activeNote || !unsavedNoteIds.has(activeNote.id)) {
      return undefined;
    }

    if (autosaveTimerRef.current !== null) {
      window.clearTimeout(autosaveTimerRef.current);
    }

    const snapshot = { ...activeNote };
    const version = getNoteVersion(snapshot.id);

    autosaveTimerRef.current = window.setTimeout(() => {
      autosaveTimerRef.current = null;
      if (getNoteVersion(snapshot.id) !== version) {
        return;
      }
      void persistNote(snapshot, version, "Auto-saved");
    }, 800);

    return () => {
      if (autosaveTimerRef.current !== null) {
        window.clearTimeout(autosaveTimerRef.current);
        autosaveTimerRef.current = null;
      }
    };
  }, [
    activeNote?.id,
    activeNote?.title,
    activeNote?.content,
    activeNote?.pinned,
    activeNote?.createdAt,
    activeNote?.updatedAt,
    unsavedNoteIds,
  ]);

  function updateCursorPosition(textArea: HTMLTextAreaElement): void {
    const position = textArea.selectionStart;
    const before = textArea.value.slice(0, position);
    const lines = before.split("\n");
    setCursorLine(lines.length);
    setCursorCol(lines[lines.length - 1].length + 1);
  }

  function onBodyKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>): void {
    if (event.key !== "Tab") {
      return;
    }

    event.preventDefault();
    const textArea = event.currentTarget;
    const start = textArea.selectionStart;
    const end = textArea.selectionEnd;
    const next = `${textArea.value.slice(0, start)}  ${textArea.value.slice(end)}`;
    void onBodyChange(next);
    window.requestAnimationFrame(() => {
      textArea.selectionStart = start + 2;
      textArea.selectionEnd = start + 2;
      updateCursorPosition(textArea);
    });
  }

  const dragStyle = { "--wails-draggable": "drag" } as CSSProperties;
  const noDragStyle = { "--wails-draggable": "no-drag" } as CSSProperties;

  const handleToggleMaximise = () => {
    WindowToggleMaximise();
    window.setTimeout(() => {
      WindowIsMaximised()
        .then(setIsMaximised)
        .catch(() => {
          // Ignore transient mismatch; polling will reconcile.
        });
    }, 30);
  };

  const noteCountText = `${notes.length} note${notes.length === 1 ? "" : "s"}`;
  const bodyWordCount = activeNote ? countWords(activeNote.content) : 0;
  const bodyCharCount = activeNote ? activeNote.content.length : 0;

  return (
    <div className="app-shell">
      <div className="titlebar" style={dragStyle}>
        <div className="titlebar-brand">
          <img className="titlebar-logo" src={logoUrl} alt="" aria-hidden="true" />
          <span className="titlebar-name">Notebloom</span>
          <span className="titlebar-sep">-</span>
          <span className="titlebar-note">{activeNote?.title?.trim() || "Untitled"}</span>
        </div>

        <div className="titlebar-controls" style={noDragStyle}>
          <button
            onClick={WindowMinimise}
            className="window-btn"
            aria-label="Minimize"
            title="Minimize"
          >
            <Minus className="window-icon" strokeWidth={1.9} />
          </button>
          <button
            onClick={handleToggleMaximise}
            className="window-btn"
            aria-label={isMaximised ? "Restore" : "Maximize"}
            title={isMaximised ? "Restore" : "Maximize"}
          >
            {isMaximised ? (
              <Copy className="window-icon small" strokeWidth={1.9} />
            ) : (
              <Square className="window-icon small" strokeWidth={1.9} />
            )}
          </button>
          <button onClick={Quit} className="window-btn close" aria-label="Close" title="Close">
            <X className="window-icon" strokeWidth={1.9} />
          </button>
        </div>
      </div>

      <div className="commandbar" style={noDragStyle}>
        <button className="commandbar-action primary" onClick={() => void createNote()}>
          <FilePlus className="commandbar-icon" strokeWidth={1.9} />
          <span>New</span>
        </button>
        <button className="commandbar-action" onClick={() => void saveCurrentNote()} disabled={!activeNote}>
          <Save className="commandbar-icon" strokeWidth={1.9} />
          <span>Save</span>
        </button>
        <button className="commandbar-action" onClick={() => void saveAsCurrentNote()} disabled={!activeNote}>
          <FileUp className="commandbar-icon" strokeWidth={1.9} />
          <span>Save As</span>
        </button>
        <button className="commandbar-action danger" onClick={() => void deleteCurrentNote()} disabled={!activeNote}>
          <Trash2 className="commandbar-icon" strokeWidth={1.9} />
          <span>Delete</span>
        </button>
      </div>

      <div className="content">
        <aside className="sidebar">
          <div className="sidebar-header">
            <span>Notes</span>
            {notes.length === 0 ? <span className="sidebar-inline-empty">No notes yet</span> : null}
          </div>
          <div className="note-list">
            {notes.map((note) => (
              <button
                key={note.id}
                className={`note-item${note.id === activeNoteId ? " active" : ""}`}
                onClick={() => selectNote(note.id)}
                title={note.title || "Untitled"}
              >
                <div className="note-item-title">
                  <span>{note.title || "Untitled"}</span>
                  {unsavedNoteIds.has(note.id) ? <span className="note-dot" /> : null}
                </div>
                <div className="note-item-preview">{truncate(note.content.replace(/\n/g, " "), 44)}</div>
              </button>
            ))}
          </div>
        </aside>

        <main className={`editor${activeNote ? " has-note" : " no-note"}`}>
          {activeNote ? (
            <>
              <input
                className="editor-title"
                type="text"
                placeholder="Untitled"
                value={activeNote.title}
                onChange={(event) => void onTitleChange(event.target.value)}
                autoComplete="off"
                spellCheck={false}
              />
              <textarea
                ref={editorRef}
                className="editor-body"
                placeholder="Start typing..."
                value={activeNote.content}
                onChange={(event) => {
                  void onBodyChange(event.target.value);
                  updateCursorPosition(event.currentTarget);
                }}
                onClick={(event) => updateCursorPosition(event.currentTarget)}
                onKeyUp={(event) => updateCursorPosition(event.currentTarget)}
                onSelect={(event) => updateCursorPosition(event.currentTarget)}
                onKeyDown={onBodyKeyDown}
                spellCheck
              />
            </>
          ) : (
            <div className="editor-empty">
              <div className="editor-empty-title">No note open</div>
              <div className="editor-empty-subtitle">Create a note to start writing.</div>
            </div>
          )}
        </main>
      </div>

      <footer className="status-bar">
        <span>{statusMessage}</span>
        <span>{noteCountText}</span>
        <span>{activeNote ? (unsavedNoteIds.has(activeNote.id) ? "Modified" : "Saved") : "No note open"}</span>
        <span>{activeNote ? `${bodyWordCount} words, ${bodyCharCount} chars` : "0 words, 0 chars"}</span>
        <span>Ln {cursorLine}, Col {cursorCol}</span>
      </footer>
    </div>
  );
}

export default App;
