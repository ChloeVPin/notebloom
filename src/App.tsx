import { useCallback, useEffect, useRef, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { save } from "@tauri-apps/plugin-dialog";
import { writeTextFile } from "@tauri-apps/plugin-fs";
import { Note, formatRelativeTime, notesApi, settingsApi, draftCache } from "./lib/notes";
import { cn } from "./lib/utils";
import { Button } from "./components/ui/button";
import { ScrollArea } from "./components/ui/scroll-area";
import { Skeleton } from "./components/ui/skeleton";
import { Separator } from "./components/ui/separator";
import { Switch } from "./components/ui/switch";
import { Label } from "./components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "./components/ui/popover";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./components/ui/tooltip";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuTrigger,
} from "./components/ui/context-menu";

const appWindow = getCurrentWindow();

// ─── Platform ─────────────────────────────────────────────────────────────────

const isMac = navigator.platform.toUpperCase().includes("MAC");
const modKey = isMac ? "⌘" : "Ctrl+";

// ─── Settings ─────────────────────────────────────────────────────────────────

interface AppSettings {
  // Titlebar
  showThemeToggle: boolean;
  showWindowControls: boolean;
  showLogoAndName: boolean;
  // Editor toolbar
  showPinButton: boolean;
  showTrashButton: boolean;
  // Editor behaviour
  spellCheck: boolean;
  // Context menu items
  ctxSave: boolean;
  ctxSaveAs: boolean;
  ctxDuplicate: boolean;
  ctxCopyText: boolean;
  ctxPin: boolean;
  ctxDelete: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
  showThemeToggle: true,
  showWindowControls: true,
  showLogoAndName: true,
  showPinButton: true,
  showTrashButton: true,
  spellCheck: true,
  ctxSave: true,
  ctxSaveAs: true,
  ctxDuplicate: true,
  ctxCopyText: true,
  ctxPin: true,
  ctxDelete: true,
};

async function loadSettings(): Promise<AppSettings> {
  const stored = await settingsApi.load();
  return { ...DEFAULT_SETTINGS, ...stored } as AppSettings;
}

// ─── Window controls ──────────────────────────────────────────────────────────

function MacControls() {
  return (
    <div
      className="flex items-center gap-[7px]"
      style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
    >
      <button onClick={() => appWindow.close()} aria-label="Close"
        className="group size-3 rounded-full bg-[#FF5F57] focus-visible:outline-none flex items-center justify-center">
        <svg className="opacity-0 group-hover:opacity-100 size-[7px]" viewBox="0 0 10 10" fill="none" stroke="rgba(0,0,0,0.5)" strokeWidth="1.6" strokeLinecap="round">
          <line x1="2" y1="2" x2="8" y2="8" /><line x1="8" y1="2" x2="2" y2="8" />
        </svg>
      </button>
      <button onClick={() => appWindow.minimize()} aria-label="Minimize"
        className="group size-3 rounded-full bg-[#FEBC2E] focus-visible:outline-none flex items-center justify-center">
        <svg className="opacity-0 group-hover:opacity-100 size-[7px]" viewBox="0 0 10 10" fill="none" stroke="rgba(0,0,0,0.5)" strokeWidth="1.6" strokeLinecap="round">
          <line x1="2" y1="5" x2="8" y2="5" />
        </svg>
      </button>
      <button onClick={() => appWindow.toggleMaximize()} aria-label="Zoom"
        className="group size-3 rounded-full bg-[#28C840] focus-visible:outline-none flex items-center justify-center">
        <svg className="opacity-0 group-hover:opacity-100 size-[7px]" viewBox="0 0 10 10" fill="none" stroke="rgba(0,0,0,0.5)" strokeWidth="1.6" strokeLinecap="round">
          <line x1="5" y1="2" x2="5" y2="8" /><line x1="2" y1="5" x2="8" y2="5" />
        </svg>
      </button>
    </div>
  );
}

