import { useState, DragEvent } from 'react';
import { 
  Plus, Search, FolderOpen, FileText, Calendar as CalendarIcon,
  CheckSquare, Moon, Sun, ChevronDown, ChevronRight, Trash2, X,
  Pencil, GitBranch, FolderPlus, Edit3, Palette, FolderMinus,
  PanelLeftClose, PanelLeftOpen, FolderInput, Copy, LogOut, Upload,
  BookOpen
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar } from '@/components/ui/calendar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator,
  ContextMenuTrigger, ContextMenuSub, ContextMenuSubContent, ContextMenuSubTrigger,
} from '@/components/ui/context-menu';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Note, Folder, Todo, NoteType, CalendarTask } from '@/types/notes';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CustomizationPanel } from './CustomizationPanel';
import { SettingsPanel } from './SettingsPanel';
import { useTranslations } from '@/hooks/useTranslations';

interface SidebarProps {
  notes: Note[];
  folders: Folder[];
  todos: Todo[];
  calendarTasks: CalendarTask[];
  selectedNoteId: string | null;
  searchQuery: string;
  isDark: boolean;
  onSelectNote: (id: string) => void;
  onCreateNote: (type?: NoteType, folderId?: string | null) => void;
  onDeleteNote: (id: string) => void;
  onSearch: (query: string) => void;
  onToggleTheme: () => void;
  onAddTodo: (text: string) => void;
  onToggleTodo: (id: string) => void;
  onDeleteTodo: (id: string) => void;
  onSelectDate: (date: Date) => void;
  getNotesForDate: (date: Date) => Note[];
  onCreateFolder: (name: string, color: string, parentId?: string | null) => void;
  onUpdateFolder: (id: string, updates: Partial<Omit<Folder, 'id'>>) => void;
  onDeleteFolder: (id: string) => void;
  onAddCalendarTask: (text: string, date: string) => void;
  onToggleCalendarTask: (id: string) => void;
  onDeleteCalendarTask: (id: string) => void;
  getCalendarTasksForDate: (date: string) => CalendarTask[];
  allNotes: Note[];
  collapsed: boolean;
  onToggleCollapse: () => void;
  onMoveNote: (noteId: string, folderId: string | null) => void;
  onOpenAdvancedSearch: () => void;
  onRenameNote?: (noteId: string, newTitle: string) => void;
  onSignOut?: () => void;
  onImportNotes?: () => void;
  trashedNotes?: Note[];
  onShowTrash?: () => void;
  onOpenTemplates?: () => void;
}

const FOLDER_COLORS = [
  '#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316',
];

