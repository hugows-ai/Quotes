import { useState, useCallback, useEffect } from 'react';
import { NotesApp } from '@/components/notes/NotesApp';
import { LoadingScreen } from '@/components/notes/LoadingScreen';
import { OnboardingScreen, isOnboardingComplete } from '@/components/notes/OnboardingScreen';
import { useAuth } from '@/hooks/useAuth';
import Auth from './Auth';

const Index = () => {
  const [showOnboarding, setShowOnboarding] = useState(!isOnboardingComplete());
  const [isLoading, setIsLoading] = useState(true);
  const { user, loading: authLoading, signOut } = useAuth();

  const handleLoadingFinished = useCallback(() => {
    setIsLoading(false);
  }, []);

  const handleSignOut = useCallback(async () => {
    await signOut();
  }, [signOut]);

  if (showOnboarding) {
    return <OnboardingScreen onComplete={() => setShowOnboarding(false)} />;
  }

  // Always show auth screen if not logged in
  if (!authLoading && !user) {
    return <Auth />;
  }

  return (
    <>
      {isLoading && <LoadingScreen onFinished={handleLoadingFinished} />}
      <NotesApp onSignOut={handleSignOut} />
    </>
  );
};

export default Index;
