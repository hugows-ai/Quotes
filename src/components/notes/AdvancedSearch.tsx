import { useState } from 'react';
import { Search, Filter, X, FileText, Pencil, GitBranch, Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Note, Folder, NoteType } from '@/types/notes';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useTranslations } from '@/hooks/useTranslations';

interface AdvancedSearchProps {
  notes: Note[];
  folders: Folder[];
  onSelectNote: (id: string) => void;
  onClose: () => void;
}

export function AdvancedSearch({ notes, folders, onSelectNote, onClose }: AdvancedSearchProps) {
  const { t } = useTranslations();
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<NoteType | 'all'>('all');
  const [folderFilter, setFolderFilter] = useState<string | 'all'>('all');
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [showFilters, setShowFilters] = useState(false);

  const filteredNotes = notes.filter(note => {
    // Text query
    if (query) {
      const q = query.toLowerCase();
      const matchesText = note.title.toLowerCase().includes(q) || note.content.toLowerCase().includes(q);
      if (!matchesText) return false;
    }

    // Type filter
    if (typeFilter !== 'all' && note.type !== typeFilter) return false;

    // Folder filter
    if (folderFilter !== 'all') {
      if (folderFilter === 'none' && note.folderId !== null) return false;
      if (folderFilter !== 'none' && note.folderId !== folderFilter) return false;
    }

    // Date range
    if (dateFrom && note.updatedAt < dateFrom) return false;
    if (dateTo) {
      const endOfDay = new Date(dateTo);
      endOfDay.setHours(23, 59, 59, 999);
      if (note.updatedAt > endOfDay) return false;
    }

    return true;
  });

  const getTypeIcon = (type: NoteType) => {
    switch (type) {
      case 'text': return <FileText className="h-3.5 w-3.5" />;
      case 'drawing': return <Pencil className="h-3.5 w-3.5" />;
      case 'workflow': return <GitBranch className="h-3.5 w-3.5" />;
    }
  };

  const activeFilters = (typeFilter !== 'all' ? 1 : 0) + (folderFilter !== 'all' ? 1 : 0) + (dateFrom ? 1 : 0) + (dateTo ? 1 : 0);

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col">
      <div className="max-w-2xl w-full mx-auto p-6 flex flex-col h-full">
        {/* Search header */}
        <div className="flex items-center gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('searchPlaceholder')}
              className="pl-9 h-10"
              autoFocus
            />
          </div>
          <Button
            variant={showFilters ? 'default' : 'outline'}
            size="icon"
            className="h-10 w-10 relative"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4" />
            {activeFilters > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center">
                {activeFilters}
              </span>
            )}
          </Button>
          <Button variant="ghost" size="icon" className="h-10 w-10" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="mb-4 p-3 rounded-lg border border-border bg-card space-y-3 animate-fade-in">
            <div className="flex flex-wrap gap-2">
              <Label className="text-xs text-muted-foreground w-full">{t('filterByType')}</Label>
              {(['all', 'text', 'drawing', 'workflow'] as const).map(type => (
                <Button
                  key={type}
                  variant={typeFilter === type ? 'default' : 'outline'}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setTypeFilter(type)}
                >
                  {type === 'all' ? t('allTypes') : t(type === 'text' ? 'textNote' : type === 'drawing' ? 'drawing' : 'workflow')}
                </Button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <Label className="text-xs text-muted-foreground w-full">{t('filterByFolder')}</Label>
              <Button
                variant={folderFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setFolderFilter('all')}
              >
                {t('allFolders')}
              </Button>
              <Button
                variant={folderFilter === 'none' ? 'default' : 'outline'}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setFolderFilter('none')}
              >
                {t('noFolder')}
              </Button>
              {folders.map(folder => (
                <Button
                  key={folder.id}
                  variant={folderFilter === folder.id ? 'default' : 'outline'}
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={() => setFolderFilter(folder.id)}
                >
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: folder.color }} />
                  {folder.name}
                </Button>
              ))}
            </div>
            <div className="flex gap-4">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">{t('dateFrom')}</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                      <CalendarIcon className="h-3 w-3" />
                      {dateFrom ? format(dateFrom, 'dd/MM/yy') : '—'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} locale={ptBR} />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">{t('dateTo')}</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                      <CalendarIcon className="h-3 w-3" />
                      {dateTo ? format(dateTo, 'dd/MM/yy') : '—'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={dateTo} onSelect={setDateTo} locale={ptBR} />
                  </PopoverContent>
                </Popover>
              </div>
              {(dateFrom || dateTo) && (
                <Button variant="ghost" size="sm" className="h-7 text-xs self-end" onClick={() => { setDateFrom(undefined); setDateTo(undefined); }}>
                  {t('clearDates')}
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Results */}
        <div className="flex-1 overflow-auto space-y-1">
          <p className="text-xs text-muted-foreground mb-2">
            {filteredNotes.length} {t('results')}
          </p>
          {filteredNotes.map(note => {
            const folder = folders.find(f => f.id === note.folderId);
            return (
              <button
                key={note.id}
                className="w-full text-left p-3 rounded-lg hover:bg-accent/10 border border-transparent hover:border-border transition-colors"
                onClick={() => { onSelectNote(note.id); onClose(); }}
              >
                <div className="flex items-center gap-2">
                  {getTypeIcon(note.type)}
                  <span className="font-medium text-sm">{note.title}</span>
                  {folder && (
                    <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: folder.color }} />
                      {folder.name}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{note.content.substring(0, 100)}</p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {format(note.updatedAt, "dd MMM yyyy", { locale: ptBR })}
                </p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