export function Sidebar({
  notes, folders, todos, calendarTasks, selectedNoteId, searchQuery, isDark,
  onSelectNote, onCreateNote, onDeleteNote, onSearch, onToggleTheme,
  onAddTodo, onToggleTodo, onDeleteTodo, onSelectDate, getNotesForDate,
  onCreateFolder, onUpdateFolder, onDeleteFolder, onAddCalendarTask,
  onToggleCalendarTask, onDeleteCalendarTask, getCalendarTasksForDate,
  allNotes, collapsed, onToggleCollapse, onMoveNote, onOpenAdvancedSearch,
  onRenameNote, onSignOut, onImportNotes, trashedNotes, onShowTrash, onOpenTemplates,
}: SidebarProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [notesOpen, setNotesOpen] = useState(true);
  const [foldersOpen, setFoldersOpen] = useState(true);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [todosOpen, setTodosOpen] = useState(true);
  const [newTodoText, setNewTodoText] = useState('');
  const [newCalendarTaskText, setNewCalendarTaskText] = useState('');
  const [newFolderDialogOpen, setNewFolderDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderColor, setNewFolderColor] = useState(FOLDER_COLORS[0]);
  const [newFolderParentId, setNewFolderParentId] = useState<string | null>(null);
  const [editFolderDialog, setEditFolderDialog] = useState<Folder | null>(null);
  const [editFolderName, setEditFolderName] = useState('');
  const [editFolderColor, setEditFolderColor] = useState('');
  const [renameNoteDialog, setRenameNoteDialog] = useState<Note | null>(null);
  const [renameNoteTitle, setRenameNoteTitle] = useState('');
  const { t } = useTranslations();

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    if (date) onSelectDate(date);
  };

  const handleAddTodo = () => {
    if (newTodoText.trim()) {
      onAddTodo(newTodoText.trim());
      setNewTodoText('');
    }
  };

  const handleAddCalendarTask = () => {
    if (newCalendarTaskText.trim() && selectedDate) {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      onAddCalendarTask(newCalendarTaskText.trim(), dateStr);
      setNewCalendarTaskText('');
    }
  };

  const handleCreateFolder = () => {
    if (newFolderName.trim()) {
      onCreateFolder(newFolderName.trim(), newFolderColor, newFolderParentId);
      setNewFolderName('');
      setNewFolderColor(FOLDER_COLORS[0]);
      setNewFolderParentId(null);
      setNewFolderDialogOpen(false);
    }
  };

  const handleEditFolder = () => {
    if (editFolderDialog && editFolderName.trim()) {
      onUpdateFolder(editFolderDialog.id, { name: editFolderName.trim(), color: editFolderColor });
      setEditFolderDialog(null);
    }
  };

  const openEditFolderDialog = (folder: Folder) => {
    setEditFolderDialog(folder);
    setEditFolderName(folder.name);
    setEditFolderColor(folder.color);
  };

  const openNewSubfolderDialog = (parentId: string) => {
    setNewFolderParentId(parentId);
    setNewFolderName('');
    setNewFolderColor(FOLDER_COLORS[0]);
    setNewFolderDialogOpen(true);
  };

  const handleRenameNote = () => {
    if (renameNoteDialog && renameNoteTitle.trim() && onRenameNote) {
      onRenameNote(renameNoteDialog.id, renameNoteTitle.trim());
      setRenameNoteDialog(null);
    }
  };

  const getNotesByFolder = (folderId: string | null) => {
    return notes.filter(n => n.folderId === folderId);
  };

  const getChildFolders = (parentId: string | null) => {
    return folders.filter(f => f.parentId === parentId);
  };

  const rootFolders = getChildFolders(null);
  const selectedDateStr = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '';
  const tasksForSelectedDate = selectedDateStr ? getCalendarTasksForDate(selectedDateStr) : [];
  const isSearching = searchQuery.length > 0;

  const dateHasTasks = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return getCalendarTasksForDate(dateStr).length > 0;
  };

  if (collapsed) {
    return (
      <div className="w-full h-screen bg-sidebar border-r border-sidebar-border flex flex-col items-center py-3 gap-1">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onToggleCollapse} title={t('expandSidebar')}>
          <PanelLeftOpen className="h-4 w-4" />
        </Button>
        <div className="h-px w-6 bg-sidebar-border my-1" />
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onToggleTheme}>
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
        <SettingsPanel />
        <div className="h-px w-6 bg-sidebar-border my-1" />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Plus className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right">
            <DropdownMenuItem onClick={() => onCreateNote('text')}>
              <FileText className="h-4 w-4 mr-2" />{t('textNote')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onCreateNote('drawing')}>
              <Pencil className="h-4 w-4 mr-2" />{t('drawing')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onCreateNote('workflow')}>
              <GitBranch className="h-4 w-4 mr-2" />{t('workflow')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        {onSignOut && (
          <>
            <div className="flex-1" />
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onSignOut} title={t('logout')}>
              <LogOut className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="w-full h-screen bg-sidebar border-r border-sidebar-border flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold text-sidebar-foreground">Quotes</h1>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onToggleCollapse} title={t('collapseSidebar')}>
              <PanelLeftClose className="h-4 w-4" />
            </Button>
            <SettingsPanel />
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onToggleTheme}>
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/10 hover:text-primary">
                  <Plus className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onCreateNote('text')}>
                  <FileText className="h-4 w-4 mr-2" />{t('textNote')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onCreateNote('drawing')}>
                  <Pencil className="h-4 w-4 mr-2" />{t('drawing')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onCreateNote('workflow')}>
                  <GitBranch className="h-4 w-4 mr-2" />{t('workflow')}
                </DropdownMenuItem>
                {onImportNotes && (
                  <DropdownMenuItem onClick={onImportNotes}>
                    <Upload className="h-4 w-4 mr-2" />{t('importNotes')}
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        
        {/* Search */}
        <div className="flex gap-1">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('search')}
              value={searchQuery}
              onChange={(e) => onSearch(e.target.value)}
              className="pl-9 h-9 bg-sidebar-accent/50 border-sidebar-border"
            />
            {searchQuery && (
              <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6" onClick={() => onSearch('')}>
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
          <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={onOpenAdvancedSearch} title={t('advancedSearch')}>
            <Search className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          {isSearching ? (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground px-2">{notes.length} resultado(s)</p>
              {notes.map(note => (
                <NoteItem 
                  key={note.id} note={note} isSelected={note.id === selectedNoteId}
                  onSelect={() => onSelectNote(note.id)} onDelete={() => onDeleteNote(note.id)}
                  folders={folders} onMoveNote={onMoveNote}
                  onRename={() => { setRenameNoteDialog(note); setRenameNoteTitle(note.title); }}
                  t={t}
                />
              ))}
            </div>
          ) : (
            <>
              {/* Folders */}
              <Collapsible open={foldersOpen} onOpenChange={setFoldersOpen}>
                <div className="flex items-center gap-1">
                  <CollapsibleTrigger className="flex items-center gap-2 flex-1 p-2 rounded-lg hover:bg-sidebar-accent text-sm font-medium text-sidebar-foreground">
                    {foldersOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    <FolderOpen className="h-4 w-4" />
                    <span>{t('folders')}</span>
                  </CollapsibleTrigger>
                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" title={t('newFolder')}
                    onClick={() => { setNewFolderParentId(null); setNewFolderDialogOpen(true); }}
                  >
                    <FolderPlus className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <CollapsibleContent className="pl-4 pt-1 space-y-1 animate-fade-in">
                  {rootFolders.map(folder => (
                    <FolderItem
                      key={folder.id} folder={folder} folders={folders} notes={notes}
                      selectedNoteId={selectedNoteId} onSelectNote={onSelectNote}
                      onDeleteNote={onDeleteNote} onCreateNote={onCreateNote}
                      onDeleteFolder={onDeleteFolder} onEditFolder={openEditFolderDialog}
                      onCreateSubfolder={openNewSubfolderDialog} onUpdateFolder={onUpdateFolder}
                      getChildFolders={getChildFolders} getNotesByFolder={getNotesByFolder}
                      onMoveNote={onMoveNote}
                      onRenameNote={(note) => { setRenameNoteDialog(note); setRenameNoteTitle(note.title); }}
                      t={t}
                    />
                  ))}
                </CollapsibleContent>
              </Collapsible>

              {/* All Notes */}
              <Collapsible open={notesOpen} onOpenChange={setNotesOpen}>
                <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 rounded-lg hover:bg-sidebar-accent text-sm font-medium text-sidebar-foreground">
                  {notesOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  <FileText className="h-4 w-4" />
                  <span>{t('allNotes')}</span>
                  <span className="ml-auto text-xs text-muted-foreground">{allNotes.length}</span>
                </CollapsibleTrigger>
                <CollapsibleContent className="pl-4 pt-1 space-y-1 animate-fade-in">
                  {allNotes.map(note => (
                    <NoteItem 
                      key={note.id} note={note} isSelected={note.id === selectedNoteId}
                      onSelect={() => onSelectNote(note.id)} onDelete={() => onDeleteNote(note.id)}
                      folders={folders} onMoveNote={onMoveNote}
                      onRename={() => { setRenameNoteDialog(note); setRenameNoteTitle(note.title); }}
                      t={t}
                    />
                  ))}
                </CollapsibleContent>
              </Collapsible>

              {/* Calendar */}
              <Collapsible open={calendarOpen} onOpenChange={setCalendarOpen}>
                <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 rounded-lg hover:bg-sidebar-accent text-sm font-medium text-sidebar-foreground">
                  {calendarOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  <CalendarIcon className="h-4 w-4" />
                  <span>{t('calendar')}</span>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-2 animate-fade-in">
                  <div className="bg-card rounded-lg p-2">
                    <Calendar
                      mode="single" selected={selectedDate} onSelect={handleDateSelect}
                      locale={ptBR} className="pointer-events-auto"
                      modifiers={{
                        hasNotes: (date) => getNotesForDate(date).length > 0,
                        hasTasks: (date) => dateHasTasks(date),
                      }}
                      modifiersStyles={{
                        hasNotes: { fontWeight: 'bold', textDecoration: 'underline', textDecorationColor: 'hsl(var(--primary))' },
                        hasTasks: { fontWeight: 'bold', backgroundColor: 'hsl(var(--primary) / 0.15)', borderRadius: '50%' },
                      }}
                    />
                    {selectedDate && (
                      <div className="mt-2 p-2 bg-sidebar-accent rounded-lg space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">
                          {t('agenda')} — {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
                        </p>
                        <div className="flex gap-1">
                          <Input
                            placeholder={t('newTask')} value={newCalendarTaskText}
                            onChange={(e) => setNewCalendarTaskText(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddCalendarTask()}
                            className="h-7 text-xs bg-background/50"
                          />
                          <Button size="sm" className="h-7 px-2" onClick={handleAddCalendarTask}>
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        {tasksForSelectedDate.length > 0 && (
                          <div className="space-y-1">
                            {tasksForSelectedDate.map(task => (
                              <div key={task.id} className={cn("flex items-center gap-2 p-1.5 rounded group", task.completed ? "opacity-60" : "")}>
                                <button onClick={() => onToggleCalendarTask(task.id)}
                                  className={cn("w-3.5 h-3.5 rounded border-2 flex items-center justify-center transition-colors shrink-0",
                                    task.completed ? "bg-success border-success text-success-foreground" : "border-muted-foreground hover:border-primary"
                                  )}>
                                  {task.completed && <span className="text-[8px]">✓</span>}
                                </button>
                                <span className={cn("flex-1 text-xs text-sidebar-foreground", task.completed && "line-through")}>{task.text}</span>
                                {task.reminderTime && <span className="text-[10px] text-primary">⏰ {task.reminderTime}</span>}
                                <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => onDeleteCalendarTask(task.id)}>
                                  <Trash2 className="h-2.5 w-2.5" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                        {getNotesForDate(selectedDate).length > 0 && (
                          <div className="pt-1 border-t border-border">
                            <p className="text-xs text-muted-foreground mb-1">{t('linkedNotes')}</p>
                            {getNotesForDate(selectedDate).map(note => (
                              <button key={note.id} onClick={() => onSelectNote(note.id)} className="text-xs text-sidebar-foreground hover:text-primary block">
                                📝 {note.title}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* Todos */}
              <Collapsible open={todosOpen} onOpenChange={setTodosOpen}>
                <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 rounded-lg hover:bg-sidebar-accent text-sm font-medium text-sidebar-foreground">
                  {todosOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  <CheckSquare className="h-4 w-4" />
                  <span>{t('tasks')}</span>
                  <span className="ml-auto text-xs text-muted-foreground">{todos.filter(t => !t.completed).length}</span>
                </CollapsibleTrigger>
                <CollapsibleContent className="pl-4 pt-2 space-y-2 animate-fade-in">
                  <div className="flex gap-2">
                    <Input placeholder={t('newTask')} value={newTodoText}
                      onChange={(e) => setNewTodoText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddTodo()}
                      className="h-8 text-sm bg-sidebar-accent/50"
                    />
                    <Button size="sm" className="h-8 px-2" onClick={handleAddTodo}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="space-y-1">
                    {todos.map(todo => (
                      <div key={todo.id} className={cn("flex items-center gap-2 p-2 rounded-lg group", todo.completed ? "opacity-60" : "")}>
                        <button onClick={() => onToggleTodo(todo.id)}
                          className={cn("w-4 h-4 rounded border-2 flex items-center justify-center transition-colors",
                            todo.completed ? "bg-success border-success text-success-foreground" : "border-muted-foreground hover:border-primary"
                          )}>
                          {todo.completed && <span className="text-xs">✓</span>}
                        </button>
                        <span className={cn("flex-1 text-sm text-sidebar-foreground", todo.completed && "line-through")}>{todo.text}</span>
                        <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => onDeleteTodo(todo.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* Templates Shortcut */}
              {onOpenTemplates && (
                <div className="pt-1">
                  <Button variant="ghost" size="sm" className="w-full gap-2 justify-start text-sidebar-foreground" onClick={onOpenTemplates}>
                    <BookOpen className="h-4 w-4" />
                    <span className="text-sm">{t('templates') || 'Templates'}</span>
                  </Button>
                </div>
              )}

              {/* Customization Panel */}
              <div className="pt-2 border-t border-sidebar-border">
                <CustomizationPanel />
              </div>
            </>
          )}
        </div>
      </ScrollArea>

      {/* Trash button */}
      {onShowTrash && (
        <div className="px-3 pt-2">
          <Button variant="ghost" size="sm" className="w-full gap-2 text-muted-foreground" onClick={onShowTrash}>
            <Trash2 className="h-4 w-4" />
            {t('trash')}
            {trashedNotes && trashedNotes.length > 0 && (
              <span className="ml-auto text-xs bg-destructive/20 text-destructive px-1.5 py-0.5 rounded-full">{trashedNotes.length}</span>
            )}
          </Button>
        </div>
      )}

      {/* Sign out button */}
      {onSignOut && (
        <div className="p-3 border-t border-sidebar-border">
          <Button variant="ghost" size="sm" className="w-full gap-2 text-muted-foreground" onClick={onSignOut}>
            <LogOut className="h-4 w-4" />
            {t('logout')}
          </Button>
        </div>
      )}

      {/* New Folder Dialog */}
      <Dialog open={newFolderDialogOpen} onOpenChange={setNewFolderDialogOpen}>
        <DialogContent className="sm:max-w-[320px]">
          <DialogHeader>
            <DialogTitle>{newFolderParentId ? t('newSubfolder') : t('newFolder')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <Input placeholder={t('folderName')} value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
            />
            <div className="space-y-2">
              <span className="text-sm text-muted-foreground">{t('color')}</span>
              <div className="flex gap-2 flex-wrap">
                {FOLDER_COLORS.map(color => (
                  <button key={color} onClick={() => setNewFolderColor(color)}
                    className={cn("w-7 h-7 rounded-full border-2 transition-transform hover:scale-110",
                      newFolderColor === color ? "border-primary scale-110" : "border-transparent"
                    )} style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
            <Button onClick={handleCreateFolder} className="w-full">{t('createFolder')}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Folder Dialog */}
      <Dialog open={!!editFolderDialog} onOpenChange={(open) => !open && setEditFolderDialog(null)}>
        <DialogContent className="sm:max-w-[320px]">
          <DialogHeader>
            <DialogTitle>{t('editFolder')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <Input placeholder={t('folderName')} value={editFolderName}
              onChange={(e) => setEditFolderName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleEditFolder()}
            />
            <div className="space-y-2">
              <span className="text-sm text-muted-foreground">{t('color')}</span>
              <div className="flex gap-2 flex-wrap">
                {FOLDER_COLORS.map(color => (
                  <button key={color} onClick={() => setEditFolderColor(color)}
                    className={cn("w-7 h-7 rounded-full border-2 transition-transform hover:scale-110",
                      editFolderColor === color ? "border-primary scale-110" : "border-transparent"
                    )} style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
            <Button onClick={handleEditFolder} className="w-full">{t('save')}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rename Note Dialog */}
      <Dialog open={!!renameNoteDialog} onOpenChange={(open) => !open && setRenameNoteDialog(null)}>
        <DialogContent className="sm:max-w-[320px]">
          <DialogHeader>
            <DialogTitle>{t('rename')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <Input value={renameNoteTitle}
              onChange={(e) => setRenameNoteTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleRenameNote()}
              autoFocus
            />
            <Button onClick={handleRenameNote} className="w-full">{t('save')}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Recursive folder item component
function FolderItem({
  folder, folders, notes, selectedNoteId, onSelectNote, onDeleteNote, onCreateNote,
  onDeleteFolder, onEditFolder, onCreateSubfolder, onUpdateFolder,
  getChildFolders, getNotesByFolder, onMoveNote, onRenameNote, t,
}: {
  folder: Folder; folders: Folder[]; notes: Note[]; selectedNoteId: string | null;
  onSelectNote: (id: string) => void; onDeleteNote: (id: string) => void;
  onCreateNote: (type?: NoteType, folderId?: string | null) => void;
  onDeleteFolder: (id: string) => void; onEditFolder: (folder: Folder) => void;
  onCreateSubfolder: (parentId: string) => void;
  onUpdateFolder: (id: string, updates: Partial<Omit<Folder, 'id'>>) => void;
  getChildFolders: (parentId: string | null) => Folder[];
  getNotesByFolder: (folderId: string | null) => Note[];
  onMoveNote?: (noteId: string, folderId: string | null) => void;
  onRenameNote?: (note: Note) => void;
  t: (key: string) => string;
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const childFolders = getChildFolders(folder.id);
  const folderNotes = getNotesByFolder(folder.id);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };
  const handleDragLeave = () => setIsDragOver(false);
  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const noteId = e.dataTransfer.getData('noteId');
    if (noteId && onMoveNote) onMoveNote(noteId, folder.id);
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <Collapsible>
          <div onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
            <CollapsibleTrigger className={cn(
              "flex items-center gap-2 w-full p-2 rounded-lg hover:bg-sidebar-accent text-sm transition-colors",
              isDragOver && "bg-primary/20 ring-1 ring-primary"
            )}>
              <ChevronRight className="h-3 w-3" />
              <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: folder.color }} />
              <span className="text-sidebar-foreground truncate">{folder.name}</span>
              <span className="ml-auto text-xs text-muted-foreground">{folderNotes.length}</span>
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent className="pl-6 space-y-1">
            {childFolders.map(child => (
              <FolderItem
                key={child.id} folder={child} folders={folders} notes={notes}
                selectedNoteId={selectedNoteId} onSelectNote={onSelectNote}
                onDeleteNote={onDeleteNote} onCreateNote={onCreateNote}
                onDeleteFolder={onDeleteFolder} onEditFolder={onEditFolder}
                onCreateSubfolder={onCreateSubfolder} onUpdateFolder={onUpdateFolder}
                getChildFolders={getChildFolders} getNotesByFolder={getNotesByFolder}
                onMoveNote={onMoveNote} onRenameNote={onRenameNote} t={t}
              />
            ))}
            {folderNotes.map(note => (
              <NoteItem 
                key={note.id} note={note} isSelected={note.id === selectedNoteId}
                onSelect={() => onSelectNote(note.id)} onDelete={() => onDeleteNote(note.id)}
                folders={folders} onMoveNote={onMoveNote}
                onRename={() => onRenameNote?.(note)} t={t}
              />
            ))}
          </CollapsibleContent>
        </Collapsible>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={() => onCreateNote('text', folder.id)}>
          <FileText className="h-4 w-4 mr-2" />{t('newNote')}
        </ContextMenuItem>
        <ContextMenuItem onClick={() => onCreateNote('drawing', folder.id)}>
          <Pencil className="h-4 w-4 mr-2" />{t('newDrawing')}
        </ContextMenuItem>
        <ContextMenuItem onClick={() => onCreateNote('workflow', folder.id)}>
          <GitBranch className="h-4 w-4 mr-2" />{t('newWorkflow')}
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={() => onCreateSubfolder(folder.id)}>
          <FolderPlus className="h-4 w-4 mr-2" />{t('newSubfolder')}
        </ContextMenuItem>
        <ContextMenuItem onClick={() => onEditFolder(folder)}>
          <Edit3 className="h-4 w-4 mr-2" />{t('editFolder')}
        </ContextMenuItem>
        {folder.parentId && (
          <ContextMenuItem onClick={() => onUpdateFolder(folder.id, { parentId: null })}>
            <FolderMinus className="h-4 w-4 mr-2" />{t('moveToRoot')}
          </ContextMenuItem>
        )}
        <ContextMenuSeparator />
        <ContextMenuItem onClick={() => onDeleteFolder(folder.id)} className="text-destructive focus:text-destructive">
          <Trash2 className="h-4 w-4 mr-2" />{t('deleteFolder')}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

function NoteItem({ 
  note, isSelected, onSelect, onDelete, folders, onMoveNote, onRename, t
}: { 
  note: Note; isSelected: boolean; onSelect: () => void; onDelete: () => void;
  folders?: Folder[]; onMoveNote?: (noteId: string, folderId: string | null) => void;
  onRename?: () => void; t?: (key: string) => string;
}) {
  const handleDragStart = (e: DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData('noteId', note.id);
    e.dataTransfer.effectAllowed = 'move';
    // Create a drag image to prevent text selection
    const dragImage = document.createElement('div');
    dragImage.textContent = note.title;
    dragImage.className = 'fixed -top-[1000px] bg-card px-3 py-1.5 rounded-lg text-sm shadow-lg border border-border';
    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, 0, 0);
    setTimeout(() => document.body.removeChild(dragImage), 0);
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <div
          className={cn(
            "group flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all select-none",
            isSelected 
              ? "bg-primary/15 text-primary" 
              : "hover:bg-note-hover text-sidebar-foreground",
            note.password && "border-l-2 border-primary/50"
          )}
          onClick={onSelect}
          draggable
          onDragStart={handleDragStart}
        >
          {note.password ? (
            <span className="h-4 w-4 shrink-0 text-xs flex items-center justify-center">🔒</span>
          ) : (
            <FileText className="h-4 w-4 shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{note.title}</p>
            <p className="text-xs text-muted-foreground truncate">
              {format(note.updatedAt, 'dd MMM', { locale: ptBR })}
            </p>
          </div>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={onSelect}>
          <FileText className="h-4 w-4 mr-2" />{t?.('edit') || 'Edit'}
        </ContextMenuItem>
        {onRename && (
          <ContextMenuItem onClick={onRename}>
            <Edit3 className="h-4 w-4 mr-2" />{t?.('rename') || 'Rename'}
          </ContextMenuItem>
        )}
        {folders && onMoveNote && (
          <ContextMenuSub>
            <ContextMenuSubTrigger>
              <FolderInput className="h-4 w-4 mr-2" />{t?.('moveToFolder') || 'Move to folder'}
            </ContextMenuSubTrigger>
            <ContextMenuSubContent>
              <ContextMenuItem onClick={() => onMoveNote(note.id, null)}>
                <span className="text-muted-foreground">{t?.('noFolder') || 'No folder'}</span>
              </ContextMenuItem>
              {folders.map(f => (
                <ContextMenuItem key={f.id} onClick={() => onMoveNote(note.id, f.id)}>
                  <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: f.color }} />
                  {f.name}
                </ContextMenuItem>
              ))}
            </ContextMenuSubContent>
          </ContextMenuSub>
        )}
        <ContextMenuSeparator />
        <ContextMenuItem onClick={(e) => { e.stopPropagation(); onDelete(); }} className="text-destructive focus:text-destructive">
          <Trash2 className="h-4 w-4 mr-2" />{t?.('delete') || 'Delete'}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
