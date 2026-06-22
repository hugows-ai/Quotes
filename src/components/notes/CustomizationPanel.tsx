import { useState, useRef } from 'react';
import { Palette, RotateCcw, ChevronDown, Type, Save, Trash2, Sparkles, Image as ImageIcon, X, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  CustomColors,
  AVAILABLE_FONTS,
  PRESET_THEMES,
} from '@/hooks/useCustomization';
import { useCustomizationContext } from '@/hooks/customizationContext';
import { useTranslations } from '@/hooks/useTranslations';
import { cn } from '@/lib/utils';

interface ColorOption {
  key: keyof CustomColors;
  labelKey: string;
  descKey: string;
}

const COLOR_OPTIONS: ColorOption[] = [
  { key: 'sidebarBackground', labelKey: 'sidebarLabel', descKey: 'sidebarDesc' },
  { key: 'editorBackground', labelKey: 'editorLabel', descKey: 'editorDesc' },
  { key: 'accentColor', labelKey: 'highlightLabel', descKey: 'highlightDesc' },
  { key: 'foreground', labelKey: 'editorTextLabel', descKey: 'editorTextDesc' },
];

const PRESET_COLORS = [
  { name: 'Ciano', hex: '#06b6d4' },
  { name: 'Azul', hex: '#3b82f6' },
  { name: 'Roxo', hex: '#8b5cf6' },
  { name: 'Rosa', hex: '#ec4899' },
  { name: 'Verde', hex: '#22c55e' },
  { name: 'Laranja', hex: '#f97316' },
  { name: 'Vermelho', hex: '#ef4444' },
  { name: 'Âmbar', hex: '#f59e0b' },
];

const PRESET_BACKGROUNDS = [
  { name: 'Azul escuro', hex: '#0f172a' },
  { name: 'Ciano escuro', hex: '#0c1929' },
  { name: 'Roxo escuro', hex: '#1a1625' },
  { name: 'Verde escuro', hex: '#0f1f1a' },
  { name: 'Neutro', hex: '#171717' },
  { name: 'Marrom', hex: '#1c1917' },
];

const PRESET_TEXT_COLORS = [
  { name: 'Branco', hex: '#ffffff' },
  { name: 'Cinza claro', hex: '#e2e8f0' },
  { name: 'Cinza', hex: '#94a3b8' },
  { name: 'Creme', hex: '#fef3c7' },
  { name: 'Verde claro', hex: '#bbf7d0' },
  { name: 'Azul claro', hex: '#bfdbfe' },
  { name: 'Preto', hex: '#0f172a' },
  { name: 'Cinza escuro', hex: '#374151' },
];

const THEME_NAME_KEYS: Record<string, string> = {
  'Azul Ciano': 'themeCyanBlue',
  'Noite Roxa': 'themePurpleNight',
  'Floresta': 'themeForest',
  'Pôr do Sol': 'themeSunset',
  'Oceano': 'themeOcean',
  'Neutro Claro': 'themeLightNeutral',
};

