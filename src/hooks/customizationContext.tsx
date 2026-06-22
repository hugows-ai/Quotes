import { createContext, useContext } from 'react';
import type { useCustomization } from './useCustomization';

export type CustomizationContextValue = ReturnType<typeof useCustomization>;

export const CustomizationContext = createContext<CustomizationContextValue | null>(null);

export function useCustomizationContext(): CustomizationContextValue {
  const ctx = useContext(CustomizationContext);
  if (!ctx) {
    throw new Error('useCustomizationContext must be used within a CustomizationContext.Provider');
  }
  return ctx;
}
