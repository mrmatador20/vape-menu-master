import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, ShieldCheck, ShieldAlert } from 'lucide-react';

interface MFADebugInfo {
  isAuthenticated: boolean;
  aal: string | null;
  hasMFA: boolean;
  factorCount: number;
  userId: string | null;
}

export const DevMFADebugger = () => {
  const [info, setInfo] = useState<MFADebugInfo>({
    isAuthenticated: false,
    aal: null,
    hasMFA: false,
    factorCount: 0,
    userId: null,
  });
  const [isVisible, setIsVisible] = useState(true);

  const refreshStatus = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setInfo({
          isAuthenticated: false,
          aal: null,
          hasMFA: false,
          factorCount: 0,
          userId: null,
        });
        return;
      }

      const { data: factors } = await supabase.auth.mfa.listFactors();
      const verifiedFactors = factors?.totp?.filter((f: any) => f.status === 'verified') || [];

      setInfo({
        isAuthenticated: true,
        aal: (session as any)?.aal || null,
        hasMFA: verifiedFactors.length > 0,
        factorCount: verifiedFactors.length,
        userId: session.user.id,
      });
    } catch (error) {
      console.error('MFA Debug error:', error);
    }
  };

  useEffect(() => {
    refreshStatus();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      refreshStatus();
    });

    return () => subscription.unsubscribe();
  }, []);

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 p-2 bg-primary text-primary-foreground rounded-full shadow-lg hover:scale-110 transition-transform z-50"
        title="Show MFA Debugger"
      >
        <Shield className="h-4 w-4" />
      </button>
    );
  }

  return (
    <Card className="fixed bottom-4 right-4 p-4 shadow-lg z-50 min-w-[280px] border-2">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {info.aal === 'aal2' ? (
            <ShieldCheck className="h-5 w-5 text-green-500" />
          ) : info.aal === 'aal1' ? (
            <ShieldAlert className="h-5 w-5 text-yellow-500" />
          ) : (
            <Shield className="h-5 w-5 text-muted-foreground" />
          )}
          <h3 className="font-semibold text-sm">MFA Debug</h3>
        </div>
        <button
          onClick={() => setIsVisible(false)}
          className="text-muted-foreground hover:text-foreground text-xs"
        >
          Hide
        </button>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Authenticated:</span>
          <Badge variant={info.isAuthenticated ? "default" : "secondary"}>
            {info.isAuthenticated ? "Yes" : "No"}
          </Badge>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">AAL Level:</span>
          <Badge 
            variant={
              info.aal === 'aal2' ? "default" : 
              info.aal === 'aal1' ? "secondary" : 
              "outline"
            }
          >
            {info.aal || 'None'}
          </Badge>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">MFA Enabled:</span>
          <Badge variant={info.hasMFA ? "default" : "secondary"}>
            {info.hasMFA ? "Yes" : "No"}
          </Badge>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">MFA Factors:</span>
          <Badge variant="outline">{info.factorCount}</Badge>
        </div>

        {info.userId && (
          <div className="pt-2 border-t">
            <span className="text-xs text-muted-foreground">
              User: {info.userId.slice(0, 8)}...
            </span>
          </div>
        )}

        <button
          onClick={refreshStatus}
          className="w-full mt-2 text-xs text-primary hover:underline"
        >
          Refresh Status
        </button>
      </div>
    </Card>
  );
};
