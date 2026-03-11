import { useState, useEffect } from 'react';
import { Settings, Save, FolderOpen, HardDrive, Globe, Download, Smartphone } from 'lucide-react';
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

  const exportData = () => {
    const notes = localStorage.getItem('notes-app-notes');
    const folders = localStorage.getItem('notes-app-folders');
    const todos = localStorage.getItem('notes-app-todos');
    const customization = localStorage.getItem('notes-customization');
    
    const data = {
      notes: notes ? JSON.parse(notes) : [],
      folders: folders ? JSON.parse(folders) : [],
      todos: todos ? JSON.parse(todos) : [],
      customization: customization ? JSON.parse(customization) : {},
      exportedAt: new Date().toISOString(),
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `notes-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadAllNotesAsMd = () => {
    const notesStr = localStorage.getItem('notes-app-notes');
    if (!notesStr) return;
    const notes = JSON.parse(notesStr);
    notes.forEach((note: { title: string; content: string }) => {
      const blob = new Blob([`# ${note.title}\n\n${note.content}`], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${note.title.replace(/[^a-zA-Z0-9\u00C0-\u024F]/g, '_')}.md`;
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  const downloadAllNotesAsTxt = () => {
    const notesStr = localStorage.getItem('notes-app-notes');
    if (!notesStr) return;
    const notes = JSON.parse(notesStr);
    notes.forEach((note: { title: string; content: string }) => {
      const blob = new Blob([`${note.title}\n\n${note.content}`], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${note.title.replace(/[^a-zA-Z0-9\u00C0-\u024F]/g, '_')}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  const importData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        
        if (data.notes) localStorage.setItem('notes-app-notes', JSON.stringify(data.notes));
        if (data.folders) localStorage.setItem('notes-app-folders', JSON.stringify(data.folders));
        if (data.todos) localStorage.setItem('notes-app-todos', JSON.stringify(data.todos));
        if (data.customization) localStorage.setItem('notes-customization', JSON.stringify(data.customization));
        
        window.location.reload();
      } catch (error) {
        console.error('Error importing data:', error);
        alert(t('importError'));
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
          <Accordion type="multiple" defaultValue={['saving', 'storage', 'backup', 'language', 'install', 'download']} className="space-y-2">
            
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