function Win11Controls() {
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    let mounted = true;
    let unlisten: (() => void) | null = null;
    appWindow.isMaximized().then((m) => { if (mounted) setMaximized(m); }).catch(() => {});
    appWindow.onResized(() => {
      appWindow.isMaximized().then((m) => { if (mounted) setMaximized(m); }).catch(() => {});
    }).then((f) => {
      unlisten = f;
      if (!mounted) unlisten();
    });
    return () => { mounted = false; unlisten?.(); };
  }, []);

  const btnBase = "h-full w-[46px] flex items-center justify-center transition-colors duration-100 focus-visible:outline-none";

  return (
    <div className="flex items-stretch h-full" style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}>
      <button onClick={() => appWindow.minimize()} aria-label="Minimize"
        className={cn(btnBase, "text-foreground/60 hover:bg-black/[0.07] dark:hover:bg-white/[0.08] hover:text-foreground")}>
        <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter">
          <path d="M 4 10 L 16 10" />
        </svg>
      </button>
      <button onClick={() => appWindow.toggleMaximize()} aria-label={maximized ? "Restore" : "Maximize"}
        className={cn(btnBase, "text-foreground/60 hover:bg-black/[0.07] dark:hover:bg-white/[0.08] hover:text-foreground")}>
        <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter">
          <rect x="3.5" y="3.5" width="13" height="13" />
        </svg>
      </button>
      <button onClick={() => appWindow.close()} aria-label="Close"
        className={cn(btnBase, "text-foreground/60 hover:bg-[#c42b1c] hover:text-white dark:hover:bg-[#c42b1c] dark:hover:text-white")}>
        <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="square" strokeLinejoin="miter">
          <path d="M 5 5 L 15 15 M 15 5 L 5 15" />
        </svg>
      </button>
    </div>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function IconCompose({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
    </svg>
  );
}

function IconPin({ className, filled }: { className?: string; filled?: boolean }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="17" x2="12" y2="22" />
      <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z" />
    </svg>
  );
}

