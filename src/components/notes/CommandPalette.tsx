import { useState, useEffect, useMemo } from 'react';
import { FileText, Pencil, GitBranch, FolderOpen, Search, Plus, Settings, Moon, Sun, BookOpen } from 'lucide-react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { Note, Folder, Todo } from '@/types/notes';
import { useTranslations } from '@/hooks/useTranslations';

interface CommandPaletteProps {
  notes: Note[];
  folders: Folder[];
  todos: Todo[];
  onSelectNote: (id: string) => void;
  onCreateNote: (type: 'text' | 'drawing' | 'workflow') => void;
  onOpenAdvancedSearch: () => void;
  onOpenTemplates: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
}

export function CommandPalette({
  notes, folders, todos,
  onSelectNote, onCreateNote,
  onOpenAdvancedSearch, onOpenTemplates,
  isDark, onToggleTheme,
}: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const { t } = useTranslations();
  const toggleTheme = onToggleTheme;

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(o => !o);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'drawing': return <Pencil className="h-4 w-4 text-muted-foreground" />;
      case 'workflow': return <GitBranch className="h-4 w-4 text-muted-foreground" />;
      default: return <FileText className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const doAction = (fn: () => void) => {
    fn();
    setOpen(false);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder={t('search')} />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {/* Quick actions */}
        <CommandGroup heading="Actions">
          <CommandItem onSelect={() => doAction(() => onCreateNote('text'))}>
            <Plus className="mr-2 h-4 w-4" />
            {t('textNote')}
          </CommandItem>
          <CommandItem onSelect={() => doAction(() => onCreateNote('drawing'))}>
            <Pencil className="mr-2 h-4 w-4" />
            {t('drawing')}
          </CommandItem>
          <CommandItem onSelect={() => doAction(() => onCreateNote('workflow'))}>
            <GitBranch className="mr-2 h-4 w-4" />
            {t('workflow')}
          </CommandItem>
          <CommandItem onSelect={() => doAction(onOpenTemplates)}>
            <BookOpen className="mr-2 h-4 w-4" />
            Templates
          </CommandItem>
          <CommandItem onSelect={() => doAction(onOpenAdvancedSearch)}>
            <Search className="mr-2 h-4 w-4" />
            {t('advancedSearch')}
          </CommandItem>
          <CommandItem onSelect={() => doAction(toggleTheme)}>
            {isDark ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
            {isDark ? 'Light mode' : 'Dark mode'}
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        {/* Notes */}
        {notes.length > 0 && (
          <CommandGroup heading={t('allNotes')}>
            {notes.slice(0, 20).map(note => (
              <CommandItem
                key={note.id}
                onSelect={() => doAction(() => onSelectNote(note.id))}
              >
                {getTypeIcon(note.type)}
                <span className="ml-2">{note.title || t('noteTitle')}</span>
                {note.folderId && (
                  <span className="ml-auto text-xs text-muted-foreground">
                    {folders.find(f => f.id === note.folderId)?.name}
                  </span>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* Folders */}
        {folders.length > 0 && (
          <CommandGroup heading={t('folders')}>
            {folders.map(folder => (
              <CommandItem key={folder.id} onSelect={() => {}}>
                <FolderOpen className="mr-2 h-4 w-4" style={{ color: folder.color }} />
                {folder.name}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
