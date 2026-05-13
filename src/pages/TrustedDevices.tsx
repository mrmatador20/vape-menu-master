import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTrustedDevices } from '@/hooks/useTrustedDevices';
import { useAAL2Guard } from '@/hooks/useAAL2Guard';
import { MFAVerificationGate } from '@/components/MFAVerificationGate';
import Header from '@/components/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2, Monitor, Trash2, Edit2, Shield, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const TrustedDevices = () => {
  const navigate = useNavigate();
  const { devices, isLoading, revokeDevice, renameDevice, revokeAllOthers, getCurrentFingerprint } = useTrustedDevices();
  const { verifyAAL2 } = useAAL2Guard();
  
  const [showMFAGate, setShowMFAGate] = useState(false);
  const [mfaChallengeData, setMfaChallengeData] = useState<any>(null);
  const [pendingAction, setPendingAction] = useState<(() => Promise<void>) | null>(null);
  
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [revokeAllDialogOpen, setRevokeAllDialogOpen] = useState(false);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  
  const [editingDeviceId, setEditingDeviceId] = useState<string | null>(null);
  const [newDeviceName, setNewDeviceName] = useState('');

  const currentFingerprint = getCurrentFingerprint();

  // Verify AAL2 before sensitive operations
  const executeWithAAL2 = async (action: () => Promise<void>) => {
    const { allowed, challenge } = await verifyAAL2('manage_trusted_devices');
    
    if (!allowed && challenge) {
      // Store the action to execute after MFA verification
      setPendingAction(() => action);
      setMfaChallengeData(challenge);
      setShowMFAGate(true);
      return;
    }
    
    if (allowed) {
      await action();
    }
  };

  const handleMFAVerified = async () => {
    setShowMFAGate(false);
    if (pendingAction) {
      await pendingAction();
      setPendingAction(null);
    }
  };

  const handleRevokeDevice = async (deviceId: string) => {
    await executeWithAAL2(async () => {
      await revokeDevice(deviceId);
      setRevokeDialogOpen(false);
      setSelectedDeviceId(null);
    });
  };

  const handleRevokeAllOthers = async () => {
    await executeWithAAL2(async () => {
      await revokeAllOthers();
      setRevokeAllDialogOpen(false);
    });
  };

  const handleRenameDevice = async (deviceId: string) => {
    if (!newDeviceName.trim()) return;
    
    await renameDevice({ deviceId, newName: newDeviceName });
    setEditingDeviceId(null);
    setNewDeviceName('');
  };

  const getDeviceIcon = (userAgent: string | null) => {
    if (!userAgent) return <Monitor className="h-5 w-5" />;
    
    if (userAgent.includes('Mobile') || userAgent.includes('Android') || userAgent.includes('iOS')) {
      return <span className="text-xl">📱</span>;
    }
    return <Monitor className="h-5 w-5" />;
  };

  const isCurrentDevice = (fingerprint: string) => fingerprint === currentFingerprint;

  if (isLoading) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gradient-hero py-8">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="mb-6">
            <Button
              variant="outline"
              onClick={() => navigate('/profile')}
              className="mb-4"
            >
              ← Voltar ao Perfil
            </Button>
            
            <div className="flex items-center gap-3 mb-2">
              <Shield className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold text-foreground">Dispositivos Confiáveis</h1>
            </div>
            <p className="text-muted-foreground">
              Gerencie os dispositivos onde você optou por não precisar de verificação 2FA por 30 dias
            </p>
          </div>

          <Alert className="mb-6 bg-muted/50 border-primary/20">
            <Shield className="h-4 w-4" />
            <AlertDescription>
              <strong>Segurança:</strong> Você pode revogar o acesso de qualquer dispositivo a qualquer momento. 
              Dispositivos revogados precisarão fazer login novamente com verificação 2FA.
            </AlertDescription>
          </Alert>

          {devices.length > 0 && (
            <div className="mb-6 flex gap-2">
              <Button
                variant="destructive"
                onClick={() => setRevokeAllDialogOpen(true)}
                disabled={devices.length <= 1}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Revogar Todos (Exceto Este)
              </Button>
            </div>
          )}

          <div className="space-y-4">
            {devices.length === 0 ? (
              <Card className="bg-gradient-card border-border">
                <CardContent className="py-12 text-center">
                  <Monitor className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    Nenhum dispositivo confiável registrado
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Ao fazer login, marque "Lembrar este aparelho por 30 dias" para adicioná-lo aqui
                  </p>
                </CardContent>
              </Card>
            ) : (
              devices.map((device) => {
                const isCurrent = isCurrentDevice(device.device_fingerprint);
                const isEditing = editingDeviceId === device.id;

                return (
                  <Card key={device.id} className={`bg-gradient-card border-border ${isCurrent ? 'ring-2 ring-primary' : ''}`}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          {getDeviceIcon(device.user_agent)}
                          <div>
                            {isEditing ? (
                              <div className="flex gap-2 items-center">
                                <Input
                                  value={newDeviceName}
                                  onChange={(e) => setNewDeviceName(e.target.value)}
                                  placeholder="Nome do dispositivo"
                                  className="max-w-xs"
                                  autoFocus
                                />
                                <Button
                                  size="sm"
                                  onClick={() => handleRenameDevice(device.id)}
                                >
                                  Salvar
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setEditingDeviceId(null);
                                    setNewDeviceName('');
                                  }}
                                >
                                  Cancelar
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <CardTitle className="text-lg">
                                  {device.device_name || 'Dispositivo sem nome'}
                                </CardTitle>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setEditingDeviceId(device.id);
                                    setNewDeviceName(device.device_name || '');
                                  }}
                                  aria-label="Renomear dispositivo"
                                >
                                  <Edit2 className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                            <CardDescription className="mt-1">
                              Adicionado {formatDistanceToNow(new Date(device.created_at), { 
                                addSuffix: true,
                                locale: ptBR 
                              })}
                            </CardDescription>
                          </div>
                        </div>
                        
                        {isCurrent ? (
                          <Badge variant="default" className="gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Dispositivo Atual
                          </Badge>
                        ) : (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              setSelectedDeviceId(device.id);
                              setRevokeDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Revogar
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    
                    <CardContent>
                      <div className="space-y-2 text-sm text-muted-foreground">
                        <div className="flex justify-between">
                          <span>Último acesso:</span>
                          <span className="font-medium text-foreground">
                            {formatDistanceToNow(new Date(device.last_used_at), { 
                              addSuffix: true,
                              locale: ptBR 
                            })}
                          </span>
                        </div>
                        {device.ip_address && (
                          <div className="flex justify-between">
                            <span>IP:</span>
                            <span className="font-medium text-foreground">
                              {device.ip_address}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span>Navegador:</span>
                          <span className="font-medium text-foreground text-right max-w-[200px] truncate">
                            {device.user_agent || 'Desconhecido'}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>

          <Alert className="mt-6 bg-destructive/10 border-destructive/20">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Importante:</strong> Se você não reconhece algum dispositivo listado acima, 
              revogue-o imediatamente e considere alterar sua senha.
            </AlertDescription>
          </Alert>
        </div>

        {/* Revoke Single Device Dialog */}
        <AlertDialog open={revokeDialogOpen} onOpenChange={setRevokeDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Revogar Dispositivo</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja revogar este dispositivo? Ele precisará fazer login novamente 
                e passar pela verificação 2FA na próxima vez que tentar acessar sua conta.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => selectedDeviceId && handleRevokeDevice(selectedDeviceId)}
                className="bg-destructive hover:bg-destructive/90"
              >
                Revogar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Revoke All Others Dialog */}
        <AlertDialog open={revokeAllDialogOpen} onOpenChange={setRevokeAllDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Revogar Todos os Outros Dispositivos</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja revogar <strong>todos os outros dispositivos</strong> exceto o atual? 
                Todos eles precisarão fazer login novamente com verificação 2FA.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleRevokeAllOthers}
                className="bg-destructive hover:bg-destructive/90"
              >
                Revogar Todos
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* MFA Verification Gate */}
        {mfaChallengeData && (
          <MFAVerificationGate
            open={showMFAGate}
            operation="manage_trusted_devices"
            operationLabel="gerenciar dispositivos confiáveis"
            challengeData={mfaChallengeData}
            onVerified={handleMFAVerified}
            onCancel={() => {
              setShowMFAGate(false);
              setPendingAction(null);
            }}
            onExpired={async () => {
              // Regenerate challenge when expired
              const { allowed, challenge } = await verifyAAL2('manage_trusted_devices');
              if (challenge) {
                setMfaChallengeData(challenge);
              } else {
                setShowMFAGate(false);
                setPendingAction(null);
              }
            }}
          />
        )}
      </div>
    </>
  );
};

export default TrustedDevices;
