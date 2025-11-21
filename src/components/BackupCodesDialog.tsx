import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Copy, Download, ShieldAlert } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface BackupCodesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  backupCodes: string[];
}

export const BackupCodesDialog = ({ open, onOpenChange, backupCodes }: BackupCodesDialogProps) => {
  const copyAllCodes = () => {
    navigator.clipboard.writeText(backupCodes.join('\n'));
    toast({
      title: 'Códigos copiados!',
      description: 'Todos os códigos de backup foram copiados.',
    });
  };

  const downloadCodes = () => {
    const blob = new Blob([`Códigos de Backup 2FA\n\n${backupCodes.join('\n')}\n\nGuarde estes códigos em um lugar seguro. Cada código pode ser usado apenas uma vez.`], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'backup-codes-2fa.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: 'Códigos baixados!',
      description: 'Arquivo salvo com sucesso.',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-primary" />
            Códigos de Backup
          </DialogTitle>
          <DialogDescription>
            Guarde estes códigos em um lugar seguro. Você pode usá-los para fazer login caso perca acesso ao seu dispositivo autenticador.
          </DialogDescription>
        </DialogHeader>

        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertDescription>
            <strong>ATENÇÃO:</strong> Cada código só pode ser usado uma vez. Após usar todos os códigos, você precisará gerar novos.
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2 p-4 bg-muted rounded-lg font-mono text-sm">
            {backupCodes.map((code, index) => (
              <div key={index} className="p-2 bg-background rounded border">
                {code}
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={copyAllCodes}
            className="flex-1"
          >
            <Copy className="mr-2 h-4 w-4" />
            Copiar Todos
          </Button>
          <Button
            variant="outline"
            onClick={downloadCodes}
            className="flex-1"
          >
            <Download className="mr-2 h-4 w-4" />
            Baixar
          </Button>
        </div>

        <Button onClick={() => onOpenChange(false)} className="w-full">
          Entendi, guardei os códigos
        </Button>
      </DialogContent>
    </Dialog>
  );
};
