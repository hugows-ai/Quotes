import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTranslations } from '@/hooks/useTranslations';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { toast } from 'sonner';
import { LogIn, UserPlus, KeyRound, ArrowLeft, FileText, Download, Monitor } from 'lucide-react';

type AuthView = 'login' | 'signup' | 'forgot';

interface AuthProps {
  onContinueAsGuest?: () => void;
}

export default function Auth({ onContinueAsGuest }: AuthProps) {
  const [view, setView] = useState<AuthView>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const { t } = useTranslations();
  const { isInstallable, install } = usePWAInstall();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (view === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setForgotSent(true);
        toast.success(t('forgotPasswordSent'));
      } else if (view === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success(t('loginSuccess'));
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: displayName },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        toast.success(t('signupSuccess'));
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-1">Quotes</h1>
          <p className="text-muted-foreground text-sm">
            {view === 'login' && t('loginDesc')}
            {view === 'signup' && t('signupDesc')}
            {view === 'forgot' && t('forgotPasswordDesc')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 bg-card p-8 rounded-2xl border border-border shadow-sm">
          {view === 'forgot' && forgotSent ? (
            <div className="text-center py-4 space-y-3">
              <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center mx-auto">
                <KeyRound className="w-6 h-6 text-success" />
              </div>
              <p className="text-foreground font-medium">{t('forgotPasswordSentTitle')}</p>
              <p className="text-sm text-muted-foreground">{t('forgotPasswordSentDesc')}</p>
              <Button type="button" variant="outline" className="gap-2 mt-2" onClick={() => { setView('login'); setForgotSent(false); }}>
                <ArrowLeft className="h-4 w-4" />
                {t('backToLogin')}
              </Button>
            </div>
          ) : (
            <>
              {view === 'forgot' && (
                <button type="button" onClick={() => setView('login')} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2">
                  <ArrowLeft className="h-3.5 w-3.5" />
                  {t('backToLogin')}
                </button>
              )}

              {view === 'signup' && (
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">{t('displayName')}</label>
                  <Input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder={t('displayNamePlaceholder')}
                    required
                    className="h-11"
                  />
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Email</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                  className="h-11"
                />
              </div>

              {view !== 'forgot' && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-sm font-medium text-foreground">{t('passwordLabel')}</label>
                    {view === 'login' && (
                      <button type="button" onClick={() => setView('forgot')} className="text-xs text-primary hover:underline">
                        {t('forgotPassword')}
                      </button>
                    )}
                  </div>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    className="h-11"
                  />
                </div>
              )}

              <Button type="submit" className="w-full h-11 gap-2 text-base" disabled={loading}>
                {view === 'login' && <LogIn className="h-4 w-4" />}
                {view === 'signup' && <UserPlus className="h-4 w-4" />}
                {view === 'forgot' && <KeyRound className="h-4 w-4" />}
                {loading ? '...' : view === 'login' ? t('login') : view === 'signup' ? t('signup') : t('sendResetLink')}
              </Button>
            </>
          )}
        </form>

        {view !== 'forgot' && (
          <div className="text-center space-y-3">
            <button
              type="button"
              onClick={() => setView(view === 'login' ? 'signup' : 'login')}
              className="text-sm text-primary hover:underline"
            >
              {view === 'login' ? t('noAccount') : t('hasAccount')}
            </button>

            {/* Continue without account */}
            {onContinueAsGuest && (
              <div>
                <button
                  type="button"
                  onClick={onContinueAsGuest}
                  className="flex items-center gap-2 mx-auto text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Monitor className="h-4 w-4" />
                  {t('continueWithoutAccount')}
                </button>
              </div>
            )}
          </div>
        )}

        {/* PWA Install Button */}
        {isInstallable && (
          <Button
            onClick={install}
            className="fixed bottom-4 right-4 z-50 gap-2 shadow-xl rounded-full px-5 py-3"
            size="default"
          >
            <Download className="h-4 w-4" />
            {t('installButton')}
          </Button>
        )}
      </div>
    </div>
  );
}
