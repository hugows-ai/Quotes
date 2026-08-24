import { useState, useCallback, useEffect, useRef } from 'react';
import { Sidebar } from './Sidebar';
import { NoteEditor } from './NoteEditor';
import { EmptyState } from './EmptyState';
import { FocusMode } from './FocusMode';
import { AdvancedSearch } from './AdvancedSearch';
import { UnlockDialog } from './PasswordDialog';
import { CommandPalette } from './CommandPalette';
import { TemplateLibrary } from './TemplateLibrary';
import { useNotes } from '@/hooks/useNotes';
import { useTheme } from '@/hooks/useTheme';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useCloudSync } from '@/hooks/useCloudSync';
import { useCustomization } from '@/hooks/useCustomization';
import { CustomizationContext } from '@/hooks/customizationContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { NoteType, Note } from '@/types/notes';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Download, Cloud, Loader2, Menu, Trash2, Undo2 } from 'lucide-react';
import { useTranslations } from '@/hooks/useTranslations';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface NotesAppProps {
  onSignOut?: () => void;
  isGuest?: boolean;
}

export function NotesApp({ onSignOut, isGuest }: NotesAppProps) {
  const { user } = useAuth();
  const isCloudMode = !!user && !isGuest;

  const {
    notes, allNotes, folders, todos, calendarTasks,
    selectedNote, selectedNoteId, searchQuery, dataReady,
    setSelectedNoteId, setSearchQuery,
    createNote, updateNote, deleteNote,
    createFolder, updateFolder, deleteFolder,
    addTodo, toggleTodo, deleteTodo,
    addCalendarTask, toggleCalendarTask, deleteCalendarTask,
    getCalendarTasksForDate, getNotesForDate,
    setNotes, setFolders, setTodos, setCalendarTasks,
    markDataReady,
  } = useNotes({ cloudMode: isCloudMode });

  const { isDark, toggleTheme, setIsDark } = useTheme({ cloudMode: isCloudMode });
  const { isInstallable, install } = usePWAInstall();
  const { t } = useTranslations();
  const customizationCtx = useCustomization({ cloudMode: isCloudMode });
  const {
    customization,
    cloudReady: customizationCloudReady,
    setCustomizationFromCloud,
    markCloudReady: markCustomizationCloudReady,
    resetForUserChange: resetCustomizationForUserChange,
    setIsDark: setCustomIsDark,
  } = customizationCtx;
  const isMobile = useIsMobile();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [focusTimerState, setFocusTimerState] = useState<{ time: number; isRunning: boolean; isBreak: boolean } | null>(null);
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [unlockNoteId, setUnlockNoteId] = useState<string | null>(null);
  const [showTrash, setShowTrash] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Trash bin with trashedAt timestamp
  interface TrashedNote extends Note {
    trashedAt: string; // ISO date
  }
  const [trashedNotes, setTrashedNotes] = useState<TrashedNote[]>(() => {
    try {
      const stored = localStorage.getItem('notes-app-trash');
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.map((n: any) => ({
          ...n,
          createdAt: new Date(n.createdAt),
          updatedAt: new Date(n.updatedAt),
          linkedDate: n.linkedDate ? new Date(n.linkedDate) : null,
          trashedAt: n.trashedAt || new Date().toISOString(),
        }));
      }
    } catch {}
    return [];
  });

  useEffect(() => {
    localStorage.setItem('notes-app-trash', JSON.stringify(trashedNotes));
  }, [trashedNotes]);

  // Auto-clean trash after 30 days
  useEffect(() => {
    const cleanup = () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      setTrashedNotes(prev => {
        const filtered = prev.filter(n => new Date(n.trashedAt) > thirtyDaysAgo);
        if (filtered.length < prev.length) {
          toast.info(t('trashAutoClean').replace('{count}', String(prev.length - filtered.length)));
        }
        return filtered;
      });
    };
    cleanup(); // Run on mount
    const interval = setInterval(cleanup, 60 * 60 * 1000); // Check every hour
    return () => clearInterval(interval);
  }, [t]);

  const moveToTrash = useCallback((id: string) => {
    const note = allNotes.find(n => n.id === id);
    if (note) {
      const trashedNote: TrashedNote = { ...note, trashedAt: new Date().toISOString() };
      setTrashedNotes(prev => [trashedNote, ...prev]);
      deleteNote(id);
      toast.success(t('movedToTrash'));
    }
  }, [allNotes, deleteNote, t]);

  const restoreFromTrash = useCallback((id: string) => {
    const note = trashedNotes.find(n => n.id === id);
    if (note) {
      setNotes(prev => [note, ...prev]);
      setTrashedNotes(prev => prev.filter(n => n.id !== id));
      toast.success(t('noteRestored'));
    }
  }, [trashedNotes, setNotes, t]);

  const permanentlyDelete = useCallback((id: string) => {
    setTrashedNotes(prev => prev.filter(n => n.id !== id));
    toast.success(t('permanentlyDeleted'));
  }, [t]);

  const emptyTrash = useCallback(() => {
    setTrashedNotes([]);
    toast.success(t('trashEmptied'));
  }, [t]);

  // Cloud sync
  const { loadFromCloud, saveToCloud, syncing, lastSynced } = useCloudSync(user);
  const cloudLoadedRef = useRef(false);
  const loadedUserIdRef = useRef<string | null>(null);
  const syncTimeoutRef = useRef<NodeJS.Timeout>();

  // Load from cloud on login. If the authenticated user changes (account switch),
  // reset customization state first so the previous user's theme cannot be
  // written into the new user's cloud record.
  useEffect(() => {
    if (!user) {
      cloudLoadedRef.current = false;
      loadedUserIdRef.current = null;
      return;
    }
    if (isGuest) return;
    if (loadedUserIdRef.current === user.id) return;

    // New user (or first load) — reset and reload.
    loadedUserIdRef.current = user.id;
    cloudLoadedRef.current = false;
    resetCustomizationForUserChange();

    loadFromCloud().then(data => {
      if (data) {
        setNotes(data.notes);
        setFolders(data.folders.length > 0 ? data.folders : []);
        setTodos(data.todos);
        setCalendarTasks(data.calendarTasks);
        if (data.customization) {
          setCustomizationFromCloud(data.customization);
          if (data.customization.isDark !== undefined) {
            setIsDark(data.customization.isDark);
          }
        } else {
          // No saved customization yet — mark ready so future edits sync.
          markCustomizationCloudReady();
        }
        markDataReady();
        cloudLoadedRef.current = true;
        toast.success(t('cloudLoaded'));
      } else {
        // No cloud data yet (new user) - still mark ready so data can be saved
        markCustomizationCloudReady();
        markDataReady();
        cloudLoadedRef.current = true;
      }
    }).catch((err) => {
      console.error('Cloud load failed:', err);
      toast.error('Failed to load data from cloud');
      // Do NOT mark customization cloud-ready: we don't want a transient
      // load failure to overwrite the user's saved theme with defaults.
      markDataReady();
      cloudLoadedRef.current = true;
    });
  }, [user, isGuest]);

  // Auto-sync to cloud on changes (debounced)
  // IMPORTANT: depend on `customization` + `isDark` directly — NOT a freshly-built object,
  // which would create a new reference every render and continuously reset the debounce,
  // preventing saves from ever firing while the user types.
  useEffect(() => {
    if (!user || isGuest || !cloudLoadedRef.current || !dataReady) return;
    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    syncTimeoutRef.current = setTimeout(() => {
      // Only include customization in the save once we've reconciled with
      // the cloud — otherwise the initial default state could overwrite
      // a saved theme before loadFromCloud resolves.
      const customizationToSave = customizationCloudReady
        ? { ...customization, isDark }
        : undefined;
      saveToCloud(allNotes, folders, todos, calendarTasks, customizationToSave);
    }, 3000);
    return () => {
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    };
  }, [allNotes, folders, todos, calendarTasks, customization, isDark, customizationCloudReady, user, isGuest, dataReady, saveToCloud]);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onNewNote: () => createNote('text'),
    onNewDrawing: () => createNote('drawing'),
    onNewWorkflow: () => createNote('workflow'),
    onSearch: () => searchInputRef.current?.focus(),
    onToggleTheme: toggleTheme,
    onFocusMode: () => selectedNote && setFocusMode(true),
    onToggleSidebar: () => setSidebarCollapsed(prev => !prev),
    onAdvancedSearch: () => setShowAdvancedSearch(true),
  });


  const handleImportNotes = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.md,.txt,.json';
    input.multiple = true;
    input.onchange = async (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (!files) return;
      for (const file of Array.from(files)) {
        const text = await file.text();
        if (file.name.endsWith('.json')) {
          try {
            const data = JSON.parse(text);
            if (Array.isArray(data.notes)) {
              data.notes.forEach((n: any) => {
                createNote(n.type || 'text', n.folderId || null);
              });
              toast.success(t('importSuccess'));
            }
          } catch {
            toast.error(t('importError'));
          }
        } else {
          const title = file.name.replace(/\.(md|txt)$/, '');
          const note = createNote('text', null);
          updateNote(note.id, { title, content: text });
        }
      }
      toast.success(t('importSuccess'));
    };
    input.click();
  }, [createNote, updateNote, t]);

  // Task reminders check
  useEffect(() => {
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    const interval = setInterval(() => {
      const now = new Date();
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      calendarTasks.forEach(task => {
        if (task.date === todayStr && task.reminderTime === currentTime && !task.completed && !task.reminderNotified) {
          if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
            new Notification(`⏰ ${t('reminder')}`, { body: task.text });
          }
          toggleCalendarTask(task.id);
        }
      });
    }, 30000);
    return () => clearInterval(interval);
  }, [calendarTasks, t]);

  const handleSelectDate = (date: Date) => {
    const notesForDate = getNotesForDate(date);
    if (notesForDate.length > 0) setSelectedNoteId(notesForDate[0].id);
  };

  const handleSelectNote = useCallback((noteId: string) => {
    const note = allNotes.find(n => n.id === noteId);
    if (note?.password) {
      setUnlockNoteId(noteId);
    } else {
      setSelectedNoteId(noteId);
      if (isMobile) setMobileMenuOpen(false);
    }
  }, [allNotes, setSelectedNoteId, isMobile]);

  const handleUnlock = useCallback((password: string): boolean => {
    if (!unlockNoteId) return false;
    const note = allNotes.find(n => n.id === unlockNoteId);
    if (note?.password === password) {
      setSelectedNoteId(unlockNoteId);
      setUnlockNoteId(null);
      return true;
    }
    return false;
  }, [unlockNoteId, allNotes, setSelectedNoteId]);

  const handleMoveNote = useCallback((noteId: string, folderId: string | null) => {
    updateNote(noteId, { folderId });
  }, [updateNote]);

  const handleCreateNote = (type: NoteType = 'text', folderId: string | null = null) => {
    createNote(type, folderId);
  };

  const handleUseTemplate = useCallback((title: string, content: string) => {
    const note = createNote('text', null);
    updateNote(note.id, { title, content });
    toast.success(t('saved'));
  }, [createNote, updateNote, t]);

  const handleRenameNote = useCallback((noteId: string, newTitle: string) => {
    updateNote(noteId, { title: newTitle });
  }, [updateNote]);

  const editorContent = selectedNote ? (
    <NoteEditor
      key={selectedNote.id}
      note={selectedNote}
      folders={folders}
      onUpdate={(updates) => updateNote(selectedNote.id, updates)}
      onFocusMode={() => setFocusMode(true)}
    />
  ) : (
    <EmptyState onCreateNote={() => createNote('text')} onImportNotes={handleImportNotes} />
  );

  if (focusMode && selectedNote) {
    return (
      <CustomizationContext.Provider value={customizationCtx}>
        <FocusMode 
          onExit={() => { setFocusMode(false); setFocusTimerState(null); }}
          onTimerStateChange={setFocusTimerState}
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={() => setSidebarCollapsed(prev => !prev)}
        >
          <ResizablePanelGroup direction="horizontal" className="h-full">
            {!sidebarCollapsed && (
              <>
                <ResizablePanel defaultSize={22} minSize={15} maxSize={40}>
                  <Sidebar
                    notes={notes} allNotes={allNotes} folders={folders} todos={todos}
                    calendarTasks={calendarTasks} selectedNoteId={selectedNoteId}
                    searchQuery={searchQuery} isDark={isDark}
                    onSelectNote={handleSelectNote} onCreateNote={handleCreateNote}
                    onDeleteNote={moveToTrash} onSearch={setSearchQuery}
                    onToggleTheme={toggleTheme} onAddTodo={(text) => addTodo(text)}
                    onToggleTodo={toggleTodo} onDeleteTodo={deleteTodo}
                    onSelectDate={handleSelectDate} getNotesForDate={getNotesForDate}
                    onCreateFolder={createFolder} onUpdateFolder={updateFolder}
                    onDeleteFolder={deleteFolder} onAddCalendarTask={addCalendarTask}
                    onToggleCalendarTask={toggleCalendarTask}
                    onDeleteCalendarTask={deleteCalendarTask}
                    getCalendarTasksForDate={getCalendarTasksForDate}
                    collapsed={false} onToggleCollapse={() => setSidebarCollapsed(true)}
                    onMoveNote={handleMoveNote} onOpenAdvancedSearch={() => setShowAdvancedSearch(true)}
                    onRenameNote={handleRenameNote} onSignOut={onSignOut}
                    onImportNotes={handleImportNotes}
                    trashedNotes={trashedNotes}
                    onShowTrash={() => setShowTrash(true)}
                    onOpenTemplates={() => setShowTemplates(true)}
                  />
                </ResizablePanel>
                <ResizableHandle withHandle />
              </>
            )}
            <ResizablePanel defaultSize={sidebarCollapsed ? 100 : 78}>
              <NoteEditor
                key={`focus-${selectedNote.id}`}
                note={selectedNote}
                folders={folders}
                onUpdate={(updates) => updateNote(selectedNote.id, updates)}
              />
            </ResizablePanel>
          </ResizablePanelGroup>
        </FocusMode>
      </CustomizationContext.Provider>
    );
  }


  const sidebarProps = {
    notes, allNotes, folders, todos,
    calendarTasks, selectedNoteId,
    searchQuery, isDark,
    onSelectNote: handleSelectNote, onCreateNote: handleCreateNote,
    onDeleteNote: moveToTrash, onSearch: setSearchQuery,
    onToggleTheme: toggleTheme, onAddTodo: (text: string) => addTodo(text),
    onToggleTodo: toggleTodo, onDeleteTodo: deleteTodo,
    onSelectDate: handleSelectDate, getNotesForDate,
    onCreateFolder: createFolder, onUpdateFolder: updateFolder,
    onDeleteFolder: deleteFolder, onAddCalendarTask: addCalendarTask,
    onToggleCalendarTask: toggleCalendarTask,
    onDeleteCalendarTask: deleteCalendarTask,
    getCalendarTasksForDate,
    collapsed: false as boolean,
    onToggleCollapse: () => isMobile ? setMobileMenuOpen(false) : setSidebarCollapsed(prev => !prev),
    onMoveNote: handleMoveNote, onOpenAdvancedSearch: () => setShowAdvancedSearch(true),
    onRenameNote: handleRenameNote, onSignOut: onSignOut,
    onImportNotes: handleImportNotes,
    trashedNotes,
    onShowTrash: () => setShowTrash(true),
    onOpenTemplates: () => setShowTemplates(true),
  };

  return (
    <CustomizationContext.Provider value={customizationCtx}>
    <>
      {isMobile ? (
        <div className="h-[100dvh] flex flex-col overflow-hidden">
          {/* Mobile top bar */}
          <div className="flex items-center justify-between p-2 border-b border-border bg-card shrink-0">
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setMobileMenuOpen(true)}>
              <Menu className="h-5 w-5" />
            </Button>
            <button 
              onClick={() => { setSelectedNoteId(null); setShowTrash(false); }} 
              className="text-sm font-semibold text-foreground hover:text-primary transition-colors active:scale-95"
            >
              Quotes
            </button>
            <div className="flex items-center gap-1">
              {user && (
                syncing ? <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" /> : <Cloud className="h-3.5 w-3.5 text-primary" />
              )}
            </div>
          </div>
          <div className="flex-1 min-h-0 overflow-hidden">
            {showTrash ? (
              <TrashView
                trashedNotes={trashedNotes}
                onRestore={restoreFromTrash}
                onDelete={permanentlyDelete}
                onEmptyTrash={emptyTrash}
                onClose={() => setShowTrash(false)}
                t={t}
              />
            ) : editorContent}
          </div>
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetContent side="left" className="p-0 w-[85vw] max-w-sm">
              <Sidebar {...sidebarProps} />
            </SheetContent>
          </Sheet>
        </div>
      ) : (
        <ResizablePanelGroup
          key={sidebarCollapsed ? 'collapsed' : 'expanded'}
          direction="horizontal"
          className="h-screen"
        >
          <ResizablePanel
            defaultSize={sidebarCollapsed ? 4 : 22}
            minSize={sidebarCollapsed ? 4 : 15}
            maxSize={sidebarCollapsed ? 4 : 40}
          >
            <Sidebar {...sidebarProps} collapsed={sidebarCollapsed} />
          </ResizablePanel>
          <ResizableHandle withHandle={!sidebarCollapsed} />
          <ResizablePanel defaultSize={sidebarCollapsed ? 96 : 78}>
            {showTrash ? (
              <TrashView
                trashedNotes={trashedNotes}
                onRestore={restoreFromTrash}
                onDelete={permanentlyDelete}
                onEmptyTrash={emptyTrash}
                onClose={() => setShowTrash(false)}
                t={t}
              />
            ) : editorContent}
          </ResizablePanel>
        </ResizablePanelGroup>
      )}

      {/* Cloud sync indicator (desktop only) */}
      {user && !isMobile && (
        <div className="fixed top-4 left-4 z-50 flex items-center gap-1.5 text-xs text-muted-foreground">
          {syncing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Cloud className="h-3 w-3 text-primary" />}
          <span>{syncing ? t('syncing') : t('synced')}</span>
        </div>
      )}

      {/* Floating Focus Timer */}
      {focusTimerState && !focusMode && (
        <div className="fixed top-4 right-4 z-50 bg-card border border-border rounded-full px-4 py-2 shadow-lg flex items-center gap-2">
          <span className={`font-mono text-sm font-semibold ${focusTimerState.isBreak ? 'text-success' : 'text-primary'}`}>
            {Math.floor(focusTimerState.time / 60).toString().padStart(2, '0')}:{(focusTimerState.time % 60).toString().padStart(2, '0')}
          </span>
          <span className="text-xs text-muted-foreground">{focusTimerState.isBreak ? t('break') : t('focus')}</span>
        </div>
      )}

      {/* Floating PWA Install Button */}
      {isInstallable && (
        <Button
          onClick={install}
          className="fixed bottom-4 right-4 z-50 gap-2 shadow-xl rounded-full px-5 py-3 animate-in fade-in slide-in-from-bottom-4"
          size="default"
        >
          <Download className="h-4 w-4" />
          {t('installButton')}
        </Button>
      )}

      {/* Advanced Search Overlay */}
      {showAdvancedSearch && (
        <AdvancedSearch
          notes={allNotes}
          folders={folders}
          onSelectNote={(id) => handleSelectNote(id)}
          onClose={() => setShowAdvancedSearch(false)}
        />
      )}

      {/* Command Palette (Ctrl+K) */}
      <CommandPalette
        notes={allNotes}
        folders={folders}
        todos={todos}
        onSelectNote={handleSelectNote}
        onCreateNote={(type) => createNote(type)}
        onOpenAdvancedSearch={() => setShowAdvancedSearch(true)}
        onOpenTemplates={() => setShowTemplates(true)}
        isDark={isDark}
        onToggleTheme={toggleTheme}
      />

      {/* Template Library */}
      <TemplateLibrary
        open={showTemplates}
        onClose={() => setShowTemplates(false)}
        onUseTemplate={handleUseTemplate}
        currentNoteTitle={selectedNote?.title}
        currentNoteContent={selectedNote?.content}
      />

      {/* Unlock Dialog */}
      <UnlockDialog
        open={!!unlockNoteId}
        onUnlock={handleUnlock}
        onCancel={() => setUnlockNoteId(null)}
      />
    </>
    </CustomizationContext.Provider>
  );
}

