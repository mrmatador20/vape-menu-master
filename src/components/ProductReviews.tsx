import { useState } from 'react';
import { useReviews, useAddReview } from '@/hooks/useReviews';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

interface ProductReviewsProps {
  productId: string;
}

const ProductReviews = ({ productId }: ProductReviewsProps) => {
  const { data: reviews, isLoading } = useReviews(productId);
  const addReview = useAddReview();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [showForm, setShowForm] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;

    await addReview.mutateAsync({
      productId,
      rating,
      comment: comment.trim(),
    });

    setComment('');
    setRating(5);
    setShowForm(false);
  };

  const averageRating = reviews && reviews.length > 0
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Avaliações</h3>
          {averageRating && (
            <div className="flex items-center gap-2 mt-1">
              <div className="flex">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`h-4 w-4 ${
                      star <= Math.round(Number(averageRating))
                        ? 'fill-primary text-primary'
                        : 'text-muted-foreground'
                    }`}
                  />
                ))}
              </div>
              <span className="text-sm text-muted-foreground">
                {averageRating} ({reviews?.length || 0} {reviews?.length === 1 ? 'avaliação' : 'avaliações'})
              </span>
            </div>
          )}
        </div>
        {user && !showForm && (
          <Button onClick={() => setShowForm(true)} size="sm" variant="outline">
            Avaliar
          </Button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="space-y-3 p-4 border border-border rounded-lg bg-card">
          <div>
            <label className="text-sm font-medium mb-2 block">Sua nota:</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className="transition-colors"
                >
                  <Star
                    className={`h-6 w-6 ${
                      star <= rating
                        ? 'fill-primary text-primary'
                        : 'text-muted-foreground hover:text-primary'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Comentário:</label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Conte sua experiência com o produto..."
              className="min-h-[80px]"
              required
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={addReview.isPending}>
              {addReview.isPending ? 'Enviando...' : 'Enviar'}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setShowForm(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando avaliações...</p>
      ) : reviews && reviews.length > 0 ? (
        <div className="space-y-3">
          {reviews.map((review) => (
            <div key={review.id} className="p-3 border border-border rounded-lg bg-card">
              <div className="flex gap-1 mb-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`h-4 w-4 ${
                      star <= review.rating
                        ? 'fill-primary text-primary'
                        : 'text-muted-foreground'
                    }`}
                  />
                ))}
              </div>
              <p className="text-sm text-foreground">{review.comment}</p>
              <p className="text-xs text-muted-foreground mt-2">
                {new Date(review.created_at).toLocaleDateString('pt-BR')}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Nenhuma avaliação ainda. Seja o primeiro!</p>
      )}
    </div>
  );
};

export default ProductReviews;
