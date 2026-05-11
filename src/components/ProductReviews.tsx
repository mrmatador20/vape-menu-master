import { useState } from 'react';
import { useReviews, useAddReview } from '@/hooks/useReviews';
import { useCanReviewProduct } from '@/hooks/useCanReviewProduct';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Star, Upload, Loader2, X, ShieldCheck, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

interface ProductReviewsProps {
  productId: string;
}

const ProductReviews = ({ productId }: ProductReviewsProps) => {
  const { data: reviews, isLoading } = useReviews(productId);
  const { data: eligibility, isLoading: isCheckingEligibility } = useCanReviewProduct(productId);
  const addReview = useAddReview();

  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 5MB');
      return;
    }
    if (!file.type.startsWith('image/')) {
      toast.error('Apenas arquivos de imagem são permitidos');
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const clearImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const resetForm = () => {
    setRating(5);
    setComment('');
    clearImage();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) {
      toast.error('Adicione um comentário');
      return;
    }

    let imageUrl: string | undefined;

    try {
      if (imageFile) {
        setUploading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Usuário não autenticado');
        const ext = imageFile.name.split('.').pop();
        const path = `${user.id}/${productId}-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from('review-images')
          .upload(path, imageFile, { cacheControl: '3600', upsert: false });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from('review-images').getPublicUrl(path);
        imageUrl = pub.publicUrl;
      }

      await addReview.mutateAsync({
        productId,
        rating,
        comment: comment.trim(),
        imageUrl,
      });

      resetForm();
      setOpen(false);
    } catch (err: any) {
      toast.error('Erro ao enviar avaliação: ' + (err?.message ?? 'desconhecido'));
    } finally {
      setUploading(false);
    }
  };

  const averageRating = reviews && reviews.length > 0
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  const renderActionArea = () => {
    if (isCheckingEligibility) {
      return (
        <p className="text-xs text-muted-foreground italic">Verificando elegibilidade...</p>
      );
    }
    if (!eligibility?.isAuthenticated) {
      return (
        <p className="text-xs text-muted-foreground italic">
          Faça login para avaliar este produto.
        </p>
      );
    }
    if (eligibility.hasReviewed) {
      return (
        <p className="text-xs text-primary flex items-center gap-1.5">
          <Check className="h-3.5 w-3.5" />
          Você já avaliou este produto. Obrigado pelo seu feedback!
        </p>
      );
    }
    if (!eligibility.hasPurchased) {
      return (
        <p className="text-xs text-muted-foreground italic max-w-[260px] text-right">
          Apenas clientes que adquiriram este produto podem deixar uma avaliação.
        </p>
      );
    }
    return (
      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
        <DialogTrigger asChild>
          <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground tracking-wide">
            <ShieldCheck className="h-3.5 w-3.5 mr-1.5" />
            Avaliar
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md border-primary/20">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">Sua avaliação</DialogTitle>
            <DialogDescription>
              Compartilhe sua experiência com outros clientes Fox Velour.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="text-xs uppercase tracking-[0.15em] text-muted-foreground mb-2 block">
                Sua nota
              </label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoveredRating(star)}
                    onMouseLeave={() => setHoveredRating(0)}
                    className="transition-transform hover:scale-110"
                  >
                    <Star
                      className={`h-8 w-8 transition-colors ${
                        star <= (hoveredRating || rating)
                          ? 'fill-primary text-primary drop-shadow-sm'
                          : 'text-muted-foreground/40'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs uppercase tracking-[0.15em] text-muted-foreground mb-2 block">
                Comentário
              </label>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Conte sua experiência com o produto..."
                className="min-h-[100px] resize-none"
                required
                maxLength={1000}
              />
            </div>

            <div>
              <label className="text-xs uppercase tracking-[0.15em] text-muted-foreground mb-2 block">
                Foto do produto <span className="normal-case tracking-normal text-muted-foreground/70">(opcional)</span>
              </label>
              {imagePreview ? (
                <div className="relative w-32 h-32 rounded-md overflow-hidden border border-border">
                  <img src={imagePreview} alt="Prévia" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={clearImage}
                    className="absolute top-1 right-1 bg-background/90 rounded-full p-1 hover:bg-background"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-24 border border-dashed border-border rounded-md cursor-pointer hover:border-primary/60 transition-colors">
                  <Upload className="h-5 w-5 text-muted-foreground mb-1" />
                  <span className="text-xs text-muted-foreground">Anexar foto (até 5MB)</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </label>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpen(false)}
                disabled={addReview.isPending || uploading}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={addReview.isPending || uploading || !comment.trim()}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {(addReview.isPending || uploading) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Enviar avaliação
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
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
        {renderActionArea()}
      </div>

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
              <p className="text-sm text-foreground whitespace-pre-line">{review.comment}</p>
              {review.image_url && (
                <img
                  src={review.image_url}
                  alt="Foto da avaliação"
                  loading="lazy"
                  className="mt-2 rounded-md max-h-40 object-cover border border-border"
                />
              )}
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
