import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [needsMFAVerification, setNeedsMFAVerification] = useState(false);
  const location = useLocation();

  useEffect(() => {
    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      checkAuth();
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }

      // Check if user has MFA enabled
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const hasMFA = factors?.totp?.some((f: any) => f.status === 'verified') || false;

      console.log('🔐 MFA Check:', { 
        hasMFA, 
        sessionAAL: (session as any)?.aal,
        factors: factors?.totp 
      });

      if (hasMFA) {
        // Check AAL (Authenticator Assurance Level)
        const aal = (session as any)?.aal;
        
        // If user has MFA but current AAL is not aal2, force logout and require re-authentication
        if (aal !== 'aal2') {
          console.log('🚨 MFA enabled but AAL is not aal2. Forcing logout...');
          await supabase.auth.signOut();
          setNeedsMFAVerification(true);
          setIsAuthenticated(false);
          setIsLoading(false);
          return;
        }
      }

      setIsAuthenticated(true);
      setNeedsMFAVerification(false);
    } catch (error) {
      console.error('Auth check error:', error);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated || needsMFAVerification) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};
