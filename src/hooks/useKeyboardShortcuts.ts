import { useEffect } from 'react';

interface ShortcutHandlers {
  onNewNote?: () => void;
  onNewDrawing?: () => void;
  onNewWorkflow?: () => void;
  onSearch?: () => void;
  onToggleTheme?: () => void;
  onFocusMode?: () => void;
  onToggleSidebar?: () => void;
  onAdvancedSearch?: () => void;
}

export function useKeyboardShortcuts(handlers: ShortcutHandlers) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      const mod = e.ctrlKey || e.metaKey;

      if (mod && e.key === 'n' && !e.shiftKey) {
        e.preventDefault();
        handlers.onNewNote?.();
      } else if (mod && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        handlers.onNewDrawing?.();
      } else if (mod && e.shiftKey && e.key === 'W') {
        e.preventDefault();
        handlers.onNewWorkflow?.();
      } else if (mod && e.key === 'k') {
        e.preventDefault();
        handlers.onAdvancedSearch?.();
      } else if (mod && e.key === 'b') {
        e.preventDefault();
        handlers.onToggleSidebar?.();
      } else if (mod && e.shiftKey && e.key === 'F') {
        e.preventDefault();
        handlers.onFocusMode?.();
      } else if (mod && e.shiftKey && e.key === 'L') {
        e.preventDefault();
        handlers.onToggleTheme?.();
      } else if (mod && e.key === '/' && !isInput) {
        e.preventDefault();
        handlers.onSearch?.();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handlers]);
}
