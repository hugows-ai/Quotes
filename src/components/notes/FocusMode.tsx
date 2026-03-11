import { useState, useEffect, useCallback } from 'react';
import { X, Play, Pause, RotateCcw, Timer, Settings2, PanelLeftOpen, PanelLeftClose } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useTranslations } from '@/hooks/useTranslations';

interface FocusModeProps {
  children: React.ReactNode;
  onExit: () => void;
  onTimerStateChange?: (state: { time: number; isRunning: boolean; isBreak: boolean }) => void;
  sidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
}

export function FocusMode({ children, onExit, onTimerStateChange, sidebarCollapsed, onToggleSidebar }: FocusModeProps) {
  const { t } = useTranslations();
  const [focusDuration, setFocusDuration] = useState(() => {
    const saved = localStorage.getItem('quotes-focus-duration');
    return saved ? parseInt(saved) : 25;
  });
  const [breakDuration, setBreakDuration] = useState(() => {
    const saved = localStorage.getItem('quotes-break-duration');
    return saved ? parseInt(saved) : 5;
  });
  const [pomodoroTime, setPomodoroTime] = useState(focusDuration * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [tempFocus, setTempFocus] = useState(focusDuration.toString());
  const [tempBreak, setTempBreak] = useState(breakDuration.toString());

  useEffect(() => {
    onTimerStateChange?.({ time: pomodoroTime, isRunning, isBreak });
  }, [pomodoroTime, isRunning, isBreak]);

  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => {
      setPomodoroTime(prev => {
        if (prev <= 1) {
          setIsRunning(false);
          if (!isBreak) {
            setIsBreak(true);
            if (Notification.permission === 'granted') {
              new Notification(t('breakTime'), { body: t('breakTimeDesc') });
            }
            return breakDuration * 60;
          } else {
            setIsBreak(false);
            if (Notification.permission === 'granted') {
              new Notification(t('focusTime'), { body: t('focusTimeDesc') });
            }
            return focusDuration * 60;
          }
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isRunning, isBreak, focusDuration, breakDuration, t]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const resetTimer = () => {
    setIsRunning(false);
    setIsBreak(false);
    setPomodoroTime(focusDuration * 60);
  };

  const saveDurations = () => {
    const f = Math.max(1, Math.min(120, parseInt(tempFocus) || 25));
    const b = Math.max(1, Math.min(60, parseInt(tempBreak) || 5));
    setFocusDuration(f);
    setBreakDuration(b);
    localStorage.setItem('quotes-focus-duration', f.toString());
    localStorage.setItem('quotes-break-duration', b.toString());
    if (!isRunning) {
      setPomodoroTime(isBreak ? b * 60 : f * 60);
    }
  };

  // Escape to exit
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onExit();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onExit]);

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Minimal top bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/50">
        <div className="flex items-center gap-3">
          {onToggleSidebar && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onToggleSidebar}>
              {sidebarCollapsed ? <PanelLeftOpen className="h-3.5 w-3.5" /> : <PanelLeftClose className="h-3.5 w-3.5" />}
            </Button>
          )}
          <Timer className="h-4 w-4 text-muted-foreground" />
          <span className={cn(
            "font-mono text-lg font-semibold",
            isBreak ? "text-success" : "text-primary"
          )}>
            {formatTime(pomodoroTime)}
          </span>
          <span className="text-xs text-muted-foreground">
            {isBreak ? t('break') : t('focus')}
          </span>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsRunning(!isRunning)}>
            {isRunning ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={resetTimer}>
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <Settings2 className="h-3.5 w-3.5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 space-y-3" align="start">
              <div>
                <label className="text-xs text-muted-foreground">{t('focusDuration')}</label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    max={120}
                    value={tempFocus}
                    onChange={(e) => setTempFocus(e.target.value)}
                    className="h-8"
                  />
                  <span className="text-xs text-muted-foreground shrink-0">min</span>
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">{t('breakDuration')}</label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    max={60}
                    value={tempBreak}
                    onChange={(e) => setTempBreak(e.target.value)}
                    className="h-8"
                  />
                  <span className="text-xs text-muted-foreground shrink-0">min</span>
                </div>
              </div>
              <Button size="sm" className="w-full" onClick={saveDurations}>{t('save')}</Button>
            </PopoverContent>
          </Popover>
        </div>
        <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={onExit}>
          <X className="h-3.5 w-3.5" />
          {t('exitFocus')}
        </Button>
      </div>
      {/* Content area */}
      <div className="flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  );
}
