import { useState, useCallback, useEffect } from 'react';
import { NotesApp } from '@/components/notes/NotesApp';
import { LoadingScreen } from '@/components/notes/LoadingScreen';
import { OnboardingScreen, isOnboardingComplete } from '@/components/notes/OnboardingScreen';
import { useAuth } from '@/hooks/useAuth';
import Auth from './Auth';

const Index = () => {
  const [showOnboarding, setShowOnboarding] = useState(!isOnboardingComplete());
  const [isLoading, setIsLoading] = useState(true);
  const [skipAuth, setSkipAuth] = useState(() => localStorage.getItem('quotes-skip-auth') === 'true');
  const { user, loading: authLoading, signOut } = useAuth();

  useEffect(() => {
    const handler = () => {
      localStorage.setItem('quotes-skip-auth', 'true');
      setSkipAuth(true);
    };
    window.addEventListener('skip-auth', handler);
    return () => window.removeEventListener('skip-auth', handler);
  }, []);

  const handleLoadingFinished = useCallback(() => {
    setIsLoading(false);
  }, []);

  const handleSignOut = useCallback(async () => {
    await signOut();
    localStorage.removeItem('quotes-skip-auth');
    setSkipAuth(false);
  }, [signOut]);

  if (showOnboarding) {
    return <OnboardingScreen onComplete={() => setShowOnboarding(false)} />;
  }

  // Show auth if not logged in and didn't skip
  if (!authLoading && !user && !skipAuth) {
    return <Auth />;
  }

  return (
    <>
      {isLoading && <LoadingScreen onFinished={handleLoadingFinished} />}
      <NotesApp onSignOut={user ? handleSignOut : undefined} />
    </>
  );
};

export default Index;
