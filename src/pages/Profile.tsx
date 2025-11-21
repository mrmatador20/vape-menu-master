import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/hooks/useProfile';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, User, MapPin, Phone, Calendar, Package } from 'lucide-react';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Separator } from '@/components/ui/separator';

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
  const [userEmail, setUserEmail] = useState<string>('');

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
  }, []);

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
