import { useState, useCallback } from 'react';
import { NotesApp } from '@/components/notes/NotesApp';
import { LoadingScreen } from '@/components/notes/LoadingScreen';
import { OnboardingScreen, isOnboardingComplete } from '@/components/notes/OnboardingScreen';
import { useAuth } from '@/hooks/useAuth';
import Auth from './Auth';

const GUEST_MODE_KEY = 'notes-app-guest-mode';

export function isGuestMode(): boolean {
  return localStorage.getItem(GUEST_MODE_KEY) === 'true';
}

export function setGuestMode(value: boolean) {
  if (value) {
    localStorage.setItem(GUEST_MODE_KEY, 'true');
  } else {
    localStorage.removeItem(GUEST_MODE_KEY);
  }
}

const Index = () => {
  const [showOnboarding, setShowOnboarding] = useState(!isOnboardingComplete());
  const [isLoading, setIsLoading] = useState(true);
  const [guestMode, setGuestModeState] = useState(isGuestMode());
  const { user, loading: authLoading, signOut } = useAuth();

  const handleLoadingFinished = useCallback(() => {
    setIsLoading(false);
  }, []);

  const handleSignOut = useCallback(async () => {
    setGuestModeState(false);
    setGuestMode(false);
    await signOut();
  }, [signOut]);

  const handleContinueAsGuest = useCallback(() => {
    setGuestMode(true);
    setGuestModeState(true);
  }, []);

  if (showOnboarding) {
    return <OnboardingScreen onComplete={() => setShowOnboarding(false)} />;
  }

  // Show auth screen if not logged in and not in guest mode
  if (!authLoading && !user && !guestMode) {
    return <Auth onContinueAsGuest={handleContinueAsGuest} />;
  }

  // Still loading auth - show loading screen
  if (authLoading && !guestMode) {
    return <LoadingScreen onFinished={() => {}} />;
  }

  return (
    <>
      {isLoading && <LoadingScreen onFinished={handleLoadingFinished} />}
      <NotesApp onSignOut={handleSignOut} isGuest={guestMode} />
    </>
  );
};

export default Index;
