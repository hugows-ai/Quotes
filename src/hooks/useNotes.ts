import { useState, useEffect, useCallback, useRef } from 'react';
import { Note, Folder, Todo, CalendarTask } from '@/types/notes';

const STORAGE_KEYS = {
  notes: 'notes-app-notes',
  folders: 'notes-app-folders',
  todos: 'notes-app-todos',
  calendarTasks: 'notes-app-calendar-tasks',
};

const getDefaultFolders = (): Folder[] => {
  const lang = localStorage.getItem('notes-app-language') || 'pt-BR';
  const names: Record<string, { personal: string; work: string; ideas: string }> = {
    'pt-BR': { personal: 'Pessoal', work: 'Trabalho', ideas: 'Ideias' },
    'en': { personal: 'Personal', work: 'Work', ideas: 'Ideas' },
    'es': { personal: 'Personal', work: 'Trabajo', ideas: 'Ideas' },
  };
  const t = names[lang] || names['pt-BR'];
  return [
    { id: 'personal', name: t.personal, color: '#f59e0b', parentId: null },
    { id: 'work', name: t.work, color: '#3b82f6', parentId: null },
    { id: 'ideas', name: t.ideas, color: '#10b981', parentId: null },
  ];
};

const defaultNotes: Note[] = [
  {
    id: '1',
    title: 'Bem-vindo ao Quotes!',
    content: `# Bem-vindo ao Quotes! 🎉\n\nEste é seu novo aplicativo de notas.\n\n## Organização\n\n- Crie pastas para organizar suas notas\n- Vincule notas a datas no calendário\n\n## Tarefas\n\nAdicione tarefas e marque como concluídas!\n\nAproveite sua experiência de escrita! ✨`,
    type: 'text',
    folderId: 'personal',
    tags: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    linkedDate: null,
  },
];

interface UseNotesOptions {
  /** When true, skip localStorage loading — data will be set externally from cloud */
  cloudMode?: boolean;
}

