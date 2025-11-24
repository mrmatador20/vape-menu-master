import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTrustedDevices } from '@/hooks/useTrustedDevices';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
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
import { Loader2, Smartphone, Monitor, Tablet, MapPin, Clock, Trash2, ShieldCheck, AlertTriangle, ArrowLeft } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const TrustedDevices = () => {
  const navigate = useNavigate();
  const { devices, isLoading, isRemoving, removeDevice, removeAllOtherDevices } = useTrustedDevices();
  const [deviceToRemove, setDeviceToRemove] = useState<string | null>(null);
  const [showRemoveAllDialog, setShowRemoveAllDialog] = useState(false);

  const getDeviceIcon = (userAgent: string | null) => {
    if (!userAgent) return <Smartphone className="h-5 w-5" />;
    
    const ua = userAgent.toLowerCase();
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
      return <Smartphone className="h-5 w-5" />;
    }
    if (ua.includes('tablet') || ua.includes('ipad')) {
      return <Tablet className="h-5 w-5" />;
    }
    return <Monitor className="h-5 w-5" />;
  };

  const getDeviceType = (userAgent: string | null) => {
    if (!userAgent) return 'Dispositivo Desconhecido';
    
    const ua = userAgent.toLowerCase();
    if (ua.includes('windows')) return 'Windows';
    if (ua.includes('mac')) return 'Mac';
    if (ua.includes('linux')) return 'Linux';
    if (ua.includes('android')) return 'Android';
    if (ua.includes('iphone')) return 'iPhone';
    if (ua.includes('ipad')) return 'iPad';
    
    return 'Outro Sistema';
  };

  const getBrowserName = (userAgent: string | null) => {
    if (!userAgent) return 'Navegador Desconhecido';
    
    const ua = userAgent.toLowerCase();
    if (ua.includes('edg')) return 'Edge';
    if (ua.includes('chrome')) return 'Chrome';
    if (ua.includes('firefox')) return 'Firefox';
    if (ua.includes('safari')) return 'Safari';
    if (ua.includes('opera')) return 'Opera';
    
    return 'Outro Navegador';
  };

  const handleRemoveDevice = async (deviceId: string) => {
    await removeDevice(deviceId);
    setDeviceToRemove(null);
  };

  const handleRemoveAllOther = async () => {
    await removeAllOtherDevices();
    setShowRemoveAllDialog(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  const currentDevice = devices.find(d => d.is_current);
  const otherDevices = devices.filter(d => !d.is_current);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/profile')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar ao Perfil
          </Button>
          
          <h1 className="text-3xl font-bold text-foreground mb-2">Dispositivos Confiáveis</h1>
          <p className="text-muted-foreground">
            Gerencie os dispositivos que têm acesso à sua conta
          </p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Sobre Dispositivos Confiáveis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Quando você faz login em um novo dispositivo, ele é automaticamente adicionado à lista de dispositivos confiáveis e você recebe um email de notificação.
            </p>
            <p className="text-sm text-muted-foreground">
              Você pode remover dispositivos que não reconhece ou não usa mais. Se você remover o dispositivo atual, precisará fazer login novamente.
            </p>
          </CardContent>
        </Card>

        {/* Current Device */}
        {currentDevice && (
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Monitor className="h-5 w-5" />
              Dispositivo Atual
            </h2>
            
            <Card className="border-primary">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex gap-4 flex-1">
                    <div className="text-primary mt-1">
                      {getDeviceIcon(currentDevice.user_agent)}
                    </div>
                    <div className="flex-1 space-y-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-lg">
                            {currentDevice.device_name || getDeviceType(currentDevice.user_agent)}
                          </h3>
                          <Badge variant="default" className="bg-green-500">
                            <ShieldCheck className="h-3 w-3 mr-1" />
                            Dispositivo Atual
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {getBrowserName(currentDevice.user_agent)} • {getDeviceType(currentDevice.user_agent)}
                        </p>
                      </div>

                      <Separator />

                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                          <div>
                            <p className="text-xs text-muted-foreground">Endereço IP</p>
                            <p className="text-sm font-medium">{currentDevice.ip_address || 'Não disponível'}</p>
                          </div>
                        </div>

                        <div className="flex items-start gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                          <div>
                            <p className="text-xs text-muted-foreground">Último acesso</p>
                            <p className="text-sm font-medium">
                              {formatDistanceToNow(new Date(currentDevice.last_used_at), {
                                addSuffix: true,
                                locale: ptBR
                              })}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-start gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                          <div>
                            <p className="text-xs text-muted-foreground">Adicionado em</p>
                            <p className="text-sm font-medium">
                              {new Date(currentDevice.created_at).toLocaleDateString('pt-BR', {
                                day: '2-digit',
                                month: 'long',
                                year: 'numeric'
                              })}
                            </p>
                          </div>
                        </div>
                      </div>

                      {currentDevice.user_agent && (
                        <details className="text-xs">
                          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                            Ver informações técnicas
                          </summary>
                          <p className="mt-2 p-2 bg-muted rounded text-muted-foreground break-all">
                            {currentDevice.user_agent}
                          </p>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Other Devices */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              Outros Dispositivos ({otherDevices.length})
            </h2>
            {otherDevices.length > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowRemoveAllDialog(true)}
                disabled={isRemoving}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Remover Todos
              </Button>
            )}
          </div>

          {otherDevices.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <ShieldCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Nenhum outro dispositivo conectado
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {otherDevices.map((device) => (
                <Card key={device.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex gap-4 flex-1">
                        <div className="text-muted-foreground mt-1">
                          {getDeviceIcon(device.user_agent)}
                        </div>
                        <div className="flex-1 space-y-3">
                          <div>
                            <h3 className="font-semibold">
                              {device.device_name || getDeviceType(device.user_agent)}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {getBrowserName(device.user_agent)} • {getDeviceType(device.user_agent)}
                            </p>
                          </div>

                          <Separator />

                          <div className="grid md:grid-cols-2 gap-4">
                            <div className="flex items-start gap-2">
                              <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                              <div>
                                <p className="text-xs text-muted-foreground">Endereço IP</p>
                                <p className="text-sm font-medium">{device.ip_address || 'Não disponível'}</p>
                              </div>
                            </div>

                            <div className="flex items-start gap-2">
                              <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                              <div>
                                <p className="text-xs text-muted-foreground">Último acesso</p>
                                <p className="text-sm font-medium">
                                  {formatDistanceToNow(new Date(device.last_used_at), {
                                    addSuffix: true,
                                    locale: ptBR
                                  })}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-start gap-2">
                              <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                              <div>
                                <p className="text-xs text-muted-foreground">Adicionado em</p>
                                <p className="text-sm font-medium">
                                  {new Date(device.created_at).toLocaleDateString('pt-BR', {
                                    day: '2-digit',
                                    month: 'long',
                                    year: 'numeric'
                                  })}
                                </p>
                              </div>
                            </div>
                          </div>

                          {device.user_agent && (
                            <details className="text-xs">
                              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                                Ver informações técnicas
                              </summary>
                              <p className="mt-2 p-2 bg-muted rounded text-muted-foreground break-all">
                                {device.user_agent}
                              </p>
                            </details>
                          )}
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeviceToRemove(device.id)}
                        disabled={isRemoving}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Remove Device Confirmation Dialog */}
        <AlertDialog open={!!deviceToRemove} onOpenChange={() => setDeviceToRemove(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Remover Dispositivo?
              </AlertDialogTitle>
              <AlertDialogDescription>
                Este dispositivo será removido da lista de dispositivos confiáveis. 
                Se alguém tentar acessar sua conta a partir dele, você receberá um novo email de alerta.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deviceToRemove && handleRemoveDevice(deviceToRemove)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={isRemoving}
              >
                {isRemoving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Removendo...
                  </>
                ) : (
                  'Remover Dispositivo'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Remove All Other Devices Confirmation Dialog */}
        <AlertDialog open={showRemoveAllDialog} onOpenChange={setShowRemoveAllDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Remover Todos os Outros Dispositivos?
              </AlertDialogTitle>
              <AlertDialogDescription>
                Todos os outros dispositivos ({otherDevices.length}) serão removidos da lista de dispositivos confiáveis. 
                Apenas o dispositivo atual permanecerá. Você receberá emails de alerta se alguém tentar acessar sua conta a partir deles novamente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleRemoveAllOther}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={isRemoving}
              >
                {isRemoving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Removendo...
                  </>
                ) : (
                  'Remover Todos'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};

export default TrustedDevices;
