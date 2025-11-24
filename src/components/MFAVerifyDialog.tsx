import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Shield } from 'lucide-react';
import { useMFA } from '@/hooks/useMFA';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface MFAVerifyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  factorId: string;
  onSuccess: () => void;
}

export const MFAVerifyDialog = ({ open, onOpenChange, factorId, onSuccess }: MFAVerifyDialogProps) => {
  const { verifyMFACode, verifyBackupCode } = useMFA();
  const [code, setCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [useBackupCode, setUseBackupCode] = useState(false);

  const handleVerify = async () => {
    if (!code) return;
    if (!useBackupCode && code.length !== 6) return;
    if (useBackupCode && code.length < 8) return;

    setIsVerifying(true);
    try {
      if (useBackupCode) {
        const isValid = await verifyBackupCode(code);
        if (isValid) {
          onSuccess();
          handleClose();
        } else {
          setCode('');
        }
      } else {
        await verifyMFACode(factorId, code);
        onSuccess();
        handleClose();
      }
    } catch (error) {
      console.error('Verification error:', error);
      setCode('');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleClose = () => {
    setCode('');
    setUseBackupCode(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Verificação de Dois Fatores
          </DialogTitle>
          <DialogDescription>
            {useBackupCode 
              ? 'Digite um dos seus códigos de backup de 8 caracteres'
              : 'Digite o código de 6 dígitos do seu aplicativo autenticador'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              Perdeu acesso ao seu dispositivo?{' '}
              <button
                onClick={() => setUseBackupCode(!useBackupCode)}
                className="underline font-medium"
              >
                {useBackupCode ? 'Usar código do app' : 'Usar código de backup'}
              </button>
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="mfa-code">
              {useBackupCode ? 'Código de Backup' : 'Código de Verificação'}
            </Label>
            <Input
              id="mfa-code"
              placeholder={useBackupCode ? 'XXXX-XXXX' : '000000'}
              value={code}
              onChange={(e) => {
                if (useBackupCode) {
                  setCode(e.target.value.toUpperCase());
                } else {
                  setCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  if (useBackupCode && code.length >= 8) {
                    handleVerify();
                  } else if (!useBackupCode && code.length === 6) {
                    handleVerify();
                  }
                }
              }}
              maxLength={useBackupCode ? 9 : 6}
              autoFocus
              className="text-center text-2xl tracking-widest font-mono"
            />
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleClose}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleVerify}
              disabled={
                isVerifying || 
                (useBackupCode ? code.length < 8 : code.length !== 6)
              }
              className="flex-1"
            >
              {isVerifying ? (
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
