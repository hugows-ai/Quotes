import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  CalendarIcon,
  FolderOpen,
  Save,
  Type,
  Bold,
  Italic,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Download,
  Check,
  Focus,
  Lock,
  Eye,
  EyeOff,
  ImagePlus,
  Bot,
  Loader2,
  Layers
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Calendar } from '@/components/ui/calendar';
import { Note, Folder } from '@/types/notes';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DrawingCanvas } from './DrawingCanvas';
import { WorkflowEditor } from './WorkflowEditor';
import { MarkdownPreview } from './MarkdownPreview';
import { SetPasswordDialog } from './PasswordDialog';
import { AIAssistant } from './AIAssistant';
import { toast } from 'sonner';
import { useTranslations } from '@/hooks/useTranslations';
import { useCustomizationContext } from '@/hooks/customizationContext';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface NoteEditorProps {
  note: Note;
  folders: Folder[];
  onUpdate: (updates: Partial<Note>) => void;
  onFocusMode?: () => void;
}

export function NoteEditor({ note, folders, onUpdate, onFocusMode }: NoteEditorProps) {
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [isSaving, setIsSaving] = useState(false);
  const [isPreview, setIsPreview] = useState(false);
  const [showFormatting, setShowFormatting] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showSavedCheck, setShowSavedCheck] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [livePreview, setLivePreview] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const { t } = useTranslations();
  const { customization } = useCustomization();
  const { user } = useAuth();

  // Read auto-save setting
  const getAutoSaveSetting = () => {
    try {
      const stored = localStorage.getItem('notes-app-settings');
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.autoSave !== undefined ? parsed.autoSave : true;
      }
    } catch {}
    return true;
  };

  const [isAutoSave, setIsAutoSave] = useState(getAutoSaveSetting);

  // Listen for settings changes
  useEffect(() => {
    const handleStorage = () => setIsAutoSave(getAutoSaveSetting());
    window.addEventListener('storage', handleStorage);
    const interval = setInterval(() => setIsAutoSave(getAutoSaveSetting()), 1000);
    return () => {
      window.removeEventListener('storage', handleStorage);
      clearInterval(interval);
    };
  }, []);

  // Sync state when note changes
  useEffect(() => {
    setTitle(note.title);
    setContent(note.content);
  }, [note.id, note.title, note.content]);

  // Ctrl+S keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleManualSave();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [title, content]);

  // Auto-save with debounce
  const autoSave = useCallback((updates: Partial<Note>) => {
    if (!isAutoSave) {
      setHasUnsavedChanges(true);
      return;
    }
    setIsSaving(true);
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      onUpdate(updates);
      setIsSaving(false);
    }, 500);
  }, [onUpdate, isAutoSave]);

  const handleManualSave = useCallback(() => {
    onUpdate({ title, content });
    setHasUnsavedChanges(false);
    setShowSavedCheck(true);
    toast.success(t('savedSuccessfully'));
    setTimeout(() => setShowSavedCheck(false), 2000);
  }, [title, content, onUpdate, t]);

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    autoSave({ title: newTitle });
  };

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    autoSave({ content: newContent });
  };

  const insertMarkdown = (prefix: string, suffix: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    
    let newText: string;
    let newCursorStart: number;
    let newCursorEnd: number;

    if (selectedText) {
      newText = content.substring(0, start) + prefix + selectedText + suffix + content.substring(end);
      newCursorStart = start + prefix.length;
      newCursorEnd = end + prefix.length;
    } else {
      newText = content.substring(0, start) + prefix + suffix + content.substring(end);
      newCursorStart = start + prefix.length;
      newCursorEnd = start + prefix.length;
    }
    
    setContent(newText);
    autoSave({ content: newText });

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorStart, newCursorEnd);
    }, 0);
  };

  const insertListItem = (listPrefix: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const textBefore = content.substring(0, start);
    const textAfter = content.substring(start);
    
    const lastNewline = textBefore.lastIndexOf('\n');
    const currentLineStart = lastNewline + 1;
    const currentLine = textBefore.substring(currentLineStart);
    
    const bulletMatch = currentLine.match(/^- /);
    const numberedMatch = currentLine.match(/^(\d+)\. /);
    
    let newText: string;
    let cursorPos: number;
    
    if (listPrefix === '- ' && bulletMatch) {
      newText = textBefore + '\n- ' + textAfter;
      cursorPos = start + 3;
    } else if (listPrefix === '1. ' && numberedMatch) {
      const nextNum = parseInt(numberedMatch[1]) + 1;
      newText = textBefore + `\n${nextNum}. ` + textAfter;
      cursorPos = start + 2 + nextNum.toString().length + 1;
    } else {
      newText = textBefore + listPrefix + textAfter;
      cursorPos = start + listPrefix.length;
    }
    
    setContent(newText);
    autoSave({ content: newText });

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(cursorPos, cursorPos);
    }, 0);
  };

  const handleDrawingSave = (data: string) => {
    onUpdate({ drawingData: data });
  };

  const handleWorkflowSave = (data: string) => {
    onUpdate({ workflowData: data });
  };

  const handleImageUpload = useCallback(() => {
    if (!user) {
      toast.error(t('loginToUpload'));
      return;
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    input.onchange = async (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (!files) return;
      setUploadingImage(true);
      try {
        for (const file of Array.from(files)) {
          const ext = file.name.split('.').pop();
          const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
          const { error } = await supabase.storage
            .from('note-images')
            .upload(fileName, file);
          if (error) throw error;
          const { data: urlData } = supabase.storage
            .from('note-images')
            .getPublicUrl(fileName);
          const imageMarkdown = `\n![${file.name}](${urlData.publicUrl})\n`;
          const textarea = textareaRef.current;
          if (textarea) {
            const pos = textarea.selectionStart;
            const newContent = content.substring(0, pos) + imageMarkdown + content.substring(pos);
            setContent(newContent);
            autoSave({ content: newContent });
          } else {
            const newContent = content + imageMarkdown;
            setContent(newContent);
            autoSave({ content: newContent });
          }
        }
        toast.success(t('imageUploaded'));
      } catch (err: any) {
        console.error('Upload error:', err);
        toast.error(t('imageUploadError'));
      } finally {
        setUploadingImage(false);
      }
    };
    input.click();
  }, [user, content, autoSave, t]);

  const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items || !user) return;
    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (!file) continue;
        setUploadingImage(true);
        try {
          const ext = file.type.split('/')[1] || 'png';
          const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
          const { error } = await supabase.storage.from('note-images').upload(fileName, file);
          if (error) throw error;
          const { data: urlData } = supabase.storage.from('note-images').getPublicUrl(fileName);
          const imageMarkdown = `![image](${urlData.publicUrl})`;
          const textarea = textareaRef.current;
          if (textarea) {
            const pos = textarea.selectionStart;
            const newContent = content.substring(0, pos) + imageMarkdown + content.substring(pos);
            setContent(newContent);
            autoSave({ content: newContent });
          }
          toast.success(t('imageUploaded'));
        } catch {
          toast.error(t('imageUploadError'));
        } finally {
          setUploadingImage(false);
        }
      }
    }
  }, [user, content, autoSave, t]);

  const handleAIInsert = useCallback((text: string) => {
    const textarea = textareaRef.current;
    if (textarea) {
      const pos = textarea.selectionStart;
      const newContent = content.substring(0, pos) + '\n' + text + '\n' + content.substring(pos);
      setContent(newContent);
      autoSave({ content: newContent });
    } else {
      const newContent = content + '\n' + text;
      setContent(newContent);
      autoSave({ content: newContent });
    }
    toast.success(t('aiTextInserted'));
  }, [content, autoSave, t]);

  const downloadAsMd = () => {
    const blob = new Blob([`# ${title}\n\n${content}`], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/[^a-zA-Z0-9\u00C0-\u024F]/g, '_')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadAsTxt = () => {
    const blob = new Blob([`${title}\n\n${content}`], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/[^a-zA-Z0-9\u00C0-\u024F]/g, '_')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadAsPdf = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Popup blocked');
      return;
    }
    const escapeHtml = (str: string) =>
      str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const safeTitle = escapeHtml(title);
    const htmlContent = escapeHtml(content)
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width:100%;border-radius:8px;margin:8px 0;" />')
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/^- (.*$)/gim, '<li>$1</li>')
      .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
      .replace(/\n/g, '<br/>');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${safeTitle}</title>
        <style>
          body { font-family: 'Georgia', serif; max-width: 700px; margin: 40px auto; padding: 20px; color: #333; line-height: 1.6; }
          h1 { font-size: 28px; margin-bottom: 8px; }
          h2 { font-size: 22px; }
          h3 { font-size: 18px; }
          ul { padding-left: 20px; }
          li { margin-bottom: 4px; }
          @media print { body { margin: 0; } }
        </style>
      </head>
      <body>
        <h1>${safeTitle}</h1>
        <div>${htmlContent}</div>
      </body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 300);
  };

  // Word and character count
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const charCount = content.length;

  // Transparent background toggle
  const [transparentBg, setTransparentBg] = useState(() => {
    try { return localStorage.getItem('quotes-transparent-bg') === 'true'; } catch { return false; }
  });

  const toggleTransparentBg = useCallback(() => {
    setTransparentBg(prev => {
      const next = !prev;
      localStorage.setItem('quotes-transparent-bg', String(next));
      return next;
    });
  }, []);

  // Background image style
  const hasBgImage = !!customization.colors.editorBackgroundImage;
  const bgImageStyle = hasBgImage
    ? {
        backgroundImage: `url(${customization.colors.editorBackgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }
    : {};

  // Editor text color (only applies to editor content, not UI)
  const editorTextStyle = customization.colors.foreground
    ? { color: `hsl(${customization.colors.foreground})` }
    : undefined;

  // Render drawing or workflow editor
  if (note.type === 'drawing') {
    return (
      <div className="flex-1 flex flex-col h-full bg-background overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
          <Input
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder={t('drawingTitle')}
            className="text-xl font-bold border-none bg-transparent focus-visible:ring-0 p-0 h-auto max-w-md"
          />
          <div className="flex items-center gap-2">
            {!isAutoSave && (
              <Button variant={hasUnsavedChanges ? 'default' : 'ghost'} size="sm" className="h-8 gap-2" onClick={handleManualSave}>
                {showSavedCheck ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
                {hasUnsavedChanges ? t('save') : t('saved')}
              </Button>
            )}
            {isAutoSave && (
              <div className={cn("flex items-center gap-1 text-xs transition-opacity", isSaving ? "opacity-100" : "opacity-0")}>
                <Save className="h-3 w-3 animate-pulse" />
                <span>{t('saving')}</span>
              </div>
            )}
          </div>
        </div>
        <DrawingCanvas initialData={note.drawingData} onSave={handleDrawingSave} />
      </div>
    );
  }

  if (note.type === 'workflow') {
    return (
      <div className="flex-1 flex flex-col h-screen bg-background">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <Input
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder={t('workflowTitle')}
            className="text-xl font-bold border-none bg-transparent focus-visible:ring-0 p-0 h-auto max-w-md"
          />
          <div className="flex items-center gap-2">
            {!isAutoSave && (
              <Button variant={hasUnsavedChanges ? 'default' : 'ghost'} size="sm" className="h-8 gap-2" onClick={handleManualSave}>
                {showSavedCheck ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
                {hasUnsavedChanges ? t('save') : t('saved')}
              </Button>
            )}
            {isAutoSave && (
              <div className={cn("flex items-center gap-1 text-xs transition-opacity", isSaving ? "opacity-100" : "opacity-0")}>
                <Save className="h-3 w-3 animate-pulse" />
                <span>{t('saving')}</span>
              </div>
            )}
          </div>
        </div>
        <WorkflowEditor initialData={note.workflowData} onSave={handleWorkflowSave} />
      </div>
    );
  }

  return (
    <div className="flex-1 flex h-screen">
    <div className={`flex-1 flex flex-col bg-background relative ${showAI ? 'min-w-0' : ''}`} style={bgImageStyle}>
      {hasBgImage && !transparentBg && (
        <div className="absolute inset-0 bg-background/80 pointer-events-none" />
      )}
      {hasBgImage && transparentBg && (
        <div className="absolute inset-0 bg-background/20 pointer-events-none" />
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between p-2 md:p-4 border-b border-border relative z-10 gap-1 flex-wrap">
        <div className="flex items-center gap-2">
          {/* Toggle formatting buttons */}
          <Button
            variant={showFormatting ? 'default' : 'ghost'}
            size="icon"
            className="h-8 w-8"
            onClick={() => setShowFormatting(!showFormatting)}
            title={showFormatting ? t('hideFormatting') : t('showFormatting')}
          >
            <Type className="h-4 w-4" />
          </Button>

          {/* Formatting buttons */}
          {showFormatting && (
            <div className="flex items-center gap-1 border-l border-border pl-2">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => insertMarkdown('**', '**')} title="Bold">
                <Bold className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => insertMarkdown('*', '*')} title="Italic">
                <Italic className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => insertMarkdown('# ')} title="H1">
                <Heading1 className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => insertMarkdown('## ')} title="H2">
                <Heading2 className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => insertListItem('- ')} title="List">
                <List className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => insertListItem('1. ')} title="Numbered List">
                <ListOrdered className="h-4 w-4" />
              </Button>
              {/* Image upload */}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleImageUpload}
                disabled={uploadingImage}
                title={t('insertImage')}
              >
                {uploadingImage ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
              </Button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 md:gap-3 flex-wrap">
          {/* Folder selector */}
          <div className="hidden md:flex items-center gap-2">
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
            <Select
              value={note.folderId || 'none'}
              onValueChange={(value) => onUpdate({ folderId: value === 'none' ? null : value })}
            >
              <SelectTrigger className="w-32 h-8">
                <SelectValue placeholder={t('folder')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t('noFolder')}</SelectItem>
                {folders.map(folder => (
                  <SelectItem key={folder.id} value={folder.id}>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: folder.color }} />
                      {folder.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date picker */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 gap-2">
                <CalendarIcon className="h-4 w-4" />
                {note.linkedDate 
                  ? format(note.linkedDate, 'dd MMM', { locale: ptBR })
                  : t('linkDate')
                }
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={note.linkedDate || undefined}
                onSelect={(date) => onUpdate({ linkedDate: date || null })}
                locale={ptBR}
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>

          {/* Download note */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" title={t('downloadNote')}>
                <Download className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={downloadAsMd}>
                📄 {t('downloadAsMd')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={downloadAsTxt}>
                📝 {t('downloadAsTxt')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={downloadAsPdf}>
                📑 {t('downloadAsPdf')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Focus mode */}
          {onFocusMode && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onFocusMode} title={t('focusMode')}>
              <Focus className="h-4 w-4" />
            </Button>
          )}

          {/* Lock note */}
          <Button
            variant={note.password ? 'default' : 'ghost'}
            size="icon"
            className="h-8 w-8"
            onClick={() => setShowPasswordDialog(true)}
            title={t('lockNote')}
          >
            <Lock className="h-4 w-4" />
          </Button>

          {/* AI Assistant toggle */}
          <Button
            variant={showAI ? 'default' : 'ghost'}
            size="icon"
            className="h-8 w-8"
            onClick={() => setShowAI(!showAI)}
            title={t('aiAssistant')}
          >
            <Bot className="h-4 w-4" />
          </Button>

          {/* Transparent bg toggle (only if bg image set) */}
          {hasBgImage && (
            <Button
              variant={transparentBg ? 'default' : 'ghost'}
              size="icon"
              className="h-8 w-8"
              onClick={toggleTransparentBg}
              title={t('transparentBg')}
            >
              <Layers className="h-4 w-4" />
            </Button>
          )}

          {/* Live preview toggle */}
          <Button
            variant={livePreview ? 'default' : 'ghost'}
            size="icon"
            className="h-8 w-8"
            onClick={() => setLivePreview(!livePreview)}
            title={t('livePreview')}
          >
            <Eye className="h-4 w-4" />
          </Button>

          {/* Save button (manual) */}
          {!isAutoSave && (
            <Button
              variant={hasUnsavedChanges ? 'default' : 'ghost'}
              size="sm"
              className="h-8 gap-2"
              onClick={handleManualSave}
              title={`${t('save')} (Ctrl+S)`}
            >
            {showSavedCheck ? <Check className="h-4 w-4 text-success" /> : <Save className="h-4 w-4" />}
            {hasUnsavedChanges ? t('save') : t('saved')}
            </Button>
          )}

          {/* Auto-save indicator */}
          {isAutoSave && (
            <div className={cn(
              "flex items-center gap-1 text-xs transition-opacity",
              isSaving ? "opacity-100" : "opacity-0"
            )}>
              <Save className="h-3 w-3 animate-pulse" />
              <span>{t('saving')}</span>
            </div>
          )}
        </div>
      </div>

      {/* Title */}
      <div className="px-4 md:px-6 pt-4 md:pt-6 relative z-10" style={editorTextStyle}>
        <Input
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder={t('noteTitle')}
          className="text-2xl md:text-3xl font-bold border-none bg-transparent focus-visible:ring-0 p-0 h-auto"
          style={editorTextStyle}
        />
        <p className="text-xs md:text-sm text-muted-foreground mt-2" style={editorTextStyle ? { color: `hsl(${customization.colors.foreground})`, opacity: 0.7 } : undefined}>
          {t('updatedAt')} {format(note.updatedAt, "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 md:px-6 py-4 overflow-auto relative z-10" style={editorTextStyle}>
        {livePreview ? (
          <div className="flex gap-4 h-full">
            <div className="flex-1 min-w-0">
              <Textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => handleContentChange(e.target.value)}
                onPaste={handlePaste}
                placeholder={t('startWriting')}
                className="w-full h-full resize-none border-none bg-transparent focus-visible:ring-0 p-0 note-content text-base leading-relaxed markdown-editor"
              />
            </div>
            <div className="w-px bg-border shrink-0" />
            <div className="flex-1 min-w-0 overflow-auto">
              <MarkdownPreview content={content} className="min-h-full" />
            </div>
          </div>
        ) : isPreview ? (
          <MarkdownPreview content={content} className="min-h-full" />
        ) : (
          <Textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => handleContentChange(e.target.value)}
            onPaste={handlePaste}
            placeholder={t('startWriting')}
            className="w-full h-full resize-none border-none bg-transparent focus-visible:ring-0 p-0 note-content text-base leading-relaxed markdown-editor"
          />
        )}
      </div>

      {/* Word/character counter */}
      <div className="px-6 py-2 border-t border-border text-xs text-muted-foreground flex items-center gap-3 relative z-10">
        <span>{wordCount} {t('words')}</span>
        <span>·</span>
        <span>{charCount} {t('characters')}</span>
      </div>

      {/* Password dialog */}
      <SetPasswordDialog
        open={showPasswordDialog}
        onOpenChange={setShowPasswordDialog}
        hasPassword={!!note.password}
        onSetPassword={(password) => onUpdate({ password })}
        onRemovePassword={() => onUpdate({ password: undefined })}
      />
    </div>

    {/* AI Assistant Panel */}
    {showAI && (
      <div className="w-80 shrink-0">
        <AIAssistant
          noteTitle={title}
          noteContent={content}
          onInsertText={handleAIInsert}
          onClose={() => setShowAI(false)}
        />
      </div>
    )}
    </div>
  );
}
