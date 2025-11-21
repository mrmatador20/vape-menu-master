import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Shield } from 'lucide-react';
import { useMFA } from '@/hooks/useMFA';

interface MFAVerifyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  factorId: string;
  onSuccess: () => void;
}

export const MFAVerifyDialog = ({ open, onOpenChange, factorId, onSuccess }: MFAVerifyDialogProps) => {
  const { verifyMFACode, isVerifying } = useMFA();
  const [code, setCode] = useState('');

  const handleVerify = async () => {
    if (!code || code.length !== 6) return;

    try {
      await verifyMFACode(factorId, code);
      onSuccess();
      handleClose();
    } catch (error) {
      console.error('Verification error:', error);
      setCode('');
    }
  };

  const handleClose = () => {
    setCode('');
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
            Digite o código de 6 dígitos do seu aplicativo autenticador
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="mfa-code">Código de Verificação</Label>
            <Input
              id="mfa-code"
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && code.length === 6) {
                  handleVerify();
                }
              }}
              maxLength={6}
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
              disabled={isVerifying || code.length !== 6}
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
