import { useState } from 'react';
import { useAAL2Guard } from '@/hooks/useAAL2Guard';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Loader2 } from 'lucide-react';

interface MFAVerificationGateProps {
  open: boolean;
  operation: string;
  operationLabel: string;
  challengeData: {
    factorId: string;
    challengeId: string;
    operation: string;
  };
  onVerified: () => void;
  onCancel: () => void;
}

export const MFAVerificationGate = ({
  open,
  operation,
  operationLabel,
  challengeData,
  onVerified,
  onCancel
}: MFAVerificationGateProps) => {
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { verifyTOTPCode } = useAAL2Guard();

  const handleVerify = async () => {
    if (!code || code.length !== 6) {
      setError('Digite um código válido de 6 dígitos');
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
      setError(verifyError || 'Código inválido');
      setVerifying(false);
      return;
    }

    // AAL2 achieved - proceed with original operation
    console.log(`✅ MFA verified for ${operation}, session elevated to AAL2`);
    setVerifying(false);
    onVerified();
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