export function useNotes(options?: UseNotesOptions) {
  const cloudMode = options?.cloudMode ?? false;
  const [notes, setNotes] = useState<Note[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [calendarTasks, setCalendarTasks] = useState<CalendarTask[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [dataReady, setDataReady] = useState(false);
  const initializedRef = useRef(false);

  // Load from localStorage only for guest mode
  useEffect(() => {
    if (initializedRef.current) return;
    if (cloudMode) {
      // In cloud mode, start empty — data will be loaded from cloud
      initializedRef.current = true;
      return;
    }
    initializedRef.current = true;

    const savedNotes = localStorage.getItem(STORAGE_KEYS.notes);
    const savedFolders = localStorage.getItem(STORAGE_KEYS.folders);
    const savedTodos = localStorage.getItem(STORAGE_KEYS.todos);

    if (savedNotes) {
      const parsed = JSON.parse(savedNotes);
      setNotes(parsed.map((n: Note) => ({
        ...n,
        createdAt: new Date(n.createdAt),
        updatedAt: new Date(n.updatedAt),
        linkedDate: n.linkedDate ? new Date(n.linkedDate) : null,
      })));
    } else {
      setNotes(defaultNotes);
    }

    if (savedFolders) {
      const parsed = JSON.parse(savedFolders);
      setFolders(parsed.map((f: Folder) => ({
        ...f,
        parentId: f.parentId || null,
      })));
    } else {
      setFolders(getDefaultFolders());
    }

    if (savedTodos) {
      const parsed = JSON.parse(savedTodos);
      setTodos(parsed.map((t: Todo) => ({
        ...t,
        createdAt: new Date(t.createdAt),
      })));
    }

    const savedCalendarTasks = localStorage.getItem(STORAGE_KEYS.calendarTasks);
    if (savedCalendarTasks) {
      const parsed = JSON.parse(savedCalendarTasks);
      setCalendarTasks(parsed.map((t: CalendarTask) => ({
        ...t,
        createdAt: new Date(t.createdAt),
      })));
    }

    setDataReady(true);
  }, [cloudMode]);

  // Auto-save to localStorage only in guest mode
  useEffect(() => {
    if (cloudMode || !dataReady) return;
    if (notes.length > 0) {
      localStorage.setItem(STORAGE_KEYS.notes, JSON.stringify(notes));
    }
  }, [notes, cloudMode, dataReady]);

  useEffect(() => {
    if (cloudMode || !dataReady) return;
    if (folders.length > 0) {
      localStorage.setItem(STORAGE_KEYS.folders, JSON.stringify(folders));
    }
  }, [folders, cloudMode, dataReady]);

  useEffect(() => {
    if (cloudMode || !dataReady) return;
    localStorage.setItem(STORAGE_KEYS.todos, JSON.stringify(todos));
  }, [todos, cloudMode, dataReady]);

  useEffect(() => {
    if (cloudMode || !dataReady) return;
    localStorage.setItem(STORAGE_KEYS.calendarTasks, JSON.stringify(calendarTasks));
  }, [calendarTasks, cloudMode, dataReady]);

  // Method to mark data as ready after cloud load
  const markDataReady = useCallback(() => {
    setDataReady(true);
  }, []);

  const selectedNote = notes.find(n => n.id === selectedNoteId) || null;

  const createNote = useCallback((type: Note['type'] = 'text', folderId: string | null = null) => {
    const newNote: Note = {
      id: crypto.randomUUID(),
      title: type === 'drawing' ? 'Novo Desenho' : type === 'workflow' ? 'Novo Workflow' : 'Nova Nota',
      content: '',
      type,
      folderId,
      tags: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      linkedDate: null,
    };
    setNotes(prev => [newNote, ...prev]);
    setSelectedNoteId(newNote.id);
    return newNote;
  }, []);

  const updateNote = useCallback((id: string, updates: Partial<Note>) => {
    setNotes(prev => prev.map(note => 
      note.id === id 
        ? { ...note, ...updates, updatedAt: new Date() }
        : note
    ));
  }, []);

  const deleteNote = useCallback((id: string) => {
    setNotes(prev => prev.filter(note => note.id !== id));
    if (selectedNoteId === id) {
      setSelectedNoteId(null);
    }
  }, [selectedNoteId]);

  const createFolder = useCallback((name: string, color: string, parentId: string | null = null) => {
    const newFolder: Folder = {
      id: crypto.randomUUID(),
      name,
      color,
      parentId,
    };
    setFolders(prev => [...prev, newFolder]);
    return newFolder;
  }, []);

  const updateFolder = useCallback((id: string, updates: Partial<Omit<Folder, 'id'>>) => {
    setFolders(prev => prev.map(f =>
      f.id === id ? { ...f, ...updates } : f
    ));
  }, []);

  const deleteFolder = useCallback((id: string) => {
    const getDescendants = (folderId: string): string[] => {
      const children = folders.filter(f => f.parentId === folderId);
      return children.reduce<string[]>(
        (acc, child) => [...acc, child.id, ...getDescendants(child.id)],
        []
      );
    };
    const allIds = [id, ...getDescendants(id)];
    
    setFolders(prev => prev.filter(f => !allIds.includes(f.id)));
    setNotes(prev => prev.map(note => 
      note.folderId && allIds.includes(note.folderId) ? { ...note, folderId: null } : note
    ));
  }, [folders]);

  const addTodo = useCallback((text: string, noteId: string | null = null) => {
    const newTodo: Todo = {
      id: crypto.randomUUID(),
      text,
      completed: false,
      noteId,
      createdAt: new Date(),
    };
    setTodos(prev => [...prev, newTodo]);
    return newTodo;
  }, []);

  const toggleTodo = useCallback((id: string) => {
    setTodos(prev => prev.map(todo =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    ));
  }, []);

  const deleteTodo = useCallback((id: string) => {
    setTodos(prev => prev.filter(t => t.id !== id));
  }, []);

  const addCalendarTask = useCallback((text: string, date: string, reminderTime?: string) => {
    const newTask: CalendarTask = {
      id: crypto.randomUUID(),
      text,
      completed: false,
      date,
      createdAt: new Date(),
      reminderTime,
      reminderNotified: false,
    };
    setCalendarTasks(prev => [...prev, newTask]);
    return newTask;
  }, []);

  const toggleCalendarTask = useCallback((id: string) => {
    setCalendarTasks(prev => prev.map(task =>
      task.id === id ? { ...task, completed: !task.completed } : task
    ));
  }, []);

  const deleteCalendarTask = useCallback((id: string) => {
    setCalendarTasks(prev => prev.filter(t => t.id !== id));
  }, []);

  const getCalendarTasksForDate = useCallback((date: string) => {
    return calendarTasks.filter(t => t.date === date);
  }, [calendarTasks]);

  const filteredNotes = notes.filter(note => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      note.title.toLowerCase().includes(query) ||
      note.content.toLowerCase().includes(query) ||
      note.tags.some(tag => tag.toLowerCase().includes(query))
    );
  });

  const getNotesForDate = useCallback((date: Date) => {
    return notes.filter(note => {
      if (!note.linkedDate) return false;
      return (
        note.linkedDate.getDate() === date.getDate() &&
        note.linkedDate.getMonth() === date.getMonth() &&
        note.linkedDate.getFullYear() === date.getFullYear()
      );
    });
  }, [notes]);

  return {
    notes: filteredNotes,
    allNotes: notes,
    folders,
    todos,
    calendarTasks,
    selectedNote,
    selectedNoteId,
    searchQuery,
    dataReady,
    setSelectedNoteId,
    setSearchQuery,
    setNotes,
    setFolders,
    setTodos,
    setCalendarTasks,
    createNote,
    updateNote,
    deleteNote,
    createFolder,
    updateFolder,
    deleteFolder,
    addTodo,
    toggleTodo,
    deleteTodo,
    addCalendarTask,
    toggleCalendarTask,
    deleteCalendarTask,
    getCalendarTasksForDate,
    getNotesForDate,
    markDataReady,
  };
}
