import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

type SavedAddress = Tables<'saved_addresses'>;
type SavedAddressInsert = TablesInsert<'saved_addresses'>;
type SavedAddressUpdate = TablesUpdate<'saved_addresses'>;

export const useSavedAddresses = () => {
  const queryClient = useQueryClient();

  const { data: addresses, isLoading } = useQuery({
    queryKey: ['saved-addresses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('saved_addresses')
        .select('*')
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as SavedAddress[];
    },
  });

  const createAddress = useMutation({
    mutationFn: async (address: Omit<SavedAddressInsert, 'user_id'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('saved_addresses')
        .insert({ ...address, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-addresses'] });
      toast.success('Endereço salvo com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao salvar endereço:', error);
      toast.error('Erro ao salvar endereço');
    },
  });

  const updateAddress = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: SavedAddressUpdate }) => {
      const { data, error } = await supabase
        .from('saved_addresses')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-addresses'] });
      toast.success('Endereço atualizado com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao atualizar endereço:', error);
      toast.error('Erro ao atualizar endereço');
    },
  });

  const deleteAddress = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('saved_addresses')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-addresses'] });
      toast.success('Endereço removido com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao remover endereço:', error);
      toast.error('Erro ao remover endereço');
    },
  });

  const setDefaultAddress = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('saved_addresses')
        .update({ is_default: true })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-addresses'] });
      toast.success('Endereço padrão definido!');
    },
    onError: (error) => {
      console.error('Erro ao definir endereço padrão:', error);
      toast.error('Erro ao definir endereço padrão');
    },
  });

  const defaultAddress = addresses?.find(addr => addr.is_default) || addresses?.[0];

  return {
    addresses: addresses || [],
    defaultAddress,
    isLoading,
    createAddress: createAddress.mutate,
    updateAddress: updateAddress.mutate,
    deleteAddress: deleteAddress.mutate,
    setDefaultAddress: setDefaultAddress.mutate,
    isCreating: createAddress.isPending,
    isUpdating: updateAddress.isPending,
    isDeleting: deleteAddress.isPending,
  };
};
