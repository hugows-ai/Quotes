import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTranslations } from '@/hooks/useTranslations';
import { toast } from 'sonner';
import { KeyRound, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { t } = useTranslations();
  const navigate = useNavigate();

  useEffect(() => {
    // Check if we have a recovery session
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const type = hashParams.get('type');
    if (type !== 'recovery') {
      // Also check for access_token which indicates a valid recovery flow
      const accessToken = hashParams.get('access_token');
      if (!accessToken) {
        // Not a valid recovery link, but don't redirect immediately
        // The auth state change listener might handle it
      }
    }
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

        {success ? (
          <div className="bg-card p-8 rounded-2xl border border-border shadow-sm text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center mx-auto">
              <Check className="w-6 h-6 text-success" />
            </div>
            <p className="text-foreground font-medium">{t('passwordResetSuccess')}</p>
            <p className="text-sm text-muted-foreground">{t('redirecting')}</p>
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
