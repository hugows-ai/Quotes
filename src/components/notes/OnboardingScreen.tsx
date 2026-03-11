import { useState } from 'react';
import { Globe, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LANGUAGES, Language } from '@/hooks/useTranslations';
import { cn } from '@/lib/utils';

const ONBOARDING_KEY = 'notes-onboarding-complete';

interface OnboardingScreenProps {
  onComplete: () => void;
}

const texts: Record<Language, { title: string; desc: string; langLabel: string; start: string }> = {
  'pt-BR': {
    title: 'Bem-vindo ao Quotes!',
    desc: 'Seu espaço pessoal para organizar notas, ideias e tarefas.',
    langLabel: 'Selecione o idioma',
    start: 'Começar',
  },
  'en': {
    title: 'Welcome to Quotes!',
    desc: 'Your personal space to organize notes, ideas and tasks.',
    langLabel: 'Select language',
    start: 'Get Started',
  },
  'es': {
    title: '¡Bienvenido a Quotes!',
    desc: 'Tu espacio personal para organizar notas, ideas y tareas.',
    langLabel: 'Seleccionar idioma',
    start: 'Comenzar',
  },
};

export function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const [selectedLang, setSelectedLang] = useState<Language>('pt-BR');
  const t = texts[selectedLang];

  const handleStart = () => {
    localStorage.setItem('notes-app-language', selectedLang);
    localStorage.setItem(ONBOARDING_KEY, 'true');
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-[60] bg-background flex items-center justify-center">
      <div className="text-center space-y-8 max-w-md px-6 animate-fade-in">
        <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
          <span className="text-4xl">📝</span>
        </div>
        <div>
          <h1 className="text-3xl font-bold mb-2">{t.title}</h1>
          <p className="text-muted-foreground">{t.desc}</p>
        </div>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground flex items-center gap-2 justify-center">
            <Globe className="h-4 w-4" />
            {t.langLabel}
          </p>
          <div className="flex gap-2 justify-center flex-wrap">
            {LANGUAGES.map(lang => (
              <button
                key={lang.code}
                onClick={() => setSelectedLang(lang.code)}
                className={cn(
                  "px-4 py-2.5 rounded-lg border-2 transition-all text-sm font-medium",
                  selectedLang === lang.code
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:border-primary/50"
                )}
              >
                {lang.flag} {lang.name}
              </button>
            ))}
          </div>
        </div>
        <Button onClick={handleStart} size="lg" className="gap-2 px-8">
          {t.start}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function isOnboardingComplete(): boolean {
  return localStorage.getItem(ONBOARDING_KEY) === 'true';
}
