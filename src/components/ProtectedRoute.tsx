import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

// Flag to check if user is in password reset flow
const RESET_PASSWORD_FLAG = 'password_reset_flow';

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [requires2FA, setRequires2FA] = useState(false);
  const location = useLocation();
  const { checkAuthRequires2FA } = useAuthGuard();

  useEffect(() => {
    const validateAccess = async () => {
      console.log('🔐 ProtectedRoute: Validating access');
      
      // Check current session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        console.log('🔐 ProtectedRoute: No session, redirecting to auth');
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }

      console.log('🔐 ProtectedRoute: Session found, checking 2FA requirements');
      
      // Check if 2FA verification is required
      const authCheck = await checkAuthRequires2FA();
      
      if (authCheck.requires2FA) {
        console.log('🔐 ProtectedRoute: 2FA required but not verified, blocking access');
        setRequires2FA(true);
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }

      console.log('🔐 ProtectedRoute: Access granted');
      setIsAuthenticated(true);
      setRequires2FA(false);
      setIsLoading(false);
    };

    validateAccess();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔐 ProtectedRoute: Auth state changed:', event);
      
      if (!session) {
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }

      // Re-validate 2FA requirements on auth change
      const authCheck = await checkAuthRequires2FA();
      setRequires2FA(authCheck.requires2FA);
      setIsAuthenticated(!authCheck.requires2FA);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [checkAuthRequires2FA]);

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

  // If 2FA is required, user cannot access this route
  // They must complete 2FA first via AuthInterceptor
  if (requires2FA) {
    console.log('🔐 ProtectedRoute: 2FA required, redirecting to home for interception');
    return <Navigate to="/" replace />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};