// Trash View Component
function TrashView({
  trashedNotes,
  onRestore,
  onDelete,
  onEmptyTrash,
  onClose,
  t,
}: {
  trashedNotes: Array<Note & { trashedAt?: string }>;
  onRestore: (id: string) => void;
  onDelete: (id: string) => void;
  onEmptyTrash: () => void;
  onClose: () => void;
  t: (key: string) => string;
}) {
  const getDaysRemaining = (trashedAt?: string) => {
    if (!trashedAt) return 30;
    const trashedDate = new Date(trashedAt);
    const deleteDate = new Date(trashedDate);
    deleteDate.setDate(deleteDate.getDate() + 30);
    const now = new Date();
    return Math.max(0, Math.ceil((deleteDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-background">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Trash2 className="h-5 w-5 text-destructive" />
          <h2 className="text-lg font-semibold">{t('trash')}</h2>
          <span className="text-sm text-muted-foreground">({trashedNotes.length})</span>
        </div>
        <div className="flex items-center gap-2">
          {trashedNotes.length > 0 && (
            <Button variant="destructive" size="sm" onClick={onEmptyTrash}>
              {t('emptyTrash')}
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onClose}>
            {t('close')}
          </Button>
        </div>
      </div>
      <div className="px-4 py-2 text-xs text-muted-foreground border-b border-border">
        {t('trashAutoCleanInfo')}
      </div>
      <div className="flex-1 overflow-auto p-4">
        {trashedNotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <Trash2 className="h-12 w-12 mb-4 opacity-30" />
            <p>{t('trashEmpty')}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {trashedNotes.map(note => {
              const daysLeft = getDaysRemaining((note as any).trashedAt);
              return (
                <div key={note.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{note.title || t('noteTitle')}</p>
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-muted-foreground truncate">{note.content.substring(0, 60)}</p>
                      <span className={`text-xs shrink-0 ${daysLeft <= 7 ? 'text-destructive' : 'text-muted-foreground'}`}>
                        {daysLeft}d
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onRestore(note.id)} title={t('restore')}>
                      <Undo2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => onDelete(note.id)} title={t('permanentlyDelete')}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
