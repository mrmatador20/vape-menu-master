import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuthState } from '@/context/AuthStateContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

// Flag to check if user is in password reset flow
const RESET_PASSWORD_FLAG = 'password_reset_flow';

/**
 * ProtectedRoute - Simple session-based route protection
 * 
 * This component ONLY checks if user has an active session.
 * All 2FA verification logic is handled by AuthInterceptor.
 * 
 * Responsibilities:
 * - Check if user has active Supabase session
 * - Redirect to /auth if no session
 * - Handle password reset flow isolation
 * - Block access during authentication process
 */
export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const location = useLocation();
  const { isNavigationBlocked } = useAuthState();

  useEffect(() => {
    const validateSession = async () => {
      console.log('🔐 ProtectedRoute: Checking session');
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        console.log('🔐 ProtectedRoute: No session, redirecting to auth');
        setIsAuthenticated(false);
      } else {
        console.log('🔐 ProtectedRoute: Session found, access granted');
        setIsAuthenticated(true);
      }
      
      setIsLoading(false);
    };

    validateSession();

    // Listen for auth changes (sign out, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔐 ProtectedRoute: Auth state changed:', event);
      setIsAuthenticated(!!session);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Block access during authentication process
  if (isNavigationBlocked) {
    console.log('🔐 ProtectedRoute: Navigation blocked during authentication');
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-hero">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Processando autenticação...</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If user is in password reset flow, redirect to reset password page
  const isInResetFlow = localStorage.getItem(RESET_PASSWORD_FLAG) === 'true';
  if (isInResetFlow && location.pathname !== '/reset-password') {
    return <Navigate to="/reset-password" replace />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};
