import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Star, MessageSquare, Check } from 'lucide-react';
import { useAddReview } from '@/hooks/useReviews';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

interface OrderItem {
  id: string;
  product_id: string | null;
  products?: {
    name: string;
    image: string | null;
  } | null;
  flavor?: string | null;
}

interface PostDeliveryReviewDialogProps {
  orderId: string;
  orderItems: OrderItem[];
}

export function PostDeliveryReviewDialog({ orderId, orderItems }: PostDeliveryReviewDialogProps) {
  const [open, setOpen] = useState(false);
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const addReview = useAddReview();

  // Buscar avaliações existentes do usuário para os produtos do pedido
  const { data: existingReviews, refetch } = useQuery({
    queryKey: ['user-reviews-for-order', orderId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const productIds = orderItems
        .filter(item => item.product_id)
        .map(item => item.product_id);

      const { data, error } = await supabase
        .from('reviews')
        .select('product_id')
        .eq('user_id', user.id)
        .in('product_id', productIds as string[]);

      if (error) throw error;
      return data?.map(r => r.product_id) || [];
    },
    enabled: open,
  });

  // Filtrar itens que ainda não foram avaliados
  const itemsToReview = orderItems.filter(
    item => item.product_id && !existingReviews?.includes(item.product_id)
  );

  const currentItem = itemsToReview[currentItemIndex];
  const totalItemsToReview = itemsToReview.length;
  const hasItemsToReview = totalItemsToReview > 0;

  const handleSubmitReview = async () => {
    if (!currentItem?.product_id || !comment.trim()) return;

    await addReview.mutateAsync({
      productId: currentItem.product_id,
      rating,
      comment: comment.trim(),
    });

    // Reset form
    setRating(5);
    setComment('');

    // Move to next item or close
    if (currentItemIndex < totalItemsToReview - 1) {
      setCurrentItemIndex(prev => prev + 1);
    } else {
      setOpen(false);
      setCurrentItemIndex(0);
      refetch();
    }
  };

  const handleSkip = () => {
    if (currentItemIndex < totalItemsToReview - 1) {
      setCurrentItemIndex(prev => prev + 1);
      setRating(5);
      setComment('');
    } else {
      setOpen(false);
      setCurrentItemIndex(0);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setCurrentItemIndex(0);
      setRating(5);
      setComment('');
    }
  };

  // Contar quantos já foram avaliados
  const alreadyReviewedCount = orderItems.filter(
    item => item.product_id && existingReviews?.includes(item.product_id)
  ).length;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <MessageSquare className="h-4 w-4" />
          {alreadyReviewedCount === orderItems.length ? (
            <>
              <Check className="h-4 w-4" />
              Avaliado
            </>
          ) : (
            `Avaliar Pedido`
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Avalie seu pedido</DialogTitle>
          <DialogDescription>
            {hasItemsToReview 
              ? `Produto ${currentItemIndex + 1} de ${totalItemsToReview} para avaliar`
              : 'Você já avaliou todos os produtos deste pedido!'
            }
          </DialogDescription>
        </DialogHeader>

        {hasItemsToReview && currentItem ? (
          <div className="space-y-4">
            {/* Produto atual */}
            <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/30">
              {currentItem.products?.image && (
                <img
                  src={currentItem.products.image}
                  alt={currentItem.products?.name}
                  className="h-16 w-16 rounded-md object-cover"
                />
              )}
              <div>
                <p className="font-medium">{currentItem.products?.name}</p>
                {currentItem.flavor && (
                  <p className="text-sm text-muted-foreground">
                    Sabor: {currentItem.flavor}
                  </p>
                )}
              </div>
            </div>

            {/* Estrelas */}
            <div>
              <label className="text-sm font-medium mb-2 block">Sua avaliação:</label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="transition-colors"
                  >
                    <Star
                      className={`h-8 w-8 ${
                        star <= rating
                          ? 'fill-primary text-primary'
                          : 'text-muted-foreground hover:text-primary'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Comentário */}
            <div>
              <label className="text-sm font-medium mb-2 block">Comentário:</label>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Conte sua experiência com o produto..."
                className="min-h-[100px]"
              />
            </div>

            {/* Botões */}
            <div className="flex gap-2 justify-end">
              <Button 
                variant="ghost" 
                onClick={handleSkip}
                disabled={addReview.isPending}
              >
                Pular
              </Button>
              <Button 
                onClick={handleSubmitReview}
                disabled={addReview.isPending || !comment.trim()}
              >
                {addReview.isPending ? 'Enviando...' : 'Enviar Avaliação'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center py-6 space-y-4">
            <div className="rounded-full bg-green-100 p-3">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <p className="text-center text-muted-foreground">
              Obrigado por avaliar! Sua opinião é muito importante para nós.
            </p>
            <Button onClick={() => setOpen(false)}>
              Fechar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