export function CustomizationPanel() {
  const { 
    customization, 
    updateColor, 
    updateFont,
    resetColors, 
    saveCurrentTheme,
    deleteTheme,
    applyTheme,
    hexToHsl, 
    hslToHex 
  } = useCustomizationContext();
  const { t } = useTranslations();
  
  const [isOpen, setIsOpen] = useState(false);
  const [newThemeName, setNewThemeName] = useState('');
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [bgImageUrl, setBgImageUrl] = useState(customization.colors.editorBackgroundImage || '');
  const bgFileInputRef = useRef<HTMLInputElement>(null);

  const handleColorChange = (key: keyof CustomColors, hexColor: string) => {
    const hslValue = hexToHsl(hexColor);
    updateColor(key, hslValue);
  };

  const handleReset = (key: keyof CustomColors) => {
    updateColor(key, null);
  };

  const getCurrentHex = (key: keyof CustomColors): string => {
    const value = customization.colors[key];
    if (!value) return '#000000';
    if (key === 'editorBackgroundImage') return '#000000';
    return hslToHex(value);
  };

  const handleSaveTheme = () => {
    if (newThemeName.trim()) {
      saveCurrentTheme(newThemeName.trim());
      setNewThemeName('');
      setSaveDialogOpen(false);
    }
  };

  const handleSetBackgroundImage = () => {
    if (bgImageUrl.trim()) {
      updateColor('editorBackgroundImage', bgImageUrl.trim());
    }
  };

  const handleRemoveBackgroundImage = () => {
    updateColor('editorBackgroundImage', null);
    setBgImageUrl('');
  };

  const handleBgFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setBgImageUrl(result);
        updateColor('editorBackgroundImage', result);
      };
      reader.readAsDataURL(file);
    }
  };

  const getThemeDisplayName = (themeName: string) => {
    const key = THEME_NAME_KEYS[themeName];
    if (key) {
      const translated = t(key);
      return translated !== key ? translated : themeName;
    }
    return themeName;
  };

  const interfaceFonts = AVAILABLE_FONTS.filter(f => f.type === 'sans-serif');
  const contentFonts = AVAILABLE_FONTS;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" className="w-full justify-between px-3 py-2 h-auto">
          <div className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            <span className="text-sm font-medium">{t('customization')}</span>
          </div>
          <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="px-3 pb-3 space-y-4">
        {/* Preset Themes */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground flex items-center gap-1">
            <Sparkles className="h-3 w-3" />
            {t('presetThemes')}
          </Label>
          <div className="grid grid-cols-2 gap-1">
            {PRESET_THEMES.map((theme) => (
              <button
                key={theme.name}
                onClick={() => applyTheme(theme)}
                className="text-xs p-2 rounded-md border border-border hover:border-primary/50 hover:bg-primary/5 transition-colors text-left"
              >
                <div className="flex items-center gap-1 mb-1">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: `hsl(${theme.colors.accentColor})` }} />
                  <span className="font-medium truncate">{getThemeDisplayName(theme.name)}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Saved Themes */}
        {customization.savedThemes.length > 0 && (
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">{t('savedThemes')}</Label>
            <div className="space-y-1">
              {customization.savedThemes.map((theme) => (
                <div key={theme.id} className="flex items-center gap-2 p-2 rounded-md border border-border group">
                  <button onClick={() => applyTheme(theme)} className="flex-1 flex items-center gap-2 text-left hover:text-primary">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: theme.colors.accentColor ? `hsl(${theme.colors.accentColor})` : 'gray' }} />
                    <span className="text-xs truncate">{theme.name}</span>
                  </button>
                  <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100" onClick={() => deleteTheme(theme.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Font Selection - Collapsible */}
        <Collapsible>
          <CollapsibleTrigger className="flex items-center justify-between w-full text-xs text-muted-foreground hover:text-foreground transition-colors">
            <div className="flex items-center gap-1">
              <Type className="h-3 w-3" />
              {t('fonts')}
            </div>
            <ChevronDown className="h-3 w-3" />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs w-16">{t('interfaceFont')}</span>
              <Select value={customization.fonts.interfaceFont} onValueChange={(value) => updateFont('interfaceFont', value)}>
                <SelectTrigger className="h-7 text-xs flex-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {interfaceFonts.map(font => (
                    <SelectItem key={font.value} value={font.value} style={{ fontFamily: `'${font.value}', ${font.type}` }}>{font.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs w-16">{t('contentFont')}</span>
              <Select value={customization.fonts.contentFont} onValueChange={(value) => updateFont('contentFont', value)}>
                <SelectTrigger className="h-7 text-xs flex-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {contentFonts.map(font => (
                    <SelectItem key={font.value} value={font.value} style={{ fontFamily: `'${font.value}', ${font.type}` }}>{font.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Color Customization */}
        {COLOR_OPTIONS.map((option) => (
          <div key={option.key} className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">{t(option.labelKey)}</Label>
              {customization.colors[option.key] && (
                <Button variant="ghost" size="sm" className="h-5 px-1 text-xs" onClick={() => handleReset(option.key)}>
                  <RotateCcw className="h-3 w-3" />
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-8 h-6 p-0 border-2"
                    style={{
                      backgroundColor: customization.colors[option.key] ? `hsl(${customization.colors[option.key]})` : 'transparent',
                    }}
                  >
                    {!customization.colors[option.key] && <span className="text-xs text-muted-foreground">—</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-3" align="start">
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label className="text-xs">{t('customColor')}</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={getCurrentHex(option.key)}
                          onChange={(e) => handleColorChange(option.key, e.target.value)}
                          className="w-10 h-7 p-1 cursor-pointer"
                        />
                        <Input
                          type="text"
                          value={getCurrentHex(option.key)}
                          onChange={(e) => {
                            if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) {
                              handleColorChange(option.key, e.target.value);
                            }
                          }}
                          placeholder="#000000"
                          className="flex-1 h-7 text-xs font-mono"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">
                        {option.key === 'accentColor' ? t('presetColors') : option.key === 'foreground' ? t('presetColors') : t('presetBackgrounds')}
                      </Label>
                      <div className="grid grid-cols-4 gap-1">
                        {(option.key === 'accentColor' ? PRESET_COLORS : option.key === 'foreground' ? PRESET_TEXT_COLORS : PRESET_BACKGROUNDS).map((preset) => (
                          <button
                            key={preset.hex}
                            onClick={() => handleColorChange(option.key, preset.hex)}
                            className="w-6 h-6 rounded-md border border-border hover:scale-110 transition-transform"
                            style={{ backgroundColor: preset.hex }}
                            title={preset.name}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
              <span className="text-xs text-muted-foreground flex-1">{t(option.descKey)}</span>
            </div>
          </div>
        ))}

        {/* Background Image */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <ImageIcon className="h-3 w-3" />
              {t('backgroundImage')}
            </Label>
            {customization.colors.editorBackgroundImage && (
              <Button variant="ghost" size="sm" className="h-5 px-1 text-xs" onClick={handleRemoveBackgroundImage}>
                <RotateCcw className="h-3 w-3" />
              </Button>
            )}
          </div>
          <Button variant="outline" size="sm" className="w-full h-7 text-xs" onClick={() => bgFileInputRef.current?.click()}>
            <Upload className="h-3 w-3 mr-1" />
            {t('uploadImage')}
          </Button>
          <input ref={bgFileInputRef} type="file" accept="image/*" className="hidden" onChange={handleBgFileUpload} />
          <Input
            placeholder={t('orPasteUrl')}
            value={bgImageUrl.startsWith('data:') ? '' : bgImageUrl}
            onChange={(e) => setBgImageUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSetBackgroundImage()}
            onBlur={handleSetBackgroundImage}
            className="h-7 text-xs"
          />
          {customization.colors.editorBackgroundImage && (
            <div className="flex items-center gap-2">
              <div 
                className="w-12 h-8 rounded border border-border bg-cover bg-center" 
                style={{ backgroundImage: `url(${customization.colors.editorBackgroundImage})` }}
              />
              <Button variant="ghost" size="sm" className="h-6 text-xs gap-1" onClick={handleRemoveBackgroundImage}>
                <X className="h-3 w-3" />
                {t('resetBackground')}
              </Button>
            </div>
          )}
        </div>

        {/* Save Current Theme */}
        <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="w-full">
              <Save className="h-3 w-3 mr-2" />
              {t('saveCurrentTheme')}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[300px]">
            <DialogHeader>
              <DialogTitle>{t('saveTheme')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <Input
                placeholder={t('themeName')}
                value={newThemeName}
                onChange={(e) => setNewThemeName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveTheme()}
              />
              <Button onClick={handleSaveTheme} className="w-full">{t('save')}</Button>
            </div>
          </DialogContent>
        </Dialog>

        <Button variant="outline" size="sm" className="w-full" onClick={resetColors}>
          <RotateCcw className="h-3 w-3 mr-2" />
          {t('resetColors')}
        </Button>
      </CollapsibleContent>
    </Collapsible>
  );
}
