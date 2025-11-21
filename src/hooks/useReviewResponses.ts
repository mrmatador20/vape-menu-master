import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ReviewResponse {
  id: string;
  review_id: string;
  admin_user_id: string;
  response_text: string;
  created_at: string;
  updated_at: string;
}

export const useReviewResponses = (reviewId: string) => {
  return useQuery({
    queryKey: ['review-responses', reviewId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('review_responses')
        .select('*')
        .eq('review_id', reviewId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ReviewResponse[];
    },
  });
};

export const useAddReviewResponse = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      reviewId,
      responseText,
    }: {
      reviewId: string;
      responseText: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('review_responses')
        .insert({
          review_id: reviewId,
          admin_user_id: user.id,
          response_text: responseText,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['review-responses', variables.reviewId] });
      queryClient.invalidateQueries({ queryKey: ['admin-reviews'] });
      toast.success('Resposta adicionada com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao adicionar resposta: ' + error.message);
    },
  });
};

export const useUpdateReviewResponse = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      responseId,
      responseText,
      reviewId,
    }: {
      responseId: string;
      responseText: string;
      reviewId: string;
    }) => {
      const { data, error } = await supabase
        .from('review_responses')
        .update({ response_text: responseText })
        .eq('id', responseId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['review-responses', variables.reviewId] });
      queryClient.invalidateQueries({ queryKey: ['admin-reviews'] });
      toast.success('Resposta atualizada com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar resposta: ' + error.message);
    },
  });
};

export const useDeleteReviewResponse = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ responseId, reviewId }: { responseId: string; reviewId: string }) => {
      const { error } = await supabase
        .from('review_responses')
        .delete()
        .eq('id', responseId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['review-responses', variables.reviewId] });
      queryClient.invalidateQueries({ queryKey: ['admin-reviews'] });
      toast.success('Resposta excluída com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao excluir resposta: ' + error.message);
    },
  });
};
