package main

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func newTestApp(t *testing.T) *App {
	t.Helper()

	dir := t.TempDir()
	app := &App{notesDir: filepath.Join(dir, "notes")}
	if err := app.ensureNotesDir(); err != nil {
		t.Fatalf("ensureNotesDir() error = %v", err)
	}
	return app
}

func TestSaveNoteAndLoadNotes(t *testing.T) {
	app := newTestApp(t)

	note := Note{
		ID:        "note-1",
		Title:     "Hello",
		Content:   "One two three",
		Pinned:    true,
		CreatedAt: 1000,
		UpdatedAt: 2000,
	}

	if err := app.SaveNote(note); err != nil {
		t.Fatalf("SaveNote() error = %v", err)
	}

	loaded, err := app.LoadNotes()
	if err != nil {
		t.Fatalf("LoadNotes() error = %v", err)
	}
	if len(loaded) != 1 {
		t.Fatalf("LoadNotes() length = %d, want 1", len(loaded))
	}

	got := loaded[0]
	if got.ID != note.ID || got.Title != note.Title || got.Content != note.Content || !got.Pinned {
		t.Fatalf("LoadNotes() returned %+v, want %+v", got, note)
	}
}

func TestSaveNoteOverwritesExistingContent(t *testing.T) {
	app := newTestApp(t)

	initial := Note{
		ID:        "note-1",
		Title:     "Old",
		Content:   "first version",
		CreatedAt: 1000,
		UpdatedAt: 2000,
	}
	updated := Note{
		ID:        "note-1",
		Title:     "New",
		Content:   "second version",
		CreatedAt: 1000,
		UpdatedAt: 3000,
	}

	if err := app.SaveNote(initial); err != nil {
		t.Fatalf("initial SaveNote() error = %v", err)
	}
	if err := app.SaveNote(updated); err != nil {
		t.Fatalf("updated SaveNote() error = %v", err)
	}

	data, err := os.ReadFile(app.getNoteFilePath(updated.ID))
	if err != nil {
		t.Fatalf("ReadFile() error = %v", err)
	}
	if !strings.Contains(string(data), `"title": "New"`) {
		t.Fatalf("saved file does not contain updated title: %s", string(data))
	}
	if !strings.Contains(string(data), `"content": "second version"`) {
		t.Fatalf("saved file does not contain updated content: %s", string(data))
	}
}

func TestLoadNotesSkipsInvalidFiles(t *testing.T) {
	app := newTestApp(t)

	valid := Note{
		ID:        "valid-note",
		Title:     "Valid",
		Content:   "This should load",
		CreatedAt: 111,
		UpdatedAt: 222,
	}
	if err := app.SaveNote(valid); err != nil {
		t.Fatalf("SaveNote() error = %v", err)
	}

	if err := os.WriteFile(filepath.Join(app.notesDir, "broken.json"), []byte("{not json"), 0644); err != nil {
		t.Fatalf("WriteFile() error = %v", err)
	}
	if err := os.WriteFile(filepath.Join(app.notesDir, "ignore.txt"), []byte("skip"), 0644); err != nil {
		t.Fatalf("WriteFile() error = %v", err)
	}

	loaded, err := app.LoadNotes()
	if err != nil {
		t.Fatalf("LoadNotes() error = %v", err)
	}
	if len(loaded) != 1 {
		t.Fatalf("LoadNotes() length = %d, want 1", len(loaded))
	}
	if loaded[0].ID != valid.ID {
		t.Fatalf("LoadNotes() returned %+v, want note %q", loaded[0], valid.ID)
	}
}
