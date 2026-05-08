import { invoke } from "@tauri-apps/api/core";

export interface Note {
  id: string;
  title: string;
  body: string;
  created_at: number;
  updated_at: number;
  pinned: boolean;
}

export const notesApi = {
  list: (): Promise<Note[]> => invoke("list_notes"),
  create: (title: string, body: string): Promise<Note> =>
    invoke("create_note", { title, body }),
  update: (id: string, title: string, body: string): Promise<Note> =>
    invoke("update_note", { id, title, body }),
  delete: (id: string): Promise<void> => invoke("delete_note", { id }),
  togglePin: (id: string): Promise<Note> => invoke("toggle_pin", { id }),
  duplicate: (id: string): Promise<Note> => invoke("duplicate_note", { id }),
};

export const settingsApi = {
  load: async (): Promise<Record<string, unknown>> => {
    try {
      const json: string = await invoke("get_settings");
      return JSON.parse(json);
    } catch {
      return {};
    }
  },
  save: (data: Record<string, unknown>): Promise<void> =>
    invoke("save_settings", { json: JSON.stringify(data) }),
  wipeAll: (): Promise<void> => invoke("wipe_all_data"),
};

// ─── Draft cache (localStorage) ───────────────────────────────────────────────
// Keeps unsaved edits alive across crashes / accidental closes.

const DRAFT_PREFIX = "notebloom-draft-";

export interface Draft {
  title: string;
  body: string;
}

export const draftCache = {
  get: (id: string): Draft | null => {
    try {
      const raw = localStorage.getItem(DRAFT_PREFIX + id);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },
  set: (id: string, draft: Draft) => {
    localStorage.setItem(DRAFT_PREFIX + id, JSON.stringify(draft));
  },
  clear: (id: string) => {
    localStorage.removeItem(DRAFT_PREFIX + id);
  },
  clearAll: () => {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(DRAFT_PREFIX))
      .forEach((k) => localStorage.removeItem(k));
  },
};

export function formatRelativeTime(ms: number): string {
  const now = Date.now();
  const diff = now - ms;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 10) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  return new Date(ms).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}
