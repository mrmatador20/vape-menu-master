import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState, useRef } from "react";
import { Loader2, ShieldAlert, ShieldCheck } from "lucide-react";
import { MFAVerificationGate } from "@/components/MFAVerificationGate";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminLayout() {
  const { data: role, isLoading: roleLoading } = useUserRole();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [adminAuthState, setAdminAuthState] = useState<'checking' | 'requires_2fa' | 'authenticated' | 'no_2fa_configured'>('checking');
  const [challengeData, setChallengeData] = useState<any>(null);
  const { checkAuthRequires2FA } = useAuthGuard();
  const location = useLocation();
  const navigate = useNavigate();
  const hasCheckedRef = useRef(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
    });
  }, []);

  // Clear admin 2FA verification on mount - ALWAYS require 2FA for admin access
  useEffect(() => {
    sessionStorage.removeItem('admin_2fa_verified');
  }, []);

  // Check admin 2FA verification on component mount
  useEffect(() => {
    const checkAdminAuth = async () => {
      if (hasCheckedRef.current || !isAuthenticated || role !== 'admin') {
        return;
      }

      hasCheckedRef.current = true;

      // ALWAYS require 2FA for admin access - no session caching
      console.log('🔐 Admin: Requiring 2FA verification for admin dashboard access');

      console.log('🔐 Admin: Checking 2FA requirements for admin access');
      
      try {
        const authCheck = await checkAuthRequires2FA();
        
        // CRITICAL: Admin MUST have 2FA enabled to access dashboard
        if (!authCheck.has2FAEnabled) {
          console.log('🔐 Admin: User has no 2FA enabled - BLOCKING ACCESS');
          setAdminAuthState('no_2fa_configured');
          toast.error('Você precisa configurar 2FA para acessar o painel administrativo');
          return;
        }

        // Admin with 2FA must verify again for admin access
        console.log('🔐 Admin: Requiring 2FA verification for admin access');
        const totpFactor = authCheck.factors?.[0];
        
        if (!totpFactor) {
          toast.error('Erro na configuração 2FA');
          navigate('/');
          return;
        }

        const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
          factorId: totpFactor.id
        });

        if (challengeError) {
          console.error('🔐 Admin: Failed to create MFA challenge:', challengeError);
          toast.error('Erro ao criar verificação 2FA');
          navigate('/');
          return;
        }

        setChallengeData({
          factorId: totpFactor.id,
          challengeId: challenge.id,
          operation: 'admin_access',
          createdAt: Date.now(),
        });
        setAdminAuthState('requires_2fa');
        
      } catch (error) {
        console.error('🔐 Admin: Error checking admin auth:', error);
        toast.error('Erro de autenticação. Redirecionando...');
        navigate('/');
      }
    };

    if (isAuthenticated !== null && role !== undefined) {
      checkAdminAuth();
    }
  }, [isAuthenticated, role, checkAuthRequires2FA, navigate]);

  const handleAdmin2FASuccess = async () => {
    console.log('🔐 Admin: 2FA verification successful for admin access');
    sessionStorage.setItem('admin_2fa_verified', 'true');
    setAdminAuthState('authenticated');
    toast.success('Acesso ao painel administrativo autorizado!');
  };

  const handleAdmin2FACancel = () => {
    console.log('🔐 Admin: User cancelled admin 2FA verification');
    sessionStorage.removeItem('admin_2fa_verified');
    navigate('/');
    toast.error('Verificação 2FA cancelada');
  };

  const handleAdmin2FAExpired = async () => {
    console.log('🔐 Admin: 2FA challenge expired, regenerating');
    toast.error('Código expirado', {
      description: 'Gerando novo código de verificação...',
    });

    try {
      const authCheck = await checkAuthRequires2FA();
      const totpFactor = authCheck.factors?.[0];
      
      if (!totpFactor) {
        toast.error('Erro na configuração 2FA');
        navigate('/');
        return;
      }

      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: totpFactor.id
      });

      if (challengeError) {
        toast.error('Erro ao gerar novo código');
        navigate('/');
        return;
      }

      setChallengeData({
        factorId: totpFactor.id,
        challengeId: challenge.id,
        operation: 'admin_access',
        createdAt: Date.now(),
      });
    } catch (error) {
      console.error('🔐 Admin: Error regenerating challenge:', error);
      toast.error('Erro ao gerar novo código');
      navigate('/');
    }
  };

  // Wait for both authentication and role checks
  if (roleLoading || isAuthenticated === null || adminAuthState === 'checking') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-hero">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Verificando acesso administrativo...</p>
        </div>
      </div>
    );
  }

  // Block if not authenticated or not admin
  if (!isAuthenticated || role !== 'admin') {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // Block admin access if 2FA is not configured
  if (adminAuthState === 'no_2fa_configured') {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <ShieldAlert className="h-8 w-8 text-destructive" />
            </div>
            <CardTitle className="text-xl">Acesso Bloqueado</CardTitle>
            <CardDescription>
              Para acessar o painel administrativo, você precisa ter a autenticação de dois fatores (2FA) configurada em sua conta.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
              <div className="flex items-start gap-3">
                <ShieldCheck className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-foreground mb-1">Por que 2FA é obrigatório?</p>
                  <p>O painel administrativo contém dados sensíveis. A autenticação de dois fatores adiciona uma camada extra de segurança para proteger sua conta e os dados da empresa.</p>
                </div>
              </div>
            </div>
            <Button 
              onClick={() => navigate('/profile')} 
              className="w-full"
            >
              Configurar 2FA no Perfil
            </Button>
            <Button 
              variant="outline" 
              onClick={() => navigate('/')} 
              className="w-full"
            >
              Voltar para o Início
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show 2FA gate for admin access
  if (adminAuthState === 'requires_2fa' && challengeData) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <MFAVerificationGate
          open={true}
          operation="admin_access"
          operationLabel="acessar o painel administrativo"
          challengeData={challengeData}
          onVerified={handleAdmin2FASuccess}
          onCancel={handleAdmin2FACancel}
          onExpired={handleAdmin2FAExpired}
          showRememberOption={false}
        />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AdminSidebar />
        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </SidebarProvider>
  );
}
