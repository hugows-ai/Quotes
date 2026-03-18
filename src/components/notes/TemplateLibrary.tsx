import { useState, useEffect } from 'react';
import { BookOpen, Search, Plus, X, Eye, FileText, Briefcase, GraduationCap, ListTodo, User2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useTranslations } from '@/hooks/useTranslations';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Template {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  is_system: boolean;
  user_id: string | null;
}

const CATEGORIES = [
  { id: 'all', icon: Sparkles },
  { id: 'study', icon: GraduationCap },
  { id: 'work', icon: Briefcase },
  { id: 'productivity', icon: ListTodo },
  { id: 'planning', icon: FileText },
  { id: 'personal', icon: User2 },
];

const CATEGORY_LABELS: Record<string, Record<string, string>> = {
  'pt-BR': { all: 'Todos', study: 'Estudos', work: 'Trabalho', productivity: 'Produtividade', planning: 'Planejamento', personal: 'Pessoal' },
  'en': { all: 'All', study: 'Study', work: 'Work', productivity: 'Productivity', planning: 'Planning', personal: 'Personal' },
  'es': { all: 'Todos', study: 'Estudios', work: 'Trabajo', productivity: 'Productividad', planning: 'Planificación', personal: 'Personal' },
};

// Built-in templates (used when no DB templates exist or user is guest)
const BUILT_IN_TEMPLATES: Omit<Template, 'id' | 'user_id'>[] = [
  {
    title: 'My First Note',
    content: '# My First Note\n\nWelcome! Start writing your thoughts here.\n\n## Ideas\n- \n\n## Notes\n\n',
    category: 'personal',
    tags: ['starter'],
    is_system: true,
  },
  {
    title: 'Task List',
    content: '# Task List\n\n## Priority\n- [ ] High priority task\n- [ ] Another important task\n\n## Later\n- [ ] Task for later\n- [ ] Nice to have\n\n## Done\n- [x] Completed task\n',
    category: 'productivity',
    tags: ['tasks', 'todo'],
    is_system: true,
  },
  {
    title: 'Weekly Planner',
    content: '# Weekly Planner\n\n## Monday\n- \n\n## Tuesday\n- \n\n## Wednesday\n- \n\n## Thursday\n- \n\n## Friday\n- \n\n## Weekend\n- \n\n## Goals this week\n1. \n2. \n3. \n',
    category: 'planning',
    tags: ['planner', 'weekly'],
    is_system: true,
  },
  {
    title: 'Study Notes Template',
    content: '# Subject: \n\n## Key Concepts\n1. \n2. \n3. \n\n## Summary\n\n\n## Questions\n- \n\n## References\n- \n',
    category: 'study',
    tags: ['study', 'notes'],
    is_system: true,
  },
  {
    title: 'Meeting Notes',
    content: '# Meeting Notes\n\n**Date:** \n**Attendees:** \n\n## Agenda\n1. \n\n## Discussion\n\n\n## Action Items\n- [ ] \n\n## Next Steps\n\n',
    category: 'work',
    tags: ['meeting', 'work'],
    is_system: true,
  },
  {
    title: 'Project Brief',
    content: '# Project Brief\n\n## Overview\n\n\n## Objectives\n1. \n2. \n3. \n\n## Timeline\n| Phase | Date | Status |\n|-------|------|--------|\n| Planning | | |\n| Execution | | |\n| Review | | |\n\n## Resources\n- \n',
    category: 'work',
    tags: ['project', 'planning'],
    is_system: true,
  },
  {
    title: 'Daily Journal',
    content: '# Daily Journal\n\n**Date:** \n\n## Gratitude\n1. \n2. \n3. \n\n## Today\'s Goals\n- [ ] \n\n## Reflections\n\n\n## Tomorrow\n- \n',
    category: 'personal',
    tags: ['journal', 'daily'],
    is_system: true,
  },
  {
    title: 'Flashcards',
    content: '# Flashcards: \n\n---\n\n**Q:** \n**A:** \n\n---\n\n**Q:** \n**A:** \n\n---\n\n**Q:** \n**A:** \n\n---\n\n*Add more cards as needed*\n',
    category: 'study',
    tags: ['flashcards', 'study'],
    is_system: true,
  },
];

interface TemplateLibraryProps {
  open: boolean;
  onClose: () => void;
  onUseTemplate: (title: string, content: string) => void;
  currentNoteTitle?: string;
  currentNoteContent?: string;
}

