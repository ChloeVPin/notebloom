import './style.css'
import { LoadNotes, SaveNote, DeleteNote, SaveAsNote, GetCurrentTime } from '../wailsjs/go/main/App'

// State
let notes = [];
let activeNoteId = null;
let unsavedNoteIds = new Set();
let contextMenuNoteId = null;

// DOM Elements
const noteListEl = document.getElementById('note-list');
const sidebarEmptyEl = document.getElementById('sidebar-empty');
const editorPlaceholderEl = document.getElementById('editor-placeholder');
const editorContentEl = document.getElementById('editor-content');
const editorTitleEl = document.getElementById('editor-title');
const editorBodyEl = document.getElementById('editor-body');
const editorStatusEl = document.getElementById('editor-status');
const editorWordcountEl = document.getElementById('editor-wordcount');
const btnNew = document.getElementById('btn-new');
const btnDelete = document.getElementById('btn-delete');
const btnSave = document.getElementById('btn-save');
const btnSaveAs = document.getElementById('btn-save-as');
const contextMenuEl = document.getElementById('context-menu');
const ctxPin = document.getElementById('ctx-pin');
const ctxSaveAs = document.getElementById('ctx-save-as');
const ctxDelete = document.getElementById('ctx-delete');

// ===== Helpers =====

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function formatDate(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  if (isToday) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }

  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function truncate(str, len) {
  if (!str) return '';
  return str.length > len ? str.slice(0, len) + '...' : str;
}

function countWords(str) {
  if (!str || !str.trim()) return 0;
  return str.trim().split(/\s+/).length;
}

function sortNotes() {
  notes.sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return b.updatedAt - a.updatedAt;
  });
}

// ===== Rendering =====

