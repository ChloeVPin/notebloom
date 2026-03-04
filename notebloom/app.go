package main

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"time"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// App struct
type App struct {
	ctx      context.Context
	notesDir string
}

// Note represents a note document
type Note struct {
	ID        string `json:"id"`
	Title     string `json:"title"`
	Content   string `json:"content"`
	Pinned    bool   `json:"pinned"`
	CreatedAt int64  `json:"createdAt"`
	UpdatedAt int64  `json:"updatedAt"`
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// startup is called when the app starts
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	
	// Get user data directory
	homeDir, err := os.UserHomeDir()
	if err != nil {
		homeDir = "."
	}
	
	a.notesDir = filepath.Join(homeDir, ".notebloom-wails", "notes")
	a.ensureNotesDir()
}

// ensureNotesDir creates the notes directory if it doesn't exist
func (a *App) ensureNotesDir() error {
	return os.MkdirAll(a.notesDir, 0755)
}

// getNoteFilePath returns the file path for a note
func (a *App) getNoteFilePath(id string) string {
	return filepath.Join(a.notesDir, fmt.Sprintf("%s.json", id))
}

// LoadNotes loads all notes from disk
func (a *App) LoadNotes() ([]Note, error) {
	a.ensureNotesDir()
	
	files, err := os.ReadDir(a.notesDir)
	if err != nil {
		return []Note{}, nil
	}
	
	notes := []Note{}
	for _, file := range files {
		if filepath.Ext(file.Name()) != ".json" {
			continue
		}
		
		data, err := os.ReadFile(filepath.Join(a.notesDir, file.Name()))
		if err != nil {
			continue
		}
		
		var note Note
		if err := json.Unmarshal(data, &note); err != nil {
			continue
		}
		
		notes = append(notes, note)
	}
	
	// Sort notes: pinned first, then by updatedAt
	sort.Slice(notes, func(i, j int) bool {
		if notes[i].Pinned && !notes[j].Pinned {
			return true
		}
		if !notes[i].Pinned && notes[j].Pinned {
			return false
		}
		return notes[i].UpdatedAt > notes[j].UpdatedAt
	})
	
	return notes, nil
}

// SaveNote saves a note to disk
func (a *App) SaveNote(note Note) error {
	a.ensureNotesDir()
	
	data, err := json.MarshalIndent(note, "", "  ")
	if err != nil {
		return err
	}
	
	return os.WriteFile(a.getNoteFilePath(note.ID), data, 0644)
}

// DeleteNote deletes a note from disk
func (a *App) DeleteNote(id string) error {
	filePath := a.getNoteFilePath(id)
	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		return nil
	}
	return os.Remove(filePath)
}

// SaveAsNote exports a note to a user-selected location
func (a *App) SaveAsNote(title, content string) (map[string]interface{}, error) {
	if title == "" {
		title = "Untitled"
	}
	
	defaultPath := fmt.Sprintf("%s.txt", title)
	
	filePath, err := runtime.SaveFileDialog(a.ctx, runtime.SaveDialogOptions{
		Title:           "Save Note As",
		DefaultFilename: defaultPath,
		Filters: []runtime.FileFilter{
			{DisplayName: "Text Files (*.txt)", Pattern: "*.txt"},
			{DisplayName: "All Files (*.*)", Pattern: "*.*"},
		},
	})
	
	if err != nil || filePath == "" {
		return map[string]interface{}{"success": false}, nil
	}
	
	if err := os.WriteFile(filePath, []byte(content), 0644); err != nil {
		return map[string]interface{}{"success": false}, err
	}
	
	return map[string]interface{}{
		"success":  true,
		"filePath": filePath,
	}, nil
}

// GetCurrentTime returns the current Unix timestamp in milliseconds
func (a *App) GetCurrentTime() int64 {
	return time.Now().UnixNano() / int64(time.Millisecond)
}
