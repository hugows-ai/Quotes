import { useState, useEffect } from 'react';
import { Settings, Save, FolderOpen, HardDrive, Globe, Download, Smartphone, User, KeyRound } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useTranslations, LANGUAGES } from '@/hooks/useTranslations';
import { usePWAInstall } from '@/hooks/usePWAInstall';

const STORAGE_OPTIONS = [
  { value: 'localStorage', labelKey: 'storageBrowser' },
  { value: 'indexedDB', labelKey: 'storageIndexedDB' },
];

interface AppSettings {
  autoSave: boolean;
  autoSaveInterval: number;
  storageLocation: string;
  backupEnabled: boolean;
  backupFrequency: string;
}

const DEFAULT_SETTINGS: AppSettings = {
  autoSave: true,
  autoSaveInterval: 5,
  storageLocation: 'localStorage',
  backupEnabled: false,
  backupFrequency: 'daily',
};

const SETTINGS_KEY = 'notes-app-settings';

export function SettingsPanel() {
  const { t, language, setLanguage } = useTranslations();
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const { user } = useAuth();

  const [displayName, setDisplayName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);

  useEffect(() => {
    if (user?.user_metadata?.display_name) {
      setDisplayName(user.user_metadata.display_name);
    }
  }, [user]);

  const handleUpdateProfile = async () => {
    if (!displayName.trim()) return;
    setUpdatingProfile(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { display_name: displayName.trim() },
      });
      if (error) throw error;
      toast.success(t('profileUpdated'));
    } catch (err: any) {
      toast.error(err.message || t('profileError'));
    } finally {
      setUpdatingProfile(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (newPassword.length < 6) {
      toast.error(t('passwordMinLengthAccount'));
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error(t('passwordMismatch'));
      return;
    }
    setUpdatingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success(t('passwordUpdated'));
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast.error(err.message || t('passwordError'));
    } finally {
      setUpdatingPassword(false);
    }
  };

  const [settings, setSettings] = useState<AppSettings>(() => {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    }
    return DEFAULT_SETTINGS;
  });

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

  const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const fetchCurrentData = async () => {
    if (user) {
      const [notesRes, foldersRes, todosRes, tasksRes, customRes] = await Promise.all([
        supabase.from('notes').select('*').eq('user_id', user.id),
        supabase.from('folders').select('*').eq('user_id', user.id),
        supabase.from('todos').select('*').eq('user_id', user.id),
        supabase.from('calendar_tasks').select('*').eq('user_id', user.id),
        supabase.from('user_customizations').select('*').eq('user_id', user.id).maybeSingle(),
      ]);
      return {
        notes: (notesRes.data || []).map((n: any) => ({
          id: n.id, title: n.title, content: n.content, type: n.type,
          folderId: n.folder_id, tags: n.tags || [],
          createdAt: n.created_at, updatedAt: n.updated_at,
          linkedDate: n.linked_date, drawingData: n.drawing_data,
          workflowData: n.workflow_data, password: n.password,
        })),
        folders: (foldersRes.data || []).map((f: any) => ({
          id: f.id, name: f.name, color: f.color, parentId: f.parent_id,
        })),
        todos: (todosRes.data || []).map((t: any) => ({
          id: t.id, text: t.text, completed: t.completed,
          noteId: t.note_id, createdAt: t.created_at,
        })),
        calendarTasks: (tasksRes.data || []).map((t: any) => ({
          id: t.id, text: t.text, completed: t.completed, date: t.date,
          createdAt: t.created_at, reminderTime: t.reminder_time,
          reminderNotified: t.reminder_notified,
        })),
        customization: customRes.data?.customization_data || null,
      };
    }
    return {
      notes: JSON.parse(localStorage.getItem('notes-app-notes') || '[]'),
      folders: JSON.parse(localStorage.getItem('notes-app-folders') || '[]'),
      todos: JSON.parse(localStorage.getItem('notes-app-todos') || '[]'),
      calendarTasks: JSON.parse(localStorage.getItem('notes-app-calendar-tasks') || '[]'),
      customization: JSON.parse(localStorage.getItem('notes-customization') || '{}'),
    };
  };

  const downloadBlob = (content: string, filename: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportData = async () => {
    try {
      const data = { ...(await fetchCurrentData()), exportedAt: new Date().toISOString() };
      downloadBlob(JSON.stringify(data, null, 2), `notes-backup-${new Date().toISOString().split('T')[0]}.json`, 'application/json');
      toast.success(t('exportData'));
    } catch (e) {
      console.error(e);
      toast.error(t('importError'));
    }
  };

  const sanitizeFilename = (s: string) => (s || 'note').replace(/[^a-zA-Z0-9\u00C0-\u024F]/g, '_').slice(0, 80);

  const downloadAllNotesAsMd = async () => {
    try {
      const { notes } = await fetchCurrentData();
      if (!notes.length) { toast.info(t('importError')); return; }
      notes.forEach((note: any) => {
        downloadBlob(`# ${note.title}\n\n${note.content || ''}`, `${sanitizeFilename(note.title)}.md`, 'text/markdown');
      });
    } catch (e) { console.error(e); }
  };

  const downloadAllNotesAsTxt = async () => {
    try {
      const { notes } = await fetchCurrentData();
      if (!notes.length) return;
      notes.forEach((note: any) => {
        downloadBlob(`${note.title}\n\n${note.content || ''}`, `${sanitizeFilename(note.title)}.txt`, 'text/plain');
      });
    } catch (e) { console.error(e); }
  };

  const importData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const input = event.target;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (typeof data !== 'object' || data === null) throw new Error('Invalid file');

        if (user) {
          // Cloud import — merge via upsert, never delete existing
          const ops: any[] = [];
          if (Array.isArray(data.notes) && data.notes.length) {
            ops.push(supabase.from('notes').upsert(data.notes.map((n: any) => ({
              id: n.id || crypto.randomUUID(),
              user_id: user.id,
              title: String(n.title || 'Untitled').slice(0, 500),
              content: String(n.content || ''),
              type: ['text', 'drawing', 'workflow'].includes(n.type) ? n.type : 'text',
              folder_id: n.folderId || n.folder_id || null,
              tags: Array.isArray(n.tags) ? n.tags : [],
              created_at: n.createdAt || n.created_at || new Date().toISOString(),
              updated_at: n.updatedAt || n.updated_at || new Date().toISOString(),
              linked_date: n.linkedDate || n.linked_date || null,
              drawing_data: n.drawingData || n.drawing_data || null,
              workflow_data: n.workflowData || n.workflow_data || null,
              password: n.password || null,
            })), { onConflict: 'id' }));
          }
          if (Array.isArray(data.folders) && data.folders.length) {
            ops.push(supabase.from('folders').upsert(data.folders.map((f: any) => ({
              id: f.id || crypto.randomUUID(),
              user_id: user.id,
              name: String(f.name || 'Folder').slice(0, 200),
              color: String(f.color || '#3b82f6'),
              parent_id: f.parentId || f.parent_id || null,
            })), { onConflict: 'id' }));
          }
          if (Array.isArray(data.todos) && data.todos.length) {
            ops.push(supabase.from('todos').upsert(data.todos.map((t: any) => ({
              id: t.id || crypto.randomUUID(),
              user_id: user.id,
              text: String(t.text || '').slice(0, 1000),
              completed: !!t.completed,
              note_id: t.noteId || t.note_id || null,
              created_at: t.createdAt || t.created_at || new Date().toISOString(),
            })), { onConflict: 'id' }));
          }
          if (Array.isArray(data.calendarTasks) && data.calendarTasks.length) {
            ops.push(supabase.from('calendar_tasks').upsert(data.calendarTasks.map((t: any) => ({
              id: t.id || crypto.randomUUID(),
              user_id: user.id,
              text: String(t.text || '').slice(0, 1000),
              completed: !!t.completed,
              date: t.date,
              created_at: t.createdAt || t.created_at || new Date().toISOString(),
              reminder_time: t.reminderTime || t.reminder_time || null,
              reminder_notified: !!(t.reminderNotified || t.reminder_notified),
            })), { onConflict: 'id' }));
          }
          if (data.customization && typeof data.customization === 'object') {
            ops.push(supabase.from('user_customizations').upsert({
              user_id: user.id,
              customization_data: data.customization,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'user_id' }));
          }
          const results = await Promise.all(ops);
          const errs = results.filter((r: any) => r.error);
          if (errs.length) {
            console.error('Import errors:', errs.map((r: any) => r.error));
            toast.error(t('importError'));
            return;
          }
          toast.success(t('importData'));
          setTimeout(() => window.location.reload(), 600);
        } else {
          if (Array.isArray(data.notes)) localStorage.setItem('notes-app-notes', JSON.stringify(data.notes));
          if (Array.isArray(data.folders)) localStorage.setItem('notes-app-folders', JSON.stringify(data.folders));
          if (Array.isArray(data.todos)) localStorage.setItem('notes-app-todos', JSON.stringify(data.todos));
          if (Array.isArray(data.calendarTasks)) localStorage.setItem('notes-app-calendar-tasks', JSON.stringify(data.calendarTasks));
          if (data.customization) localStorage.setItem('notes-customization', JSON.stringify(data.customization));
          toast.success(t('importData'));
          setTimeout(() => window.location.reload(), 400);
        }
      } catch (error) {
        console.error('Error importing data:', error);
        toast.error(t('importError'));
      } finally {
        if (input) input.value = '';
      }
    };
    reader.readAsText(file);
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" title={t('settings')}>
          <Settings className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[540px] overflow-hidden">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            {t('settings')}
          </SheetTitle>
          <SheetDescription>{t('settingsDesc')}</SheetDescription>
        </SheetHeader>
        
        <ScrollArea className="h-[calc(100vh-120px)] pr-4 mt-6">
          <Accordion type="multiple" defaultValue={['account', 'saving', 'storage', 'backup', 'language', 'install', 'download']} className="space-y-2">
            
            {/* Account Section */}
            {user && (
              <AccordionItem value="account" className="border rounded-lg px-4">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span>{t('account')}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pb-4">
                  {/* Profile */}
                  <div className="space-y-2">
                    <Label>{t('email')}</Label>
                    <Input value={user.email || ''} disabled className="opacity-70" />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('displayName')}</Label>
                    <Input
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder={t('displayNamePlaceholder')}
                    />
                    <Button size="sm" onClick={handleUpdateProfile} disabled={updatingProfile} className="w-full">
                      {updatingProfile ? '...' : t('updateProfile')}
                    </Button>
                  </div>

                  {/* Change Password */}
                  <div className="pt-2 border-t border-border space-y-2">
                    <div className="flex items-center gap-2">
                      <KeyRound className="h-4 w-4" />
                      <Label>{t('changeAccountPassword')}</Label>
                    </div>
                    <Input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder={t('newAccountPassword')}
                    />
                    <Input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder={t('confirmAccountPassword')}
                    />
                    <p className="text-xs text-muted-foreground">{t('passwordMinLengthAccount')}</p>
                    <Button size="sm" onClick={handleUpdatePassword} disabled={updatingPassword} className="w-full">
                      {updatingPassword ? '...' : t('updateAccountPassword')}
                    </Button>
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}


            {/* Language Section */}
            <AccordionItem value="language" className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  <span>{t('languageSection')}</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pb-4">
                <div className="space-y-2">
                  <Label>{t('language')}</Label>
                  <Select value={language} onValueChange={(value) => setLanguage(value as any)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LANGUAGES.map((lang) => (
                        <SelectItem key={lang.code} value={lang.code}>
                          {lang.flag} {lang.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">{t('languageDesc')}</p>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Saving Section */}
            <AccordionItem value="saving" className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-2">
                  <Save className="h-4 w-4" />
                  <span>{t('savingSection')}</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pb-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="auto-save">{t('autoSave')}</Label>
                    <p className="text-xs text-muted-foreground">{t('autoSaveDesc')}</p>
                  </div>
                  <Switch
                    id="auto-save"
                    checked={settings.autoSave}
                    onCheckedChange={(checked) => updateSetting('autoSave', checked)}
                  />
                </div>
                {settings.autoSave && (
                  <div className="space-y-2">
                    <Label htmlFor="save-interval">{t('saveInterval')}</Label>
                    <Select
                      value={settings.autoSaveInterval.toString()}
                      onValueChange={(value) => updateSetting('autoSaveInterval', parseInt(value))}
                    >
                      <SelectTrigger id="save-interval">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">{t('every1s')}</SelectItem>
                        <SelectItem value="5">{t('every5s')}</SelectItem>
                        <SelectItem value="10">{t('every10s')}</SelectItem>
                        <SelectItem value="30">{t('every30s')}</SelectItem>
                        <SelectItem value="60">{t('every1m')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>

            {/* Storage Section */}
            <AccordionItem value="storage" className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-2">
                  <HardDrive className="h-4 w-4" />
                  <span>{t('storage')}</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pb-4">
                <div className="space-y-2">
                  <Label htmlFor="storage-location">{t('storageLocation')}</Label>
                  <Select
                    value={settings.storageLocation}
                    onValueChange={(value) => updateSetting('storageLocation', value)}
                  >
                    <SelectTrigger id="storage-location">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STORAGE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {t(option.labelKey)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">{t('storageDesc')}</p>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">{t('storageInfo')}</p>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Install App Section */}
            <AccordionItem value="install" className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4" />
                  <span>{t('installApp')}</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pb-4">
                <p className="text-xs text-muted-foreground">{t('installAppDesc')}</p>
                {isInstalled ? (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">✅ {t('appInstalled')}</p>
                  </div>
                ) : isInstallable ? (
                  <Button onClick={install} className="w-full gap-2">
                    <Smartphone className="h-4 w-4" />
                    {t('installButton')}
                  </Button>
                ) : (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground">
                      {t('installManualHint')}
                    </p>
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>

            {/* Save to Computer Section */}
            <AccordionItem value="download" className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  <span>{t('saveToComputerSection')}</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pb-4">
                <div className="space-y-2">
                  <Button variant="outline" className="w-full" onClick={downloadAllNotesAsMd}>
                    <Download className="h-4 w-4 mr-2" />
                    {t('downloadAllNotes')} (.md)
                  </Button>
                  <Button variant="outline" className="w-full" onClick={downloadAllNotesAsTxt}>
                    <Download className="h-4 w-4 mr-2" />
                    {t('downloadAllNotes')} (.txt)
                  </Button>
                  <p className="text-xs text-muted-foreground">{t('downloadAllDesc')}</p>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Backup Section */}
            <AccordionItem value="backup" className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-2">
                  <FolderOpen className="h-4 w-4" />
                  <span>{t('backupRestore')}</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pb-4">
                <div className="space-y-2">
                  <Label>{t('exportData')}</Label>
                  <Button variant="outline" className="w-full" onClick={exportData}>
                    <Save className="h-4 w-4 mr-2" />
                    {t('exportAllNotes')}
                  </Button>
                  <p className="text-xs text-muted-foreground">{t('exportDesc')}</p>
                </div>
                <div className="space-y-2">
                  <Label>{t('importData')}</Label>
                  <Input type="file" accept=".json" onChange={importData} className="cursor-pointer" />
                  <p className="text-xs text-muted-foreground">{t('importDesc')}</p>
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="backup-enabled">{t('backupReminder')}</Label>
                    <p className="text-xs text-muted-foreground">{t('backupReminderDesc')}</p>
                  </div>
                  <Switch
                    id="backup-enabled"
                    checked={settings.backupEnabled}
                    onCheckedChange={(checked) => updateSetting('backupEnabled', checked)}
                  />
                </div>
                {settings.backupEnabled && (
                  <div className="space-y-2">
                    <Label htmlFor="backup-frequency">{t('reminderFrequency')}</Label>
                    <Select
                      value={settings.backupFrequency}
                      onValueChange={(value) => updateSetting('backupFrequency', value)}
                    >
                      <SelectTrigger id="backup-frequency">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">{t('daily')}</SelectItem>
                        <SelectItem value="weekly">{t('weekly')}</SelectItem>
                        <SelectItem value="monthly">{t('monthly')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
