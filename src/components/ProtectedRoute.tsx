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
  const location = useLocation();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        // Check if user has MFA enabled
        const { data: factors } = await supabase.auth.mfa.listFactors();
        const hasMFA = factors?.totp && factors.totp.length > 0;
        
        if (hasMFA) {
          // User has MFA, verify AAL2 level
          const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
          setIsAuthenticated(aal?.currentLevel === 'aal2');
        } else {
          // No MFA required
          setIsAuthenticated(true);
        }
      } else {
        setIsAuthenticated(false);
      }
      
      setIsLoading(false);
    };

    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        // Check if user has MFA enabled
        const { data: factors } = await supabase.auth.mfa.listFactors();
        const hasMFA = factors?.totp && factors.totp.length > 0;
        
        if (hasMFA) {
          // User has MFA, verify AAL2 level
          const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
          setIsAuthenticated(aal?.currentLevel === 'aal2');
        } else {
          // No MFA required
          setIsAuthenticated(true);
        }
      } else {
        setIsAuthenticated(false);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};
