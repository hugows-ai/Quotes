import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTranslations } from '@/hooks/useTranslations';
import { toast } from 'sonner';
import { KeyRound, Check, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslations();
  const navigate = useNavigate();

  useEffect(() => {
    // Handle PKCE code exchange from URL query params
    const url = new URL(window.location.href);
    const code = url.searchParams.get('code');
    const errorParam = url.searchParams.get('error');
    const errorDescription = url.searchParams.get('error_description');

    if (errorParam) {
      setError(errorDescription || errorParam);
      return;
    }

    if (code) {
      // Exchange the code for a session
      supabase.auth.exchangeCodeForSession(code).then(({ data, error }) => {
        if (error) {
          console.error('Code exchange error:', error);
          setError(error.message);
        } else if (data.session) {
          setSessionReady(true);
          // Clean up URL
          window.history.replaceState({}, '', '/reset-password');
        }
      });
      return;
    }

    // Also handle hash-based recovery (older Supabase versions)
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const type = hashParams.get('type');
    const accessToken = hashParams.get('access_token');

    if (type === 'recovery' || accessToken) {
      // The onAuthStateChange listener will handle session setup
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
        if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
          setSessionReady(true);
          subscription.unsubscribe();
        }
      });

      // Timeout fallback
      const timeout = setTimeout(() => {
        setSessionReady(true);
        subscription.unsubscribe();
      }, 5000);

      return () => {
        clearTimeout(timeout);
        subscription.unsubscribe();
      };
    }

    // No code or hash — check if there's already a session (user navigated directly)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSessionReady(true);
      } else {
        setError(t('invalidResetLink') || 'Invalid or expired reset link. Please request a new one.');
      }
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error(t('passwordMismatch'));
      return;
    }
    if (password.length < 6) {
      toast.error(t('passwordMinLengthAccount'));
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setSuccess(true);
      toast.success(t('passwordResetSuccess'));
      // Sign out after password reset to force fresh login
      await supabase.auth.signOut();
      setTimeout(() => navigate('/'), 2000);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <KeyRound className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">{t('resetPassword')}</h1>
          <p className="text-muted-foreground">{t('resetPasswordDesc')}</p>
        </div>

        {error ? (
          <div className="bg-card p-8 rounded-2xl border border-border shadow-sm text-center space-y-4">
            <p className="text-destructive font-medium">{error}</p>
            <Button variant="outline" onClick={() => navigate('/')}>
              {t('backToLogin')}
            </Button>
          </div>
        ) : success ? (
          <div className="bg-card p-8 rounded-2xl border border-border shadow-sm text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center mx-auto">
              <Check className="w-6 h-6 text-success" />
            </div>
            <p className="text-foreground font-medium">{t('passwordResetSuccess')}</p>
            <p className="text-sm text-muted-foreground">{t('redirecting')}</p>
          </div>
        ) : !sessionReady ? (
          <div className="bg-card p-8 rounded-2xl border border-border shadow-sm text-center space-y-4">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground">{t('verifyingLink') || 'Verifying reset link...'}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 bg-card p-8 rounded-2xl border border-border shadow-sm">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">{t('newPassword')}</label>
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
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">{t('confirmNewPassword')}</label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="h-11"
              />
            </div>
            <Button type="submit" className="w-full h-11 gap-2 text-base" disabled={loading}>
              <KeyRound className="h-4 w-4" />
              {loading ? '...' : t('updatePassword')}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
