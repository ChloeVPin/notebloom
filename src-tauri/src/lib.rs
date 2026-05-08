use std::fs;
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};

use serde::{Deserialize, Serialize};
use tauri::Manager;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Note {
    pub id: String,
    pub title: String,
    pub body: String,
    pub created_at: u64,
    pub updated_at: u64,
    pub pinned: bool,
}

fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}

fn data_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Could not resolve app data directory: {e}"))?;
    fs::create_dir_all(&dir)
        .map_err(|e| format!("Could not create app data directory: {e}"))?;
    Ok(dir)
}

fn notes_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    Ok(data_dir(app)?.join("notes.json"))
}

fn settings_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    Ok(data_dir(app)?.join("settings.json"))
}

fn load_notes(path: &PathBuf) -> Vec<Note> {
    fs::read_to_string(path)
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

fn save_notes(path: &PathBuf, notes: &[Note]) -> Result<(), String> {
    let json = serde_json::to_string_pretty(notes)
        .map_err(|e| format!("Serialization error: {e}"))?;
    fs::write(path, json).map_err(|e| format!("Write error: {e}"))
}

fn sorted(mut notes: Vec<Note>) -> Vec<Note> {
    notes.sort_by(|a, b| {
        b.pinned
            .cmp(&a.pinned)
            .then(b.updated_at.cmp(&a.updated_at))
    });
    notes
}

#[tauri::command]
fn list_notes(app: tauri::AppHandle) -> Result<Vec<Note>, String> {
    let path = notes_path(&app)?;
    Ok(sorted(load_notes(&path)))
}

#[tauri::command]
fn create_note(app: tauri::AppHandle, title: String, body: String) -> Result<Note, String> {
    let path = notes_path(&app)?;
    let mut notes = load_notes(&path);
    let now = now_ms();
    let note = Note {
        id: Uuid::new_v4().to_string(),
        title,
        body,
        created_at: now,
        updated_at: now,
        pinned: false,
    };
    notes.push(note.clone());
    save_notes(&path, &notes)?;
    Ok(note)
}

#[tauri::command]
fn update_note(
    app: tauri::AppHandle,
    id: String,
    title: String,
    body: String,
) -> Result<Note, String> {
    let path = notes_path(&app)?;
    let mut notes = load_notes(&path);
    let note = notes
        .iter_mut()
        .find(|n| n.id == id)
        .ok_or_else(|| format!("Note {id} not found"))?;
    note.title = title;
    note.body = body;
    note.updated_at = now_ms();
    let updated = note.clone();
    save_notes(&path, &notes)?;
    Ok(updated)
}

#[tauri::command]
fn delete_note(app: tauri::AppHandle, id: String) -> Result<(), String> {
    let path = notes_path(&app)?;
    let mut notes = load_notes(&path);
    let before = notes.len();
    notes.retain(|n| n.id != id);
    if notes.len() == before {
        return Err(format!("Note {id} not found"));
    }
    save_notes(&path, &notes)
}

#[tauri::command]
fn toggle_pin(app: tauri::AppHandle, id: String) -> Result<Note, String> {
    let path = notes_path(&app)?;
    let mut notes = load_notes(&path);
    let note = notes
        .iter_mut()
        .find(|n| n.id == id)
        .ok_or_else(|| format!("Note {id} not found"))?;
    note.pinned = !note.pinned;
    note.updated_at = now_ms();
    let updated = note.clone();
    save_notes(&path, &notes)?;
    Ok(updated)
}

#[tauri::command]
fn duplicate_note(app: tauri::AppHandle, id: String) -> Result<Note, String> {
    let path = notes_path(&app)?;
    let mut notes = load_notes(&path);
    let source = notes
        .iter()
        .find(|n| n.id == id)
        .ok_or_else(|| format!("Note {id} not found"))?
        .clone();
    let now = now_ms();
    let copy = Note {
        id: Uuid::new_v4().to_string(),
        title: if source.title.is_empty() {
            String::new()
        } else {
            format!("{} (copy)", source.title)
        },
        body: source.body.clone(),
        created_at: now,
        updated_at: now,
        pinned: false,
    };
    notes.push(copy.clone());
    save_notes(&path, &notes)?;
    Ok(copy)
}

#[tauri::command]
fn get_settings(app: tauri::AppHandle) -> Result<String, String> {
    let path = settings_path(&app)?;
    Ok(fs::read_to_string(path).unwrap_or_else(|_| "{}".to_string()))
}

#[tauri::command]
fn save_settings(app: tauri::AppHandle, json: String) -> Result<(), String> {
    let path = settings_path(&app)?;
    fs::write(path, json).map_err(|e| format!("Write error: {e}"))
}

#[tauri::command]
fn wipe_all_data(app: tauri::AppHandle) -> Result<(), String> {
    let dir = data_dir(&app)?;
    for file in ["notes.json", "settings.json"] {
        let path = dir.join(file);
        if path.exists() {
            fs::remove_file(&path).map_err(|e| format!("Delete error: {e}"))?;
        }
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            list_notes,
            create_note,
            update_note,
            delete_note,
            toggle_pin,
            duplicate_note,
            get_settings,
            save_settings,
            wipe_all_data,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
