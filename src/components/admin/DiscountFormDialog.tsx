import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { useCategories } from "@/hooks/useCategories";
import { useSubcategories } from "@/hooks/useSubcategories";

interface DiscountFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  discount?: any; // Discount to edit (if provided)
}

export function DiscountFormDialog({ open, onOpenChange, discount }: DiscountFormDialogProps) {
  const queryClient = useQueryClient();
  const isEditing = !!discount;
  
  const { register, handleSubmit, watch, setValue, reset } = useForm({
    defaultValues: discount ? {
      code: discount.code,
      type: discount.type,
      value: discount.value,
      schedule_type: discount.schedule_type,
      start_time: discount.start_time,
      end_time: discount.end_time,
      day_of_week: discount.day_of_week || 0,
      valid_until: discount.valid_until ? discount.valid_until.split('T')[0] : null,
      is_active: discount.is_active,
      max_uses: discount.max_uses,
      is_influencer_coupon: discount.is_influencer_coupon || false,
      influencer_user_id: discount.influencer_user_id || null,
      influencer_name: discount.influencer_name || '',
      scope_type: discount.scope_type || 'all',
      scope_category: discount.scope_category || '',
      scope_subcategory: discount.scope_subcategory || '',
    } : {
      code: '',
      type: 'percent',
      value: 0,
      schedule_type: 'permanent',
      start_time: null as string | null,
      end_time: null as string | null,
      day_of_week: 0,
      valid_until: null as string | null,
      is_active: true,
      max_uses: null as number | null,
      is_influencer_coupon: false,
      influencer_user_id: null as string | null,
      influencer_name: '',
      scope_type: 'all',
      scope_category: '',
      scope_subcategory: '',
    },
  });

  const scheduleType = watch('schedule_type');
  const isInfluencerCoupon = watch('is_influencer_coupon');
  const influencerUserId = watch('influencer_user_id');
  const scopeType = watch('scope_type');
  const scopeCategoryName = watch('scope_category');

  const { data: categories } = useCategories();
  const selectedCategory = categories?.find((c) => c.name === scopeCategoryName);
  const { data: subcategories } = useSubcategories(
    selectedCategory?.id || null,
    selectedCategory?.name || null
  );

  const [userPickerOpen, setUserPickerOpen] = useState(false);
  const [userSearch, setUserSearch] = useState('');

  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['influencer-user-search', userSearch],
    enabled: open && !!isInfluencerCoupon,
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)('list_users_for_influencer_linking', {
        search_text: userSearch || null,
      });
      if (error) throw error;
      return (data ?? []) as { id: string; full_name: string | null; email: string }[];
    },
  });

  const selectedUser = users?.find((u) => u.id === influencerUserId);

  // Reset form when discount prop changes or dialog opens
  useEffect(() => {
    if (open) {
      if (discount) {
        reset({
          code: discount.code,
          type: discount.type,
          value: discount.value,
          schedule_type: discount.schedule_type,
          start_time: discount.start_time,
          end_time: discount.end_time,
          day_of_week: discount.day_of_week || 0,
          valid_until: discount.valid_until ? discount.valid_until.split('T')[0] : null,
          is_active: discount.is_active,
          max_uses: discount.max_uses,
          is_influencer_coupon: discount.is_influencer_coupon || false,
          influencer_user_id: discount.influencer_user_id || null,
          influencer_name: discount.influencer_name || '',
        });
      } else {
        reset({
          code: '',
          type: 'percent',
          value: 0,
          schedule_type: 'permanent',
          start_time: null,
          end_time: null,
          day_of_week: 0,
          valid_until: null,
          is_active: true,
          max_uses: null,
          is_influencer_coupon: false,
          influencer_user_id: null,
          influencer_name: '',
        });
      }
    }
  }, [discount, open, reset]);

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (isEditing) {
        const { error } = await supabase
          .from('discounts')
          .update(data)
          .eq('id', discount.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('discounts').insert([data]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-discounts'] });
      toast.success(isEditing ? 'Desconto atualizado com sucesso!' : 'Desconto criado com sucesso!');
      reset();
      onOpenChange(false);
    },
    onError: () => {
      toast.error(isEditing ? 'Erro ao atualizar desconto' : 'Erro ao criar desconto');
    },
  });

  const onSubmit = (data: any) => {
    // Clean up data - convert empty strings to null for optional fields
    const cleanedData = {
      code: data.code,
      type: data.type,
      value: Number(data.value),
      schedule_type: data.schedule_type,
      start_time: data.start_time && data.start_time.trim() !== '' ? data.start_time : null,
      end_time: data.end_time && data.end_time.trim() !== '' ? data.end_time : null,
      day_of_week: data.schedule_type === 'daily' ? Number(data.day_of_week) : null,
      valid_until: data.valid_until && data.valid_until.trim() !== '' ? data.valid_until : null,
      max_uses: data.max_uses && Number(data.max_uses) > 0 ? Number(data.max_uses) : null,
      is_active: data.is_active,
      is_influencer_coupon: !!data.is_influencer_coupon,
      influencer_user_id: data.is_influencer_coupon && data.influencer_user_id
        ? data.influencer_user_id
        : null,
      influencer_name: data.is_influencer_coupon && data.influencer_name?.trim()
        ? data.influencer_name.trim()
        : null,
    };

    if (cleanedData.is_influencer_coupon && !cleanedData.influencer_user_id && !cleanedData.influencer_name) {
      toast.error('Vincule um parceiro ou informe o nome do responsável');
      return;
    }
    
    console.log('Dados a serem enviados:', cleanedData);
    saveMutation.mutate(cleanedData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Desconto' : 'Criar Novo Desconto'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="code">Código do Cupom</Label>
              <Input
                id="code"
                {...register('code', { required: true })}
                placeholder="DESCONTO10"
                className="uppercase"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Tipo de Desconto</Label>
              <Select
                value={watch('type')}
                onValueChange={(value) => setValue('type', value as any)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percent">Percentual</SelectItem>
                  <SelectItem value="fixed">Valor Fixo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="value">Valor</Label>
              <Input
                id="value"
                type="number"
                step="0.01"
                {...register('value', { required: true, valueAsNumber: true })}
                placeholder={watch('type') === 'percent' ? '10' : '5.00'}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="schedule_type">Tipo de Agendamento</Label>
              <Select
                value={watch('schedule_type')}
                onValueChange={(value) => setValue('schedule_type', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="permanent">Permanente</SelectItem>
                  <SelectItem value="hourly">Por Horário</SelectItem>
                  <SelectItem value="daily">Por Dia da Semana</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {scheduleType === 'hourly' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="start_time">Hora Início</Label>
                  <Input
                    id="start_time"
                    type="time"
                    {...register('start_time')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_time">Hora Fim</Label>
                  <Input
                    id="end_time"
                    type="time"
                    {...register('end_time')}
                  />
                </div>
              </>
            )}

            {scheduleType === 'daily' && (
              <div className="space-y-2">
                <Label htmlFor="day_of_week">Dia da Semana</Label>
                <Select
                  value={watch('day_of_week').toString()}
                  onValueChange={(value) => setValue('day_of_week', parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Domingo</SelectItem>
                    <SelectItem value="1">Segunda</SelectItem>
                    <SelectItem value="2">Terça</SelectItem>
                    <SelectItem value="3">Quarta</SelectItem>
                    <SelectItem value="4">Quinta</SelectItem>
                    <SelectItem value="5">Sexta</SelectItem>
                    <SelectItem value="6">Sábado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="valid_until">Válido Até (opcional)</Label>
              <Input
                id="valid_until"
                type="date"
                {...register('valid_until')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="max_uses">Máximo de Usos (opcional)</Label>
              <Input
                id="max_uses"
                type="number"
                {...register('max_uses', { valueAsNumber: true })}
                placeholder="Ilimitado"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="is_active"
              checked={watch('is_active')}
              onCheckedChange={(checked) => setValue('is_active', checked)}
            />
            <Label htmlFor="is_active">Ativo</Label>
          </div>

          <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
            <div className="flex items-center space-x-2">
              <Switch
                id="is_influencer_coupon"
                checked={!!isInfluencerCoupon}
                onCheckedChange={(checked) => setValue('is_influencer_coupon', checked)}
              />
              <Label htmlFor="is_influencer_coupon" className="font-medium">
                Cupom de Influencer/Parceiro
              </Label>
            </div>
            <p className="text-xs text-muted-foreground">
              Vendas feitas com este cupom serão registradas no painel de métricas de parceiros.
            </p>
            {isInfluencerCoupon && (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Vincular a um usuário cadastrado</Label>
                  <Popover open={userPickerOpen} onOpenChange={setUserPickerOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        role="combobox"
                        className="w-full justify-between font-normal"
                      >
                        {selectedUser ? (
                          <span className="truncate text-left">
                            {selectedUser.full_name || 'Sem nome'}{' '}
                            <span className="text-muted-foreground">· {selectedUser.email}</span>
                          </span>
                        ) : influencerUserId ? (
                          <span className="text-muted-foreground truncate">Carregando usuário…</span>
                        ) : (
                          <span className="text-muted-foreground">Buscar por nome ou e-mail…</span>
                        )}
                        <ChevronsUpDown className="h-4 w-4 opacity-50 shrink-0 ml-2" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                      <Command shouldFilter={false}>
                        <CommandInput
                          placeholder="Digite nome ou e-mail…"
                          value={userSearch}
                          onValueChange={setUserSearch}
                        />
                        <CommandList>
                          {usersLoading ? (
                            <div className="py-6 flex justify-center">
                              <Loader2 className="h-4 w-4 animate-spin" />
                            </div>
                          ) : (
                            <>
                              <CommandEmpty>Nenhum usuário encontrado.</CommandEmpty>
                              <CommandGroup>
                                {users?.map((u) => (
                                  <CommandItem
                                    key={u.id}
                                    value={u.id}
                                    onSelect={() => {
                                      setValue('influencer_user_id', u.id);
                                      if (!watch('influencer_name')) {
                                        setValue('influencer_name', u.full_name || '');
                                      }
                                      setUserPickerOpen(false);
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        'mr-2 h-4 w-4',
                                        influencerUserId === u.id ? 'opacity-100' : 'opacity-0'
                                      )}
                                    />
                                    <div className="flex flex-col">
                                      <span className="text-sm">{u.full_name || 'Sem nome'}</span>
                                      <span className="text-xs text-muted-foreground">{u.email}</span>
                                    </div>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </>
                          )}
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  {influencerUserId && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs text-muted-foreground"
                      onClick={() => setValue('influencer_user_id', null)}
                    >
                      <X className="h-3 w-3 mr-1" /> Remover vínculo
                    </Button>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="influencer_name">
                    Nome do Responsável/Influencer{' '}
                    <span className="text-xs text-muted-foreground font-normal">
                      (use se não houver conta cadastrada)
                    </span>
                  </Label>
                  <Input
                    id="influencer_name"
                    {...register('influencer_name')}
                    placeholder="Ex: Emilly Souza"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending 
                ? (isEditing ? 'Atualizando...' : 'Criando...') 
                : (isEditing ? 'Atualizar Desconto' : 'Criar Desconto')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
