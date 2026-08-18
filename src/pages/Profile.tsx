import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/hooks/useProfile';
import { useMFA } from '@/hooks/useMFA';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, User, MapPin, Phone, Calendar, Package, Shield, ShieldCheck, ShieldOff, Key } from 'lucide-react';
import Header from '@/components/Header';
import { logActivity } from '@/hooks/useActivityLogs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Separator } from '@/components/ui/separator';
import { MFAEnrollDialog } from '@/components/MFAEnrollDialog';
import { ChangePasswordDialog } from '@/components/ChangePasswordDialog';
import { ReferralCard } from '@/components/ReferralCard';
import { UserCouponsCard } from '@/components/UserCouponsCard';
import { ActivityLogsCard } from '@/components/ActivityLogsCard';
import { ReferralTierBadge } from '@/components/ReferralTierBadge';
import { AvatarUpload } from '@/components/AvatarUpload';
import { Badge } from '@/components/ui/badge';
import { SavedAddressesManager } from '@/components/SavedAddressesManager';
import { PrivacyDataCard } from '@/components/PrivacyDataCard';
import { usePageMeta } from '@/hooks/usePageMeta';
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
import { useCepLookup } from '@/hooks/useCepLookup';

const profileSchema = z.object({
  full_name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(100, 'Nome muito longo'),
  phone: z.string().regex(/^\(\d{2}\)\s\d{4,5}-\d{4}$/, 'Telefone inválido (formato: (00) 00000-0000)').optional().or(z.literal('')),
  birth_date: z.string().optional(),
  address_street: z.string().max(200, 'Endereço muito longo').optional().or(z.literal('')),
  address_number: z.string().max(20, 'Número muito longo').optional().or(z.literal('')),
  address_neighborhood: z.string().max(100, 'Bairro muito longo').optional().or(z.literal('')),
  address_city: z.string().max(100, 'Cidade muito longa').optional().or(z.literal('')),
  address_state: z.string().length(2, 'Estado deve ter 2 caracteres (ex: SP)').optional().or(z.literal('')),
  cep: z.string().regex(/^\d{5}-\d{3}$/, 'CEP inválido (formato: 00000-000)').optional().or(z.literal('')),
});

type ProfileFormData = z.infer<typeof profileSchema>;

