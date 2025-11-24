import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Copy, Shield, Smartphone, QrCode } from 'lucide-react';
import { useMFA } from '@/hooks/useMFA';
import { toast } from '@/hooks/use-toast';
import { BackupCodesDialog } from './BackupCodesDialog';

interface MFAEnrollDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const MFAEnrollDialog = ({ open, onOpenChange, onSuccess }: MFAEnrollDialogProps) => {
  const { enrollMFA, verifyEnrollment, isEnrolling, isVerifying } = useMFA();
  const [step, setStep] = useState<'enroll' | 'verify'>('enroll');
  const [enrollmentData, setEnrollmentData] = useState<{
    factorId: string;
    qrCode: string;
    secret: string;
  } | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [showBackupCodes, setShowBackupCodes] = useState(false);

  const handleEnroll = async () => {
    try {
      const data = await enrollMFA();
      setEnrollmentData(data);
      setStep('verify');
    } catch (error) {
      console.error('Enrollment error:', error);
    }
  };

  const handleVerify = async () => {
    if (!enrollmentData || !verificationCode) return;

    try {
      const result = await verifyEnrollment(enrollmentData.factorId, verificationCode);
      if (result?.backupCodes) {
        setBackupCodes(result.backupCodes);
        setShowBackupCodes(true);
        handleClose();
      }
      onSuccess();
    } catch (error) {
      console.error('Verification error:', error);
    }
  };

  const handleClose = () => {
    setStep('enroll');
    setEnrollmentData(null);
    setVerificationCode('');
    onOpenChange(false);
  };

  const handleBackupCodesClose = () => {
    setShowBackupCodes(false);
    setBackupCodes([]);
  };

  const copySecret = () => {
    if (enrollmentData?.secret) {
      navigator.clipboard.writeText(enrollmentData.secret);
      toast({
        title: 'Código copiado!',
        description: 'O código secreto foi copiado para a área de transferência.',
      });
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Configurar Autenticação de Dois Fatores
          </DialogTitle>
          <DialogDescription>
            {step === 'enroll' 
              ? 'Proteja sua conta com autenticação de dois fatores (2FA)'
              : 'Escaneie o QR code e digite o código de verificação'}
          </DialogDescription>
        </DialogHeader>

        {step === 'enroll' ? (
          <div className="space-y-4">
            <Alert>
              <Smartphone className="h-4 w-4" />
              <AlertDescription>
                Você precisará de um aplicativo autenticador como Google Authenticator, 
                Authy ou Microsoft Authenticator instalado no seu smartphone.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Ao ativar o 2FA, você precisará fornecer um código do seu aplicativo 
                autenticador sempre que fizer login.
              </p>
            </div>

            <Button 
              onClick={handleEnroll} 
              disabled={isEnrolling}
              className="w-full"
            >
              {isEnrolling ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Gerando QR Code...
                </>
              ) : (
                'Continuar'
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {enrollmentData && (
              <>
                {enrollmentData.qrCode ? (
                  <Tabs defaultValue="qrcode" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="qrcode" className="gap-2">
                        <QrCode className="h-4 w-4" />
                        QR Code
                      </TabsTrigger>
                      <TabsTrigger value="manual" className="gap-2">
                        <Smartphone className="h-4 w-4" />
                        Código Manual
                      </TabsTrigger>
                    </TabsList>
                  
                    <TabsContent value="qrcode" className="space-y-4 mt-4">
                      <div className="flex flex-col items-center space-y-4">
                        <div className="p-3 bg-white rounded-lg">
                          <img 
                            src={enrollmentData.qrCode} 
                            alt="QR Code para 2FA"
                            className="w-32 h-32"
                          />
                        </div>
                        <p className="text-sm text-muted-foreground text-center">
                          Escaneie este código com seu aplicativo autenticador
                        </p>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="manual" className="space-y-4 mt-4">
                      <Alert>
                        <Smartphone className="h-4 w-4" />
                        <AlertDescription>
                          Insira manualmente este código no seu aplicativo autenticador
                        </AlertDescription>
                      </Alert>
                      
                      <div className="space-y-2">
                        <Label>Código Secreto</Label>
                        <div className="flex gap-2">
                          <Input 
                            value={enrollmentData.secret}
                            readOnly
                            className="font-mono text-sm"
                          />
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={copySecret}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Abra seu aplicativo autenticador e adicione manualmente usando este código
                        </p>
                      </div>
                    </TabsContent>
                  </Tabs>
                ) : (
                  <div className="space-y-4">
                    <Alert>
                      <Smartphone className="h-4 w-4" />
                      <AlertDescription>
                        Configure usando o código manual abaixo
                      </AlertDescription>
                    </Alert>
                    
                    <div className="space-y-2">
                      <Label>Código Secreto</Label>
                      <div className="flex gap-2">
                        <Input 
                          value={enrollmentData.secret}
                          readOnly
                          className="font-mono text-sm"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={copySecret}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Abra seu aplicativo autenticador e adicione manualmente usando este código
                      </p>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="code">Código de Verificação</Label>
                  <Input
                    id="code"
                    placeholder="000000"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    maxLength={6}
                    className="text-center text-2xl tracking-widest font-mono"
                  />
                  <p className="text-xs text-muted-foreground">
                    Digite o código de 6 dígitos do seu aplicativo autenticador
                  </p>
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
                    disabled={isVerifying || verificationCode.length !== 6}
                    className="flex-1"
                  >
                    {isVerifying ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Verificando...
                      </>
                    ) : (
                      'Ativar 2FA'
                    )}
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
        </DialogContent>
      </Dialog>

      <BackupCodesDialog
        open={showBackupCodes}
        onOpenChange={handleBackupCodesClose}
        backupCodes={backupCodes}
      />
    </>
  );
};