export function TemplateLibrary({ open, onClose, onUseTemplate, currentNoteTitle, currentNoteContent }: TemplateLibraryProps) {
  const { t, language } = useTranslations();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);

  const categoryLabels = CATEGORY_LABELS[language] || CATEGORY_LABELS['en'];

  useEffect(() => {
    if (!open) return;
    loadTemplates();
  }, [open, user]);

  const loadTemplates = async () => {
    // Start with built-in templates
    const builtIn: Template[] = BUILT_IN_TEMPLATES.map((t, i) => ({
      ...t,
      id: `builtin-${i}`,
      user_id: null,
    }));

    if (user) {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('note_templates')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (!error && data) {
          const dbTemplates: Template[] = data.map((d: any) => ({
            id: d.id,
            title: d.title,
            content: d.content,
            category: d.category,
            tags: d.tags || [],
            is_system: d.is_system,
            user_id: d.user_id,
          }));
          setTemplates([...dbTemplates, ...builtIn]);
        } else {
          setTemplates(builtIn);
        }
      } catch {
        setTemplates(builtIn);
      } finally {
        setLoading(false);
      }
    } else {
      setTemplates(builtIn);
    }
  };

  const handleSaveAsTemplate = async () => {
    if (!user || !currentNoteTitle) {
      toast.error('Sign in to save templates');
      return;
    }

    try {
      const { error } = await supabase.from('note_templates').insert({
        title: currentNoteTitle,
        content: currentNoteContent || '',
        category: 'personal',
        tags: [],
        is_system: false,
        user_id: user.id,
      } as any);

      if (error) throw error;
      toast.success(t('saved'));
      loadTemplates();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (templateId.startsWith('builtin-')) return;
    try {
      const { error } = await supabase.from('note_templates').delete().eq('id', templateId);
      if (error) throw error;
      toast.success(t('delete'));
      loadTemplates();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const filtered = templates.filter(t => {
    if (selectedCategory !== 'all' && t.category !== selectedCategory) return false;
    if (search) {
      const q = search.toLowerCase();
      return t.title.toLowerCase().includes(q) || t.content.toLowerCase().includes(q) || t.tags.some(tag => tag.toLowerCase().includes(q));
    }
    return true;
  });

  // Sanitize content - strip any script tags
  const sanitizeContent = (content: string) => {
    return content.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl h-[80vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-6 pb-4 shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Templates
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 pb-3 flex gap-2 shrink-0">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('search')}
              className="pl-9 h-9"
            />
          </div>
          {currentNoteTitle && user && (
            <Button variant="outline" size="sm" className="gap-1.5 h-9" onClick={handleSaveAsTemplate}>
              <Plus className="h-3.5 w-3.5" />
              Save as template
            </Button>
          )}
        </div>

        {/* Categories */}
        <div className="px-6 pb-3 flex gap-1.5 overflow-x-auto shrink-0">
          {CATEGORIES.map(cat => {
            const Icon = cat.icon;
            return (
              <Button
                key={cat.id}
                variant={selectedCategory === cat.id ? 'default' : 'outline'}
                size="sm"
                className="gap-1.5 h-8 text-xs shrink-0"
                onClick={() => setSelectedCategory(cat.id)}
              >
                <Icon className="h-3.5 w-3.5" />
                {categoryLabels[cat.id] || cat.id}
              </Button>
            );
          })}
        </div>

        {/* Template grid */}
        <ScrollArea className="flex-1 px-6 pb-6">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              Loading...
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <BookOpen className="h-10 w-10 mb-3 opacity-30" />
              <p className="text-sm">No templates found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filtered.map(template => (
                <div
                  key={template.id}
                  className="group relative p-4 rounded-xl border border-border bg-card hover:border-primary/50 hover:shadow-sm transition-all cursor-pointer"
                  onClick={() => setPreviewTemplate(template)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-medium text-sm line-clamp-1">{template.title}</h3>
                    <Badge variant="secondary" className="text-[10px] shrink-0 ml-2">
                      {categoryLabels[template.category] || template.category}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-3 mb-3">
                    {template.content.substring(0, 120).replace(/[#*\[\]]/g, '')}
                  </p>
                  <div className="flex items-center gap-1.5">
                    {template.tags.slice(0, 3).map(tag => (
                      <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                        {tag}
                      </span>
                    ))}
                    {!template.is_system && !template.id.startsWith('builtin-') && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary ml-auto">
                        Custom
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Preview Dialog */}
        {previewTemplate && (
          <Dialog open={!!previewTemplate} onOpenChange={(o) => !o && setPreviewTemplate(null)}>
            <DialogContent className="max-w-lg max-h-[70vh] flex flex-col">
              <DialogHeader>
                <DialogTitle>{previewTemplate.title}</DialogTitle>
              </DialogHeader>
              <ScrollArea className="flex-1 mt-2">
                <pre className="text-sm whitespace-pre-wrap font-sans text-foreground/80 p-3 bg-muted rounded-lg">
                  {sanitizeContent(previewTemplate.content)}
                </pre>
              </ScrollArea>
              <div className="flex gap-2 mt-4">
                <Button
                  className="flex-1"
                  onClick={() => {
                    onUseTemplate(previewTemplate.title, sanitizeContent(previewTemplate.content));
                    setPreviewTemplate(null);
                    onClose();
                  }}
                >
                  Use Template
                </Button>
                {!previewTemplate.is_system && !previewTemplate.id.startsWith('builtin-') && user && (
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => {
                      handleDeleteTemplate(previewTemplate.id);
                      setPreviewTemplate(null);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  );
}
