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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Separator } from '@/components/ui/separator';
import { MFAEnrollDialog } from '@/components/MFAEnrollDialog';
import { ChangePasswordDialog } from '@/components/ChangePasswordDialog';
import { ActivityLogsCard } from '@/components/ActivityLogsCard';
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
  const navigate = useNavigate();
  const { profile, isLoading, updateProfile, isUpdating } = useProfile();
  const { listFactors, unenrollMFA, isUnenrolling } = useMFA();
  const [userEmail, setUserEmail] = useState<string>('');
  const [mfaFactors, setMfaFactors] = useState<any[]>([]);
  const [showEnrollDialog, setShowEnrollDialog] = useState(false);
  const [showUnenrollDialog, setShowUnenrollDialog] = useState(false);
  const [selectedFactorId, setSelectedFactorId] = useState<string | null>(null);
  const [showChangePasswordDialog, setShowChangePasswordDialog] = useState(false);

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

  const onSubmit = (data: ProfileFormData) => {
    updateProfile(data);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Meu Perfil</h1>
          <p className="text-muted-foreground">Gerencie suas informações pessoais e endereço de entrega</p>
        </div>

        <div className="grid gap-6">
          {/* Account Info Card */}
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
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Email</label>
                <p className="text-foreground font-medium">{userEmail}</p>
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

                  <div className="grid md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Telefone</FormLabel>
                          <FormControl>
                            <Input placeholder="(00) 00000-0000" {...field} />
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
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* Address Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Endereço de Entrega
              </CardTitle>
              <CardDescription>
                Seu endereço padrão para entrega de pedidos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="cep"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>CEP</FormLabel>
                          <FormControl>
                            <Input placeholder="00000-000" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="address_street"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Rua</FormLabel>
                          <FormControl>
                            <Input placeholder="Nome da rua" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid md:grid-cols-4 gap-4">
                    <FormField
                      control={form.control}
                      name="address_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Número</FormLabel>
                          <FormControl>
                            <Input placeholder="000" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="address_neighborhood"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Bairro</FormLabel>
                          <FormControl>
                            <Input placeholder="Nome do bairro" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="address_state"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Estado</FormLabel>
                          <FormControl>
                            <Input placeholder="SP" maxLength={2} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="address_city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cidade</FormLabel>
                        <FormControl>
                          <Input placeholder="Nome da cidade" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex gap-4 pt-4">
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
                    >
                      Cancelar
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* Security - Two-Factor Authentication */}
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
            <CardContent className="space-y-4">
              <div className="flex items-start justify-between p-4 border rounded-lg">
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

              {mfaFactors.length === 0 && (
                <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                  <h5 className="font-medium text-sm">Por que usar 2FA?</h5>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                    <li>Protege sua conta mesmo se sua senha for comprometida</li>
                    <li>Impede acessos não autorizados</li>
                    <li>Adiciona uma camada extra de segurança</li>
                    <li>Recomendado para contas com informações sensíveis</li>
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Password Change */}
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
            <CardContent className="space-y-4">
              <div className="flex items-start justify-between p-4 border rounded-lg">
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

          {/* Activity Logs */}
          <ActivityLogsCard />

          {/* Orders History Link */}
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
        </div>
      </div>
    </div>
  );
};

export default Profile;
