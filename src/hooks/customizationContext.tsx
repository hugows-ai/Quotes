import { createContext, useContext, ReactNode } from 'react';
import { useCustomization } from './useCustomization';

type CustomizationContextValue = ReturnType<typeof useCustomization>;

const CustomizationContext = createContext<CustomizationContextValue | null>(null);

interface ProviderProps {
  cloudMode: boolean;
  children: ReactNode;
}

export function CustomizationProvider({ cloudMode, children }: ProviderProps) {
  const value = useCustomization({ cloudMode });
  return (
    <CustomizationContext.Provider value={value}>
      {children}
    </CustomizationContext.Provider>
  );
}

export function useCustomizationContext(): CustomizationContextValue {
  const ctx = useContext(CustomizationContext);
  if (!ctx) {
    // Fallback for components rendered outside the provider (e.g. tests).
    // We can't conditionally call hooks, so throw a clear error instead.
    throw new Error('useCustomizationContext must be used within a CustomizationProvider');
  }
  return ctx;
}
