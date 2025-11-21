import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { Trash2, Star, MessageSquare, Edit2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAddReviewResponse, useUpdateReviewResponse, useDeleteReviewResponse } from '@/hooks/useReviewResponses';
import ResponseFormDialog from '@/components/admin/ResponseFormDialog';
import { Badge } from '@/components/ui/badge';

interface ReviewResponse {
  id: string;
  review_id: string;
  admin_user_id: string;
  response_text: string;
  created_at: string;
  updated_at: string;
}

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  product_id: string;
  user_id: string;
  review_responses: ReviewResponse[];
}

export default function AdminReviews() {
  const [deleteReviewId, setDeleteReviewId] = useState<string | null>(null);
  const [responseDialogOpen, setResponseDialogOpen] = useState(false);
  const [editingResponse, setEditingResponse] = useState<{ responseId: string; reviewId: string; text: string } | null>(null);
  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const addResponse = useAddReviewResponse();
  const updateResponse = useUpdateReviewResponse();
  const deleteResponse = useDeleteReviewResponse();

  const { data: reviews, isLoading } = useQuery({
    queryKey: ['admin-reviews'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reviews')
        .select(`
          *,
          products (
            name,
            image
          ),
          review_responses (
            id,
            review_id,
            admin_user_id,
            response_text,
            created_at,
            updated_at
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as (Review & { products: { name: string; image: string } })[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (reviewId: string) => {
      const { error } = await supabase
        .from('reviews')
        .delete()
        .eq('id', reviewId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-reviews'] });
      toast.success('Avaliação excluída com sucesso');
      setDeleteReviewId(null);
    },
    onError: (error) => {
      console.error('Erro ao excluir avaliação:', error);
      toast.error('Erro ao excluir avaliação');
    },
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleAddResponse = (reviewId: string) => {
    setSelectedReviewId(reviewId);
    setEditingResponse(null);
    setResponseDialogOpen(true);
  };

  const handleEditResponse = (responseId: string, reviewId: string, text: string) => {
    setEditingResponse({ responseId, reviewId, text });
    setSelectedReviewId(reviewId);
    setResponseDialogOpen(true);
  };

  const handleSubmitResponse = async (responseText: string) => {
    if (editingResponse) {
      await updateResponse.mutateAsync({
        responseId: editingResponse.responseId,
        responseText,
        reviewId: editingResponse.reviewId,
      });
    } else if (selectedReviewId) {
      await addResponse.mutateAsync({
        reviewId: selectedReviewId,
        responseText,
      });
    }
    setResponseDialogOpen(false);
    setEditingResponse(null);
    setSelectedReviewId(null);
  };

  const handleDeleteResponse = async (responseId: string, reviewId: string) => {
    if (confirm('Tem certeza que deseja excluir esta resposta?')) {
      await deleteResponse.mutateAsync({ responseId, reviewId });
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating
                ? 'fill-primary text-primary'
                : 'text-muted-foreground'
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Gerenciar Avaliações</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Todas as Avaliações</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando avaliações...
            </div>
          ) : !reviews || reviews.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma avaliação encontrada
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead>Avaliação</TableHead>
                    <TableHead>Comentário</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reviews.map((review) => (
                    <>
                      <TableRow key={review.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {review.products.image && (
                              <img
                                src={review.products.image}
                                alt={review.products.name}
                                className="h-10 w-10 rounded object-cover"
                              />
                            )}
                            <span className="font-medium">{review.products.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>{renderStars(review.rating)}</TableCell>
                        <TableCell>
                          <div className="max-w-xs">
                            {review.comment ? (
                              <p className="text-sm line-clamp-2">{review.comment}</p>
                            ) : (
                              <span className="text-muted-foreground text-sm italic">
                                Sem comentário
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(review.created_at)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleAddResponse(review.id)}
                            >
                              <MessageSquare className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => setDeleteReviewId(review.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                      {review.review_responses && review.review_responses.length > 0 && (
                        <TableRow>
                          <TableCell colSpan={5}>
                            <div className="pl-8 space-y-3">
                              {review.review_responses.map((response) => (
                                <div
                                  key={response.id}
                                  className="bg-muted/50 rounded-lg p-4 space-y-2"
                                >
                                  <div className="flex items-center justify-between">
                                    <Badge variant="secondary" className="gap-1">
                                      <MessageSquare className="h-3 w-3" />
                                      Resposta do Admin
                                    </Badge>
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs text-muted-foreground">
                                        {formatDate(response.created_at)}
                                      </span>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() =>
                                          handleEditResponse(
                                            response.id,
                                            review.id,
                                            response.response_text
                                          )
                                        }
                                      >
                                        <Edit2 className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() =>
                                          handleDeleteResponse(response.id, review.id)
                                        }
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </div>
                                  <p className="text-sm">{response.response_text}</p>
                                </div>
                              ))}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog
        open={deleteReviewId !== null}
        onOpenChange={(open) => !open && setDeleteReviewId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta avaliação? Esta ação não pode ser
              desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteReviewId && deleteMutation.mutate(deleteReviewId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ResponseFormDialog
        open={responseDialogOpen}
        onOpenChange={setResponseDialogOpen}
        onSubmit={handleSubmitResponse}
        initialValue={editingResponse?.text || ''}
        isLoading={addResponse.isPending || updateResponse.isPending}
        title={editingResponse ? 'Editar Resposta' : 'Adicionar Resposta'}
      />
    </div>
  );
}
