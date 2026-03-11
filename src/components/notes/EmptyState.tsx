import { FileText, Plus, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslations } from '@/hooks/useTranslations';

export interface EmptyStateProps {
  onCreateNote: () => void;
  onImportNotes?: () => void;
}

export function EmptyState({ onCreateNote, onImportNotes }: EmptyStateProps) {
  const { t } = useTranslations();
  
  return (
    <div className="flex-1 flex items-center justify-center bg-background">
      <div className="text-center animate-fade-in">
        <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-6">
          <FileText className="w-10 h-10 text-muted-foreground" />
        </div>
        <h2 className="text-2xl font-semibold mb-2">{t('noNoteSelected')}</h2>
        <p className="text-muted-foreground mb-6 max-w-sm">{t('noNoteSelectedDesc')}</p>
        <div className="flex items-center justify-center gap-3">
          <Button onClick={onCreateNote} className="gap-2">
            <Plus className="h-4 w-4" />
            {t('createNewNote')}
          </Button>
          {onImportNotes && (
            <Button variant="outline" onClick={onImportNotes} className="gap-2">
              <Upload className="h-4 w-4" />
              {t('importNotes')}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