function renderNoteList() {
  noteListEl.innerHTML = '';

  if (notes.length === 0) {
    sidebarEmptyEl.style.display = '';
    noteListEl.style.display = 'none';
    return;
  }

  sidebarEmptyEl.style.display = 'none';
  noteListEl.style.display = '';

  for (const note of notes) {
    const item = document.createElement('div');
    item.className = 'note-item' + (note.id === activeNoteId ? ' active' : '');
    item.dataset.id = note.id;

    const title = note.title || 'Untitled';
    const preview = note.content ? truncate(note.content.replace(/\n/g, ' '), 60) : 'Empty note';
    const isUnsaved = unsavedNoteIds.has(note.id);

    const pinHtml = note.pinned ? '<span class="note-item-pin">&#x1F4CC;</span>' : '';
    const unsavedHtml = isUnsaved ? '<span class="note-item-unsaved"></span>' : '';

    item.innerHTML = `
      <div class="note-item-title">${pinHtml}<span>${escapeHtml(title)}</span>${unsavedHtml}</div>
      <div class="note-item-preview">${escapeHtml(preview)}</div>
      <div class="note-item-date">${formatDate(note.updatedAt)}</div>
    `;

    item.addEventListener('click', () => selectNote(note.id));
    item.addEventListener('contextmenu', (e) => showContextMenu(e, note.id));
    noteListEl.appendChild(item);
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function showEditor(show) {
  editorPlaceholderEl.style.display = show ? 'none' : '';
  editorContentEl.style.display = show ? '' : 'none';
  if (!show) {
    btnSave.classList.remove('visible');
    btnSaveAs.classList.remove('visible');
  }
}

function renderEditor() {
  const note = notes.find(n => n.id === activeNoteId);
  if (!note) {
    showEditor(false);
    return;
  }

  showEditor(true);
  editorTitleEl.value = note.title || '';
  editorBodyEl.value = note.content || '';
  editorStatusEl.textContent = '';
  editorStatusEl.className = 'editor-status';
  updateWordCount();
  updateSaveButtons();
}

function updateWordCount() {
  const text = editorBodyEl.value;
  const words = countWords(text);
  const chars = text.length;
  editorWordcountEl.textContent = words === 0 ? '' : `${words} word${words !== 1 ? 's' : ''} · ${chars} char${chars !== 1 ? 's' : ''}`;
}

function updateSaveButtons() {
  const isUnsaved = unsavedNoteIds.has(activeNoteId);
  if (isUnsaved) {
    btnSave.classList.add('visible');
    btnSaveAs.classList.add('visible');
  } else {
    btnSave.classList.remove('visible');
    btnSaveAs.classList.add('visible');
  }
}

// ===== Context Menu =====

function showContextMenu(e, noteId) {
  e.preventDefault();
  e.stopPropagation();
  contextMenuNoteId = noteId;

  const note = notes.find(n => n.id === noteId);
  if (!note) return;

  ctxPin.textContent = note.pinned ? 'Unpin' : 'Pin to Top';

  contextMenuEl.classList.add('show');

  const menuW = contextMenuEl.offsetWidth;
  const menuH = contextMenuEl.offsetHeight;
  let x = e.clientX;
  let y = e.clientY;

  if (x + menuW > window.innerWidth) x = window.innerWidth - menuW - 8;
  if (y + menuH > window.innerHeight) y = window.innerHeight - menuH - 8;

  contextMenuEl.style.left = x + 'px';
  contextMenuEl.style.top = y + 'px';
}

function hideContextMenu() {
  contextMenuEl.classList.remove('show');
  contextMenuNoteId = null;
}

// ===== Actions =====

async function loadNotes() {
  notes = await LoadNotes();
  renderNoteList();

  if (activeNoteId) {
    const exists = notes.find(n => n.id === activeNoteId);
    if (!exists) {
      activeNoteId = null;
      showEditor(false);
    }
  }
}

function selectNote(id) {
  if (id === activeNoteId) return;

  // If switching away from an unsaved note, discard it
  if (activeNoteId && unsavedNoteIds.has(activeNoteId)) {
    discardUnsavedNote(activeNoteId);
  }

  activeNoteId = id;
  renderNoteList();
  renderEditor();
  editorTitleEl.focus();
}

async function createNote() {
  // If current note is unsaved, discard it
  if (activeNoteId && unsavedNoteIds.has(activeNoteId)) {
    discardUnsavedNote(activeNoteId);
  }

  const currentTime = await GetCurrentTime();
  const note = {
    id: generateId(),
    title: '',
    content: '',
    pinned: false,
    createdAt: currentTime,
    updatedAt: currentTime
  };

  // Don't persist yet — it's a draft until saved
  notes.unshift(note);
  unsavedNoteIds.add(note.id);
  activeNoteId = note.id;
  sortNotes();
  renderNoteList();
  renderEditor();
  editorTitleEl.focus();
}

function discardUnsavedNote(id) {
  unsavedNoteIds.delete(id);
  const note = notes.find(n => n.id === id);
  if (note && note._persisted) {
    // Reload from disk on next load
  } else {
    // Never saved — remove from list entirely
    notes = notes.filter(n => n.id !== id);
  }
  if (activeNoteId === id) {
    activeNoteId = null;
    showEditor(false);
  }
}

async function saveCurrentNote() {
  const note = notes.find(n => n.id === activeNoteId);
  if (!note) return;

  const currentTime = await GetCurrentTime();
  note.title = editorTitleEl.value;
  note.content = editorBodyEl.value;
  note.updatedAt = currentTime;
  note._persisted = true;

  await SaveNote({
    id: note.id,
    title: note.title,
    content: note.content,
    pinned: note.pinned || false,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt
  });

  unsavedNoteIds.delete(note.id);
  sortNotes();
  renderNoteList();
  updateSaveButtons();

  editorStatusEl.textContent = 'Saved';
  editorStatusEl.className = 'editor-status saved';
  setTimeout(() => {
    if (editorStatusEl.textContent === 'Saved') {
      editorStatusEl.textContent = '';
      editorStatusEl.className = 'editor-status';
    }
  }, 2000);
}

async function saveNoteById(id) {
  const note = notes.find(n => n.id === id);
  if (!note) return;

  note._persisted = true;
  await SaveNote({
    id: note.id,
    title: note.title,
    content: note.content,
    pinned: note.pinned || false,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt
  });

  unsavedNoteIds.delete(note.id);
  renderNoteList();
  if (id === activeNoteId) updateSaveButtons();
}

async function saveAsNote(noteId) {
  const note = notes.find(n => n.id === (noteId || activeNoteId));
  if (!note) return;

  // Sync editor values if this is the active note
  if (note.id === activeNoteId) {
    note.title = editorTitleEl.value;
    note.content = editorBodyEl.value;
  }

  const result = await SaveAsNote(note.title || 'Untitled', note.content || '');

  if (result.success) {
    editorStatusEl.textContent = 'Exported';
    editorStatusEl.className = 'editor-status saved';
    setTimeout(() => {
      if (editorStatusEl.textContent === 'Exported') {
        editorStatusEl.textContent = '';
        editorStatusEl.className = 'editor-status';
      }
    }, 2000);
  }
}

async function deleteNote(id) {
  const note = notes.find(n => n.id === id);
  if (!note) return;

  if (note._persisted) {
    await DeleteNote(id);
  }

  unsavedNoteIds.delete(id);
  notes = notes.filter(n => n.id !== id);

  if (activeNoteId === id) {
    activeNoteId = null;
    showEditor(false);
  }

  renderNoteList();
}

async function togglePin(id) {
  const note = notes.find(n => n.id === id);
  if (!note) return;

  note.pinned = !note.pinned;

  if (note._persisted) {
    await SaveNote({
      id: note.id,
      title: note.title,
      content: note.content,
      pinned: note.pinned,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt
    });
  }

  sortNotes();
  renderNoteList();
}

// ===== Input Handling =====

async function onEditorInput() {
  const note = notes.find(n => n.id === activeNoteId);
  if (!note) return;

  const currentTime = await GetCurrentTime();
  note.title = editorTitleEl.value;
  note.content = editorBodyEl.value;
  note.updatedAt = currentTime;

  if (!unsavedNoteIds.has(note.id)) {
    unsavedNoteIds.add(note.id);
  }

  updateWordCount();
  updateSaveButtons();
  renderNoteList();

  editorStatusEl.textContent = 'Unsaved';
  editorStatusEl.className = 'editor-status';
}

// ===== Event Listeners =====

btnNew.addEventListener('click', createNote);

btnDelete.addEventListener('click', () => {
  if (activeNoteId) deleteNote(activeNoteId);
});

btnSave.addEventListener('click', saveCurrentNote);

btnSaveAs.addEventListener('click', () => saveAsNote());

editorTitleEl.addEventListener('input', onEditorInput);
editorBodyEl.addEventListener('input', onEditorInput);

// Tab key inserts spaces in the editor
editorBodyEl.addEventListener('keydown', (e) => {
  if (e.key === 'Tab') {
    e.preventDefault();
    const start = editorBodyEl.selectionStart;
    const end = editorBodyEl.selectionEnd;
    editorBodyEl.value = editorBodyEl.value.substring(0, start) + '  ' + editorBodyEl.value.substring(end);
    editorBodyEl.selectionStart = editorBodyEl.selectionEnd = start + 2;
    onEditorInput();
  }
});

// Ctrl+S to save
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    if (activeNoteId) {
      if (e.shiftKey) {
        saveAsNote();
      } else {
        saveCurrentNote();
      }
    }
  }
});

// Context menu actions
ctxPin.addEventListener('click', () => {
  if (contextMenuNoteId) togglePin(contextMenuNoteId);
  hideContextMenu();
});

ctxSaveAs.addEventListener('click', () => {
  if (contextMenuNoteId) saveAsNote(contextMenuNoteId);
  hideContextMenu();
});

ctxDelete.addEventListener('click', () => {
  if (contextMenuNoteId) deleteNote(contextMenuNoteId);
  hideContextMenu();
});

// Hide context menu on click elsewhere
document.addEventListener('click', () => hideContextMenu());
document.addEventListener('contextmenu', (e) => {
  if (!e.target.closest('.note-item')) {
    hideContextMenu();
  }
});

// ===== Init =====

(async () => {
  notes = await LoadNotes();
  // Mark loaded notes as persisted
  for (const note of notes) {
    note._persisted = true;
  }
  renderNoteList();
})();