function IconTrash({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}

function IconMoon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function IconSun({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4.5" />
      <line x1="12" y1="2" x2="12" y2="4" /><line x1="12" y1="20" x2="12" y2="22" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="2" y1="12" x2="4" y2="12" /><line x1="20" y1="12" x2="22" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

function IconCopy({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function IconSettings({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

// ─── Settings panel ───────────────────────────────────────────────────────────

function SettingRow({ label, id, checked, onCheckedChange }: {
  label: string; id: string; checked: boolean; onCheckedChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-[7px]">
      <Label htmlFor={id} className="text-[13px] text-foreground/75 cursor-pointer select-none">
        {label}
      </Label>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} className="scale-90" />
    </div>
  );
}

function SettingsSection({ title }: { title: string }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-[0.09em] text-muted-foreground/45 mt-4 mb-1 first:mt-0">
      {title}
    </p>
  );
}

interface SettingsPanelProps {
  settings: AppSettings;
  onChange: (patch: Partial<AppSettings>) => void;
  onWipe: () => void;
}

function SettingsPanel({ settings, onChange, onWipe }: SettingsPanelProps) {
  const [confirmWipe, setConfirmWipe] = useState(false);

  return (
    <div className="flex flex-col">
      <p className="text-[13px] font-semibold text-foreground mb-3">Settings</p>

      <SettingsSection title="Interface" />
      <Separator className="opacity-30 mb-1" />
      <SettingRow label="App logo & name" id="showLogoAndName" checked={settings.showLogoAndName} onCheckedChange={(v) => onChange({ showLogoAndName: v })} />
      <SettingRow label="Theme toggle" id="showThemeToggle" checked={settings.showThemeToggle} onCheckedChange={(v) => onChange({ showThemeToggle: v })} />
      <SettingRow label="Window controls" id="showWindowControls" checked={settings.showWindowControls} onCheckedChange={(v) => onChange({ showWindowControls: v })} />
      <SettingRow label="Pin button" id="showPinButton" checked={settings.showPinButton} onCheckedChange={(v) => onChange({ showPinButton: v })} />
      <SettingRow label="Delete button" id="showTrashButton" checked={settings.showTrashButton} onCheckedChange={(v) => onChange({ showTrashButton: v })} />

      <SettingsSection title="Editor" />
      <Separator className="opacity-30 mb-1" />
      <SettingRow label="Spell check" id="spellCheck" checked={settings.spellCheck} onCheckedChange={(v) => onChange({ spellCheck: v })} />

      <SettingsSection title="Right-click menu" />
      <Separator className="opacity-30 mb-1" />
      <SettingRow label="Save" id="ctxSave" checked={settings.ctxSave} onCheckedChange={(v) => onChange({ ctxSave: v })} />
      <SettingRow label="Save as" id="ctxSaveAs" checked={settings.ctxSaveAs} onCheckedChange={(v) => onChange({ ctxSaveAs: v })} />
      <SettingRow label="Duplicate" id="ctxDuplicate" checked={settings.ctxDuplicate} onCheckedChange={(v) => onChange({ ctxDuplicate: v })} />
      <SettingRow label="Copy text" id="ctxCopyText" checked={settings.ctxCopyText} onCheckedChange={(v) => onChange({ ctxCopyText: v })} />
      <SettingRow label="Pin / Unpin" id="ctxPin" checked={settings.ctxPin} onCheckedChange={(v) => onChange({ ctxPin: v })} />
      <SettingRow label="Delete" id="ctxDelete" checked={settings.ctxDelete} onCheckedChange={(v) => onChange({ ctxDelete: v })} />

      {/* Danger zone */}
      <Separator className="opacity-20 mt-4 mb-3" />
      {confirmWipe ? (
        <div className="flex flex-col gap-2">
          <p className="text-[11.5px] text-muted-foreground/70 leading-snug">
            This will delete all notes and reset settings. This cannot be undone.
          </p>
          <div className="flex gap-2">
            <Button size="sm" variant="outline"
              className="flex-1 h-7 text-[12px] rounded-lg"
              onClick={() => setConfirmWipe(false)}>
              Cancel
            </Button>
            <Button size="sm"
              className="flex-1 h-7 text-[12px] rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { setConfirmWipe(false); onWipe(); }}>
              Confirm wipe
            </Button>
          </div>
        </div>
      ) : (
        <Button size="sm" variant="ghost"
          className="h-7 text-[12px] rounded-lg text-destructive/70 hover:text-destructive hover:bg-destructive/8 w-full"
          onClick={() => setConfirmWipe(true)}>
          Wipe all data
        </Button>
      )}
    </div>
  );
}

// ─── Note list item ───────────────────────────────────────────────────────────

interface NoteItemProps {
  note: Note;
  isActive: boolean;
  settings: AppSettings;
  onOpen: () => void;
  onSave: () => void;
  onSaveAs: () => void;
  onDuplicate: () => void;
  onCopyText: () => void;
  onPin: () => void;
  onDelete: () => void;
}

function NoteItem({ note, isActive, settings, onOpen, onSave, onSaveAs, onDuplicate, onCopyText, onPin, onDelete }: NoteItemProps) {
  const preview = note.body.replace(/\n+/g, " ").trim();

  const hasSaveGroup = settings.ctxSave || settings.ctxSaveAs || settings.ctxDuplicate || settings.ctxCopyText;
  const hasPinGroup = settings.ctxPin;
  const hasDeleteGroup = settings.ctxDelete;

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <button
          onClick={onOpen}
          className={cn(
            "w-full text-left px-3 py-[10px] rounded-[11px] transition-colors duration-100",
            "hover:bg-black/[0.04] dark:hover:bg-white/[0.05]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
            isActive && "bg-black/[0.06] dark:bg-white/[0.08]"
          )}
        >
          <div className="flex items-start gap-2">
            {note.pinned && (
              <IconPin className="size-3 shrink-0 text-muted-foreground/50 mt-[3px]" filled />
            )}
            <div className="flex-1 min-w-0">
              <p className={cn(
                "text-[13px] font-medium truncate leading-[1.3] mb-[3px]",
                isActive ? "text-foreground" : "text-foreground/80"
              )}>
                {note.title || (
                  <span className="text-muted-foreground/40 font-normal italic text-[12.5px]">Untitled</span>
                )}
              </p>
              <div className="flex items-baseline gap-2">
                <p className="text-[11.5px] text-muted-foreground/55 truncate flex-1 min-w-0 leading-relaxed">
                  {preview || "No content yet"}
                </p>
                <span className="text-[10px] text-muted-foreground/35 shrink-0 tabular-nums">
                  {formatRelativeTime(note.updated_at)}
                </span>
              </div>
            </div>
          </div>
        </button>
      </ContextMenuTrigger>

      <ContextMenuContent className="w-52">
        <ContextMenuItem onSelect={onOpen}>Open note</ContextMenuItem>

        {hasSaveGroup && <ContextMenuSeparator />}
        {settings.ctxSave && (
          <ContextMenuItem onSelect={onSave}>
            Save <ContextMenuShortcut>{modKey}S</ContextMenuShortcut>
          </ContextMenuItem>
        )}
        {settings.ctxSaveAs && (
          <ContextMenuItem onSelect={onSaveAs}>Save as</ContextMenuItem>
        )}
        {settings.ctxDuplicate && (
          <ContextMenuItem onSelect={onDuplicate} className="gap-2">
            <IconCopy className="size-3.5 text-muted-foreground/60" /> Duplicate
          </ContextMenuItem>
        )}
        {settings.ctxCopyText && (
          <ContextMenuItem onSelect={onCopyText}>Copy text</ContextMenuItem>
        )}

        {hasPinGroup && <ContextMenuSeparator />}
        {settings.ctxPin && (
          <ContextMenuItem onSelect={onPin} className="gap-2">
            <IconPin className="size-3.5 text-muted-foreground/60" filled={note.pinned} />
            {note.pinned ? "Unpin" : "Pin to top"}
            <ContextMenuShortcut>{modKey}P</ContextMenuShortcut>
          </ContextMenuItem>
        )}

        {hasDeleteGroup && <ContextMenuSeparator />}
        {settings.ctxDelete && (
          <ContextMenuItem onSelect={onDelete} variant="destructive" className="gap-2">
            <IconTrash className="size-3.5" /> Delete note
            <ContextMenuShortcut>{modKey}⌫</ContextMenuShortcut>
          </ContextMenuItem>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}

// ─── Empty states ─────────────────────────────────────────────────────────────

function EmptyEditor({ onNew }: { onNew: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 px-8 select-none">
      <img src="/logo.png" alt="" className="size-10 object-contain opacity-10" draggable={false} />
      <p className="text-xs text-muted-foreground/40">No note selected</p>
      <Button variant="outline" size="sm" onClick={onNew}
        className="text-xs h-8 px-4 rounded-lg border-border/40 hover:bg-accent/50">
        Create note
      </Button>
    </div>
  );
}

function EmptySidebar({ onNew }: { onNew: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-2 px-4 py-8 select-none">
      <p className="text-[11px] font-medium text-muted-foreground/40">No notes yet</p>
      <button onClick={onNew} className="text-[11px] text-muted-foreground/45 hover:text-muted-foreground/70 transition-colors">
        Write your first note →
      </button>
    </div>
  );
}

// ─── Saved indicator ──────────────────────────────────────────────────────────

function SavedIndicator({ savedAt, saving }: { savedAt: number | null; saving: boolean }) {
  const text = saving ? "Saving…" : savedAt ? `Edited ${formatRelativeTime(savedAt)}` : "";
  return (
    <span className={cn(
      "text-[11px] text-muted-foreground/40 transition-opacity duration-500",
      !text && "opacity-0 pointer-events-none"
    )}>
      {text || "​"}
    </span>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(() =>
    localStorage.getItem("notebloom-last-note")
  );
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [dark, setDark] = useState(() => {
    const stored = localStorage.getItem("notebloom-theme");
    if (stored) return stored === "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const selectedNote = notes.find((n) => n.id === selectedId) ?? null;

  // Load settings from disk on mount
  useEffect(() => {
    loadSettings().then(setSettings).catch(() => {});
  }, []);

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      settingsApi.save(next as unknown as Record<string, unknown>).catch(() => {});
      return next;
    });
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("notebloom-theme", dark ? "dark" : "light");
  }, [dark]);

  useEffect(() => {
    notesApi.list()
      .then((ns) => {
        setNotes(ns);
        if (selectedId) {
          const note = ns.find((n) => n.id === selectedId);
          if (note) {
            const draft = draftCache.get(selectedId);
            setTitle(draft?.title ?? note.title);
            setBody(draft?.body ?? note.body);
            setSavedAt(note.updated_at);
          } else {
            setSelectedId(null);
          }
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedId) localStorage.setItem("notebloom-last-note", selectedId);
    else localStorage.removeItem("notebloom-last-note");
  }, [selectedId]);

  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    if (!selectedId) { setTitle(""); setBody(""); setSavedAt(null); return; }
    const note = notes.find((n) => n.id === selectedId);
    if (note) {
      const draft = draftCache.get(selectedId);
      setTitle(draft?.title ?? note.title);
      setBody(draft?.body ?? note.body);
      setSavedAt(note.updated_at);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const persistSave = useCallback(async (id: string, t: string, b: string) => {
    setSaving(true);
    try {
      const updated = await notesApi.update(id, t, b);
      setNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
      setSavedAt(updated.updated_at);
      draftCache.clear(id);
    } catch { /* silent */ }
    finally { setSaving(false); }
  }, []);

  const scheduleSave = useCallback((id: string, t: string, b: string) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => persistSave(id, t, b), 800);
  }, [persistSave]);

  const flushSave = useCallback(async () => {
    if (saveTimer.current) { clearTimeout(saveTimer.current); saveTimer.current = null; }
    if (selectedId) await persistSave(selectedId, title, body);
  }, [selectedId, title, body, persistSave]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTitle(val);
    if (selectedId) {
      draftCache.set(selectedId, { title: val, body });
      scheduleSave(selectedId, val, body);
    }
  };

  const handleBodyChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setBody(val);
    if (selectedId) {
      draftCache.set(selectedId, { title, body: val });
      scheduleSave(selectedId, title, val);
    }
  };

  const handleNewNote = useCallback(async () => {
    await flushSave();
    try {
      const note = await notesApi.create("", "");
      setNotes((prev) => [note, ...prev]);
      setSelectedId(note.id);
      setTitle(""); setBody(""); setSavedAt(null);
      setTimeout(() => titleRef.current?.focus(), 50);
    } catch { /* silent */ }
  }, [flushSave]);

  const handleSelectNote = useCallback(async (id: string) => {
    if (id === selectedId) return;
    await flushSave();
    setSelectedId(id);
  }, [selectedId, flushSave]);

  const handleTogglePin = useCallback(async (id?: string) => {
    const target = id ?? selectedId;
    if (!target) return;
    try {
      const updated = await notesApi.togglePin(target);
      setNotes((prev) =>
        prev.map((n) => (n.id === updated.id ? updated : n))
          .sort((a, b) => (Number(b.pinned) - Number(a.pinned)) || (b.updated_at - a.updated_at))
      );
    } catch { /* silent */ }
  }, [selectedId]);

  const handleDuplicate = useCallback(async (id: string) => {
    try {
      const copy = await notesApi.duplicate(id);
      setNotes((prev) => [copy, ...prev]);
      setSelectedId(copy.id);
    } catch { /* silent */ }
  }, []);

  const handleCopyText = useCallback((note: Note) => {
    const text = [note.title, note.body].filter(Boolean).join("\n\n");
    navigator.clipboard.writeText(text).catch(() => {});
  }, []);

  const handleSaveAs = useCallback(async (note: Note) => {
    const text = [note.title, note.body].filter(Boolean).join("\n\n");
    try {
      const path = await save({
        defaultPath: `${note.title || "note"}.txt`,
        filters: [{ name: "Text", extensions: ["txt"] }],
      });
      if (path) await writeTextFile(path, text);
    } catch { /* silent */ }
  }, []);

  const handleSaveNote = useCallback(async (id: string) => {
    const note = notes.find((n) => n.id === id);
    if (!note) return;
    await persistSave(id, id === selectedId ? title : note.title, id === selectedId ? body : note.body);
  }, [notes, selectedId, title, body, persistSave]);

  const handleWipeAll = useCallback(async () => {
    try {
      await settingsApi.wipeAll();
      draftCache.clearAll();
      localStorage.removeItem("notebloom-last-note");
      localStorage.removeItem("notebloom-theme");
      setNotes([]);
      setSelectedId(null);
      setTitle(""); setBody(""); setSavedAt(null);
      setSettings(DEFAULT_SETTINGS);
      setDark(window.matchMedia("(prefers-color-scheme: dark)").matches);
    } catch { /* silent */ }
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    const id = deleteTarget;
    if (!id) return;
    try {
      await notesApi.delete(id);
      const remaining = notes.filter((n) => n.id !== id);
      setNotes(remaining);
      if (selectedId === id) setSelectedId(remaining[0]?.id ?? null);
    } catch { /* silent */ }
    setDeleteTarget(null);
  }, [deleteTarget, notes, selectedId]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key === "n") { e.preventDefault(); handleNewNote(); }
      if (mod && e.key === "s") { e.preventDefault(); if (selectedId) persistSave(selectedId, title, body); }
      if (mod && (e.key === "Backspace" || e.key === "Delete") && selectedId) { e.preventDefault(); setDeleteTarget(selectedId); }
      if (mod && e.key === "p" && selectedId) { e.preventDefault(); handleTogglePin(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleNewNote, handleTogglePin, persistSave, selectedId, title, body]);

  const deleteNote = notes.find((n) => n.id === deleteTarget);

  return (
    <TooltipProvider delayDuration={600}>
      <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden antialiased">

        {/* ── Titlebar ──────────────────────────────────────────────────────── */}
        <div
          className={cn("flex items-center h-[44px] shrink-0 select-none", isMac ? "pl-[14px] pr-4" : "pl-4 pr-0")}
          style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
        >
          {isMac && settings.showWindowControls && (
            <div className="flex items-center mr-4"><MacControls /></div>
          )}

          {settings.showLogoAndName && (
            <div className="flex items-center gap-[9px] w-[220px] shrink-0" style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}>
              <img src="/logo.png" alt="NoteBloom" className="size-[19px] object-contain shrink-0" draggable={false} />
              <span className="text-[13px] font-semibold tracking-[-0.015em] text-foreground/70">NoteBloom</span>
            </div>
          )}

          <div className="flex-1 h-full" />

          {/* Settings — always visible */}
          <div style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}>
            <Popover open={settingsOpen} onOpenChange={setSettingsOpen}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon"
                      className="size-7 rounded-lg text-muted-foreground/50 hover:text-foreground/70 hover:bg-black/[0.05] dark:hover:bg-white/[0.06] active:scale-[0.92] mr-1"
                      aria-label="Settings">
                      <IconSettings className="size-[14px]" />
                    </Button>
                  </PopoverTrigger>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">Settings</TooltipContent>
              </Tooltip>
              <PopoverContent side="bottom" align="end" className="w-[280px] p-4 rounded-xl">
                <SettingsPanel settings={settings} onChange={updateSettings} onWipe={() => { setSettingsOpen(false); handleWipeAll(); }} />
              </PopoverContent>
            </Popover>
          </div>

          {settings.showThemeToggle && (
            <div style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon"
                    className="size-7 rounded-lg text-muted-foreground/50 hover:text-foreground/70 hover:bg-black/[0.05] dark:hover:bg-white/[0.06] active:scale-[0.92] mr-1"
                    onClick={() => setDark((d) => !d)} aria-label="Toggle theme">
                    {dark ? <IconSun className="size-[14px]" /> : <IconMoon className="size-[14px]" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">Toggle theme</TooltipContent>
              </Tooltip>
            </div>
          )}

          {!isMac && settings.showWindowControls && <Win11Controls />}
        </div>

        {/* ── Content ───────────────────────────────────────────────────────── */}
        <div className="flex flex-1 min-h-0 px-3 pb-3 gap-3">

          {/* ── Floating sidebar ────────────────────────────────────────────── */}
          <aside className={cn(
            "flex flex-col w-[220px] shrink-0 overflow-hidden",
            "rounded-[18px] border border-border/30 bg-sidebar",
            "shadow-[0_2px_12px_oklch(0_0_0/0.06)] dark:shadow-[0_2px_20px_oklch(0_0_0/0.35)]"
          )}>
            <div className="flex items-center justify-between px-3 pt-3 pb-2 shrink-0">
              <span className="text-[10.5px] font-semibold uppercase tracking-[0.09em] text-muted-foreground/35 pl-1">Notes</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon"
                    className="size-[26px] rounded-[8px] text-muted-foreground/45 hover:text-foreground/70 hover:bg-black/[0.05] dark:hover:bg-white/[0.06] active:scale-[0.90]"
                    onClick={handleNewNote} aria-label="New note">
                    <IconCompose className="size-[13px]" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-xs">
                  New note <span className="ml-1 opacity-60 font-mono">{modKey}N</span>
                </TooltipContent>
              </Tooltip>
            </div>

            <Separator className="opacity-[0.18] mx-2" />

            <ScrollArea className="flex-1 px-2 py-2">
              {loading ? (
                <div className="flex flex-col gap-1">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="px-2 py-3 flex flex-col gap-[7px]">
                      <Skeleton className="h-[11px] w-3/4 rounded-full" />
                      <Skeleton className="h-[9px] w-full rounded-full" />
                    </div>
                  ))}
                </div>
              ) : notes.length === 0 ? (
                <EmptySidebar onNew={handleNewNote} />
              ) : (
                <div className="flex flex-col gap-0.5">
                  {notes.map((note) => (
                    <NoteItem
                      key={note.id}
                      note={note}
                      isActive={note.id === selectedId}
                      settings={settings}
                      onOpen={() => handleSelectNote(note.id)}
                      onSave={() => handleSaveNote(note.id)}
                      onSaveAs={() => handleSaveAs(note)}
                      onDuplicate={() => handleDuplicate(note.id)}
                      onCopyText={() => handleCopyText(note)}
                      onPin={() => handleTogglePin(note.id)}
                      onDelete={() => setDeleteTarget(note.id)}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
          </aside>

          {/* ── Editor ──────────────────────────────────────────────────────── */}
          <main className="flex flex-col flex-1 min-w-0 min-h-0">
            {selectedNote ? (
              <>
                <div className="flex items-center justify-between px-8 pt-1 pb-0 shrink-0 h-10">
                  <SavedIndicator savedAt={savedAt} saving={saving} />
                  <div className="flex items-center gap-0.5">
                    {settings.showPinButton && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon"
                            className={cn("size-7 rounded-lg transition-colors active:scale-[0.90]",
                              selectedNote.pinned
                                ? "text-foreground/60 hover:bg-black/[0.05] dark:hover:bg-white/[0.06]"
                                : "text-muted-foreground/35 hover:text-foreground/60 hover:bg-black/[0.04] dark:hover:bg-white/[0.05]"
                            )}
                            onClick={() => handleTogglePin()}>
                            <IconPin className="size-[14px]" filled={selectedNote.pinned} />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="text-xs">
                          {selectedNote.pinned ? "Unpin" : "Pin"}
                          <span className="ml-1 opacity-60 font-mono">{modKey}P</span>
                        </TooltipContent>
                      </Tooltip>
                    )}
                    {settings.showTrashButton && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon"
                            className="size-7 rounded-lg text-muted-foreground/35 hover:text-destructive hover:bg-destructive/8 active:scale-[0.90]"
                            onClick={() => setDeleteTarget(selectedId)}>
                            <IconTrash className="size-[14px]" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="text-xs">
                          Delete <span className="ml-1 opacity-60 font-mono">{modKey}⌫</span>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </div>

                <div className="flex flex-col flex-1 min-h-0 px-8 pt-3 pb-6 gap-1">
                  <input
                    ref={titleRef}
                    type="text"
                    placeholder="Title"
                    value={title}
                    onChange={handleTitleChange}
                    spellCheck={settings.spellCheck}
                    className={cn(
                      "w-full bg-transparent outline-none border-none ring-0 shadow-none",
                      "text-[22px] font-semibold tracking-[-0.025em] leading-snug",
                      "text-foreground placeholder:text-muted-foreground/35",
                      "py-1 select-text caret-foreground"
                    )}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === "ArrowDown") {
                        e.preventDefault();
                        bodyRef.current?.focus();
                      }
                    }}
                  />
                  <textarea
                    ref={bodyRef}
                    placeholder="Start writing…"
                    value={body}
                    onChange={handleBodyChange}
                    spellCheck={settings.spellCheck}
                    className={cn(
                      "flex-1 w-full bg-transparent outline-none border-none ring-0 shadow-none resize-none",
                      "text-[14.5px] leading-[1.85] text-foreground/80 placeholder:text-muted-foreground/30",
                      "min-h-0 select-text caret-foreground pt-0.5"
                    )}
                  />
                </div>
              </>
            ) : (
              <EmptyEditor onNew={handleNewNote} />
            )}
          </main>
        </div>
      </div>

      {/* ── Delete confirmation ─────────────────────────────────────────────── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent className="max-w-[340px]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[15px]">Delete this note?</AlertDialogTitle>
            <AlertDialogDescription className="text-[13px]">
              &ldquo;{deleteNote?.title || "Untitled"}&rdquo; will be permanently removed. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-[13px] h-9 rounded-lg">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 text-[13px] h-9 rounded-lg">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
}
