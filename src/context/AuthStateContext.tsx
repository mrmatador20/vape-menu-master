import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * AuthState represents the current authentication state of the user:
 * - IDLE: No authentication in progress
 * - AUTHENTICATING: Login credentials being validated
 * - AWAITING_2FA: User passed credentials but needs 2FA verification
 * - AUTHENTICATED: Fully authenticated (either 2FA passed or not required)
 */
export type AuthState = 'IDLE' | 'AUTHENTICATING' | 'AWAITING_2FA' | 'AUTHENTICATED';

interface AuthStateContextType {
  authState: AuthState;
  setAuthState: (state: AuthState) => void;
  isNavigationBlocked: boolean;
}

const AuthStateContext = createContext<AuthStateContextType | undefined>(undefined);

export const AuthStateProvider = ({ children }: { children: ReactNode }) => {
  const [authState, setAuthStateInternal] = useState<AuthState>('IDLE');

  // Navigation is blocked during intermediate states
  const isNavigationBlocked = authState === 'AUTHENTICATING' || authState === 'AWAITING_2FA';

  const setAuthState = (state: AuthState) => {
    console.log('🔐 AuthState transition:', authState, '→', state);
    setAuthStateInternal(state);
  };

  // Listen to auth changes to reset state on logout
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        console.log('🔐 User signed out, resetting auth state to IDLE');
        sessionStorage.removeItem('admin_2fa_verified');
        setAuthState('IDLE');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthStateContext.Provider value={{ authState, setAuthState, isNavigationBlocked }}>
      {children}
    </AuthStateContext.Provider>
  );
};

export const useAuthState = () => {
  const context = useContext(AuthStateContext);
  if (context === undefined) {
    throw new Error('useAuthState must be used within an AuthStateProvider');
  }
  return context;
};