const Profile = () => {
  usePageMeta({ title: 'Meu Perfil - Fox Velour', description: 'Gerencie seus dados pessoais, endereços e preferências de segurança.', path: '/profile' });

  const navigate = useNavigate();
  const { profile, isLoading, error: profileError, updateProfile, isUpdating } = useProfile();
  const { listFactors, unenrollMFA, isUnenrolling } = useMFA();
  const [userEmail, setUserEmail] = useState<string>('');
  const [mfaFactors, setMfaFactors] = useState<any[]>([]);
  const [showEnrollDialog, setShowEnrollDialog] = useState(false);
  const [showUnenrollDialog, setShowUnenrollDialog] = useState(false);
  const [selectedFactorId, setSelectedFactorId] = useState<string | null>(null);
  const [showChangePasswordDialog, setShowChangePasswordDialog] = useState(false);
  const { isLoading: isLoadingCep, lookupCep } = useCepLookup();

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: '',
      phone: '',
      birth_date: '',
      address_street: '',
      address_number: '',
      address_neighborhood: '',
      address_city: '',
      address_state: '',
      cep: '',
    },
  });

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        setUserEmail(user.email);
      }
    };
    getUser();
    loadMFAFactors();
  }, []);

  const loadMFAFactors = async () => {
    const factors = await listFactors();
    setMfaFactors(factors.totp);
  };

  const handleUnenroll = async () => {
    if (!selectedFactorId) return;
    
    try {
      await unenrollMFA(selectedFactorId);
      await loadMFAFactors();
      setShowUnenrollDialog(false);
      setSelectedFactorId(null);
    } catch (error) {
      console.error('Error unenrolling MFA:', error);
    }
  };

  const handleEnrollSuccess = () => {
    loadMFAFactors();
  };

  useEffect(() => {
    if (profile) {
      form.reset({
        full_name: profile.full_name || '',
        phone: profile.phone || '',
        birth_date: profile.birth_date || '',
        address_street: profile.address_street || '',
        address_number: profile.address_number || '',
        address_neighborhood: profile.address_neighborhood || '',
        address_city: profile.address_city || '',
        address_state: profile.address_state || '',
        cep: profile.cep || '',
      });
    }
  }, [profile, form]);

  const onSubmit = async (data: ProfileFormData) => {
    // Log audit trail with before/after data
    if (profile) {
      await logActivity('profile_updated', {
        beforeData: {
          full_name: profile.full_name,
          phone: profile.phone,
          address_street: profile.address_street,
          address_city: profile.address_city,
        },
        afterData: {
          full_name: data.full_name,
          phone: data.phone,
          address_street: data.address_street,
          address_city: data.address_city,
        },
        resourceType: 'profile',
        resourceId: profile.id,
        severity: 'info',
      });
    }
    
    updateProfile(data);
  };

  const handlePhoneChange = (phone: string, onChange: (value: string) => void) => {
    const cleanPhone = phone.replace(/\D/g, '');
    let formatted = cleanPhone;

    if (cleanPhone.length <= 10) {
      // Formato: (00) 0000-0000
      formatted = cleanPhone.replace(/(\d{2})(\d{0,4})(\d{0,4})/, (_, ddd, p1, p2) => {
        let result = '';
        if (ddd) result = `(${ddd}`;
        if (p1) result += `) ${p1}`;
        if (p2) result += `-${p2}`;
        return result;
      });
    } else {
      // Formato: (00) 00000-0000
      formatted = cleanPhone.slice(0, 11).replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
    }

    onChange(formatted);
  };

  const handleCepChange = async (cep: string, onChange: (value: string) => void) => {
    const cleanCep = cep.replace(/\D/g, '');
    const formatted = cleanCep.length > 5 
      ? `${cleanCep.slice(0, 5)}-${cleanCep.slice(5, 8)}`
      : cleanCep;
    
    onChange(formatted);

    // Consultar ViaCEP quando CEP tiver 8 dígitos
    if (cleanCep.length === 8) {
      const cepData = await lookupCep(cleanCep);
      
      if (cepData) {
        form.setValue('address_street', cepData.logradouro || '');
        form.setValue('address_neighborhood', cepData.bairro || '');
        form.setValue('address_city', cepData.localidade || '');
        form.setValue('address_state', cepData.uf || '');
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (profileError) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-12 max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle>Não foi possível carregar seu perfil</CardTitle>
              <CardDescription>
                Sua sessão continua ativa. Tente novamente em instantes.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground break-words">{profileError.message}</p>
              <Button onClick={() => window.location.reload()}>Tentar novamente</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="container mx-auto px-4 py-6 sm:py-8 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1">Meu Perfil</h1>
          <p className="text-sm text-muted-foreground">Gerencie suas informações pessoais, endereços e segurança</p>
        </div>
        <h2 className="sr-only">Seções do perfil</h2>

        <Tabs defaultValue="personal" className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-auto gap-1">
            <TabsTrigger
              value="personal"
              className="flex flex-col items-center gap-1 py-2 px-1 sm:flex-row sm:gap-2 sm:px-3"
            >
              <User className="h-4 w-4" />
              <span className="text-xs sm:text-sm">Dados Pessoais</span>
            </TabsTrigger>
            <TabsTrigger
              value="addresses"
              className="flex flex-col items-center gap-1 py-2 px-1 sm:flex-row sm:gap-2 sm:px-3"
            >
              <MapPin className="h-4 w-4" />
              <span className="text-xs sm:text-sm">Meus Endereços</span>
            </TabsTrigger>
            <TabsTrigger
              value="security"
              className="flex flex-col items-center gap-1 py-2 px-1 sm:flex-row sm:gap-2 sm:px-3"
            >
              <Shield className="h-4 w-4" />
              <span className="text-xs sm:text-sm">Segurança</span>
            </TabsTrigger>
          </TabsList>

          {/* Aba 1: Dados Pessoais */}
          <TabsContent value="personal" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Informações da Conta
                </CardTitle>
                <CardDescription>
                  Email de login e informações pessoais
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 p-4 sm:p-6">
                <div className="flex flex-col items-center pb-2">
                  <AvatarUpload
                    currentAvatarUrl={profile?.avatar_url || null}
                    onAvatarChange={() => {
                      // Avatar é atualizado diretamente no componente
                    }}
                  />
                </div>

                <Separator />

                <div>
                  <label className="text-sm font-medium text-muted-foreground">Email</label>
                  <p className="text-foreground font-medium break-words">{userEmail}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    O email não pode ser alterado por segurança
                  </p>
                </div>

                <Separator />

                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="full_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome Completo *</FormLabel>
                          <FormControl>
                            <Input placeholder="Seu nome completo" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 gap-4">
                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Telefone</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="(00) 00000-0000"
                                maxLength={15}
                                {...field}
                                onChange={(e) => handlePhoneChange(e.target.value, field.onChange)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="birth_date"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Data de Nascimento</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 pt-2">
                      <Button
                        type="submit"
                        disabled={isUpdating}
                        className="flex-1"
                      >
                        {isUpdating ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Salvando...
                          </>
                        ) : (
                          'Salvar Alterações'
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => form.reset()}
                        className="sm:w-auto"
                      >
                        Cancelar
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Aba 2: Meus Endereços */}
          <TabsContent value="addresses" className="mt-4">
            <SavedAddressesManager />
          </TabsContent>

          {/* Aba 3: Segurança */}
          <TabsContent value="security" className="mt-4 space-y-6">
            {/* Autenticação de Dois Fatores (2FA) */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Autenticação de Dois Fatores (2FA)
                </CardTitle>
                <CardDescription>
                  Adicione uma camada extra de segurança à sua conta
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 p-4 border rounded-lg">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">Aplicativo Autenticador</h4>
                      {mfaFactors.length > 0 ? (
                        <Badge variant="default" className="bg-green-500">
                          <ShieldCheck className="h-3 w-3 mr-1" />
                          Ativo
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <ShieldOff className="h-3 w-3 mr-1" />
                          Inativo
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {mfaFactors.length > 0
                        ? 'Sua conta está protegida com 2FA. Você precisará de um código do aplicativo autenticador para fazer login.'
                        : 'Use um aplicativo como Google Authenticator ou Authy para gerar códigos de verificação.'}
                    </p>
                    {mfaFactors.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Configurado em: {new Date(mfaFactors[0].created_at).toLocaleDateString('pt-BR')}
                      </p>
                    )}
                  </div>
                  <div>
                    {mfaFactors.length > 0 ? (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          setSelectedFactorId(mfaFactors[0].id);
                          setShowUnenrollDialog(true);
                        }}
                        disabled={isUnenrolling}
                      >
                        {isUnenrolling ? (
                          <>
                            <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                            Desativando...
                          </>
                        ) : (
                          'Desativar'
                        )}
                      </Button>
                    ) : (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => setShowEnrollDialog(true)}
                      >
                        Ativar 2FA
                      </Button>
                    )}
                  </div>
                </div>

                {/* Dispositivos Confiáveis */}
                {mfaFactors.length > 0 && (
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 p-4 border rounded-lg bg-muted/30">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">Dispositivos Confiáveis</h4>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Gerencie dispositivos onde você não precisa de verificação 2FA por 30 dias
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate('/trusted-devices')}
                    >
                      Gerenciar
                    </Button>
                  </div>
                )}

                {mfaFactors.length === 0 && (
                  <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                    <h5 className="font-medium text-sm">Por que usar 2FA?</h5>
                    <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                      <li>Protege sua conta mesmo se sua senha foi comprometida</li>
                      <li>Impede acessos não autorizados</li>
                      <li>Adiciona uma camada extra de segurança</li>
                      <li>Recomendado para contas com informações sensíveis</li>
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Alterar Senha */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  Alterar Senha
                </CardTitle>
                <CardDescription>
                  Mantenha sua conta segura atualizando sua senha regularmente
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 p-4 border rounded-lg">
                  <div className="flex-1 space-y-2">
                    <h4 className="font-medium">Senha da Conta</h4>
                    <p className="text-sm text-muted-foreground">
                      Escolha uma senha forte com no mínimo 8 caracteres, incluindo letras maiúsculas, minúsculas, números e caracteres especiais.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowChangePasswordDialog(true)}
                  >
                    Alterar Senha
                  </Button>
                </div>

                <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                  <h5 className="font-medium text-sm">Dicas de segurança:</h5>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                    <li>Use uma senha única que você não usa em outros sites</li>
                    <li>Evite informações pessoais óbvias (nome, data de nascimento)</li>
                    <li>Considere usar um gerenciador de senhas</li>
                    <li>Altere sua senha periodicamente</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Acesso rápido e conteúdo complementar */}
        <div className="mt-8 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => navigate('/my-orders')}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Histórico de Pedidos
                </CardTitle>
                <CardDescription>
                  Visualize todos os seus pedidos anteriores
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full">
                  Ver Meus Pedidos
                </Button>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => navigate('/affiliate')}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5" />
                  Área do Afiliado
                </CardTitle>
                <CardDescription>
                  Veja o desempenho do seu cupom de parceiro (se houver)
                </CardDescription>
              </CardHeader>
            </Card>
          </div>

          <ReferralCard />
          <ReferralTierBadge />
          <UserCouponsCard />
          <ActivityLogsCard />
          <PrivacyDataCard />
        </div>

        {/* MFA Enrollment Dialog */}
        <MFAEnrollDialog
          open={showEnrollDialog}
          onOpenChange={setShowEnrollDialog}
          onSuccess={handleEnrollSuccess}
        />

        {/* MFA Unenroll Confirmation Dialog */}
        <AlertDialog open={showUnenrollDialog} onOpenChange={setShowUnenrollDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Desativar Autenticação de Dois Fatores?</AlertDialogTitle>
              <AlertDialogDescription>
                Isso removerá a proteção extra da sua conta. Você não precisará mais fornecer
                códigos de verificação ao fazer login, mas sua conta ficará menos segura.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleUnenroll}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Desativar 2FA
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Change Password Dialog */}
        <ChangePasswordDialog
          open={showChangePasswordDialog}
          onOpenChange={setShowChangePasswordDialog}
        />
      </div>
    </div>
  );

};

export default Profile;
