import { useState, useEffect } from 'react';
import { useAAL2Guard } from '@/hooks/useAAL2Guard';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Shield, Loader2, Info } from 'lucide-react';
import { toast } from 'sonner';
import { TOTP_MAX_AGE_MS } from '@/lib/totpReplayGuard';

interface MFAVerificationGateProps {
  open: boolean;
  operation: string;
  operationLabel: string;
  challengeData: {
    factorId: string;
    challengeId: string;
    operation: string;
    createdAt: number;
  };
  onVerified: (deviceRemembered: boolean) => void;
  onCancel: () => void;
  onExpired?: () => void;
  showRememberOption?: boolean;
  presetRememberDevice?: boolean;
}

export const MFAVerificationGate = ({
  open,
  operation,
  operationLabel,
  challengeData,
  onVerified,
  onCancel,
  onExpired,
  showRememberOption = false,
  presetRememberDevice = false
}: MFAVerificationGateProps) => {
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rememberDevice, setRememberDevice] = useState(presetRememberDevice);
  const { verifyTOTPCode } = useAAL2Guard();
  const { rememberDevice: saveRememberedDevice } = useAuthGuard();

  // Janela estrita: o desafio só vive pelo passo TOTP atual + 1 (máx. 60s)
  const CHALLENGE_EXPIRATION_MS = TOTP_MAX_AGE_MS;

  // Monitor challenge expiration
  useEffect(() => {
    if (!open || !challengeData || !onExpired) return;

    const checkExpiration = () => {
      const elapsed = Date.now() - challengeData.createdAt;
      if (elapsed > CHALLENGE_EXPIRATION_MS) {
        console.log('🔐 Challenge expired, triggering new challenge');
        setCode('');
        setError(null);
        onExpired();
      }
    };

    // Check immediately
    checkExpiration();

    // Check every 10 seconds
    const interval = setInterval(checkExpiration, 5000);

    return () => clearInterval(interval);
  }, [open, challengeData, onExpired, CHALLENGE_EXPIRATION_MS]);

  const handleVerify = async () => {
    if (!code || code.length !== 6) {
      setError('Digite um código válido de 6 dígitos');
      return;
    }

    // Check if challenge has expired before attempting verification
    const elapsed = Date.now() - challengeData.createdAt;
    if (elapsed > CHALLENGE_EXPIRATION_MS) {
      setError('Código expirado');
      toast.error('Código expirado', {
        description: 'O tempo para inserir o código expirou. Gerando novo código...',
      });
      if (onExpired) {
        onExpired();
      }
      return;
    }

    setVerifying(true);
    setError(null);

    const { success, error: verifyError } = await verifyTOTPCode(
      challengeData.factorId,
      challengeData.challengeId,
      code
    );

    if (!success) {
      setError(verifyError || 'Código inválido ou expirado');
      setVerifying(false);
      return;
    }

    // AAL2 achieved - save remembered device if requested
    if (rememberDevice) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await saveRememberedDevice(user.id);
      }
    }

    console.log(`✅ MFA verified for ${operation}, session elevated to AAL2${rememberDevice ? ' (device remembered)' : ''}`);
    setVerifying(false);
    onVerified(rememberDevice);
  };

  const handleClose = () => {
    setCode('');
    setError(null);
    onCancel();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Verificação de Segurança Necessária
          </DialogTitle>
          <DialogDescription>
            Para {operationLabel}, por favor insira o código do seu aplicativo autenticador:
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <label htmlFor="totp-code" className="text-sm font-medium">
              Código de Autenticação
            </label>
            <Input
              id="totp-code"
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => {
                setCode(e.target.value.replace(/\D/g, ''));
                setError(null);
              }}
              placeholder="000000"
              className="text-center text-2xl tracking-widest"
              disabled={verifying}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && code.length === 6) {
                  handleVerify();
                }
              }}
            />
            <p className="text-xs text-muted-foreground">
              Digite o código de 6 dígitos do seu aplicativo autenticador (Google Authenticator, Authy, etc.)
            </p>
          </div>

          {showRememberOption && (
            <div className="space-y-3 p-4 bg-muted/50 rounded-lg border border-border">
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="remember-device"
                  checked={rememberDevice}
                  onCheckedChange={(checked) => setRememberDevice(checked as boolean)}
                  disabled={verifying}
                />
                <div className="space-y-1">
                  <Label
                    htmlFor="remember-device"
                    className="text-sm font-medium cursor-pointer"
                  >
                    Lembrar este aparelho por 30 dias
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Não pediremos verificação 2FA neste dispositivo pelos próximos 30 dias
                  </p>
                </div>
              </div>
              <Alert className="bg-background/50 border-primary/20">
                <Info className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  <strong>Segurança:</strong> Ative esta opção apenas em dispositivos pessoais e seguros.
                </AlertDescription>
              </Alert>
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={verifying}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleVerify}
              disabled={verifying || code.length !== 6}
            >
              {verifying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verificando...
                </>
              ) : (
                'Verificar'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
