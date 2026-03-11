import { useState } from 'react';
import { Lock, Unlock, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useTranslations } from '@/hooks/useTranslations';

interface SetPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSetPassword: (password: string) => void;
  hasPassword: boolean;
  onRemovePassword: () => void;
}

export function SetPasswordDialog({ open, onOpenChange, onSetPassword, hasPassword, onRemovePassword }: SetPasswordDialogProps) {
  const { t } = useTranslations();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = () => {
    if (password.length < 4) {
      setError(t('passwordMinLength'));
      return;
    }
    if (password !== confirmPassword) {
      setError(t('passwordMismatch'));
      return;
    }
    onSetPassword(password);
    setPassword('');
    setConfirmPassword('');
    setError('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[340px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-4 w-4" />
            {hasPassword ? t('changePassword') : t('setPassword')}
          </DialogTitle>
          <DialogDescription>{t('setPasswordDesc')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 pt-2">
          <div className="relative">
            <Input
              type={showPassword ? 'text' : 'password'}
              placeholder={t('password')}
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
            />
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </Button>
          </div>
          <Input
            type={showPassword ? 'text' : 'password'}
            placeholder={t('confirmPassword')}
            value={confirmPassword}
            onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
          <Button onClick={handleSubmit} className="w-full">{t('save')}</Button>
          {hasPassword && (
            <Button variant="outline" className="w-full" onClick={() => { onRemovePassword(); onOpenChange(false); }}>
              <Unlock className="h-4 w-4 mr-2" />
              {t('removePassword')}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface UnlockDialogProps {
  open: boolean;
  onUnlock: (password: string) => boolean;
  onCancel: () => void;
}

export function UnlockDialog({ open, onUnlock, onCancel }: UnlockDialogProps) {
  const { t } = useTranslations();
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = () => {
    const success = onUnlock(password);
    if (!success) {
      setError(true);
      setPassword('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => { if (!open) onCancel(); }}>
      <DialogContent className="sm:max-w-[300px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-4 w-4" />
            {t('lockedNote')}
          </DialogTitle>
          <DialogDescription>{t('enterPassword')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 pt-2">
          <div className="relative">
            <Input
              type={showPassword ? 'text' : 'password'}
              placeholder={t('password')}
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(false); }}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              autoFocus
            />
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </Button>
          </div>
          {error && <p className="text-xs text-destructive">{t('wrongPassword')}</p>}
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onCancel}>{t('cancel')}</Button>
            <Button className="flex-1" onClick={handleSubmit}>{t('unlock')}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
