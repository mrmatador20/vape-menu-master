import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// ✅ CORREÇÃO: Interface para reviews públicas (sem user_id exposto)
export interface PublicReview {
  id: string;
  product_id: string;
  anonymous_user: string; // Truncado: "fb29eebc..." em vez de UUID completo
  rating: number;
  comment: string | null;
  image_url: string | null;
  created_at: string;
}

// Interface interna para criar reviews (ainda usa reviews table)
interface Review {
  id: string;
  product_id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

export const useReviews = (productId: string) => {
  return useQuery({
    queryKey: ['reviews', productId],
    queryFn: async () => {
      // ✅ CORREÇÃO DE SEGURANÇA: Usa public_reviews em vez de reviews
      // Isso previne exposição de user_id completos
      const { data, error } = await supabase
        .from('public_reviews')
        .select('*')
        .eq('product_id', productId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as PublicReview[];
    },
  });
};

export const useAddReview = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      productId,
      rating,
      comment,
      imageUrl,
    }: {
      productId: string;
      rating: number;
      comment: string;
      imageUrl?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('reviews')
        .insert({
          product_id: productId,
          user_id: user.id,
          rating,
          comment,
          image_url: imageUrl ?? null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['reviews', variables.productId] });
      toast.success('Avaliação adicionada com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao adicionar avaliação: ' + error.message);
    },
  });
};
