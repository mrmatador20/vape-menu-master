-- Create banners table for promotional announcements
CREATE TABLE public.banners (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  background_color TEXT NOT NULL DEFAULT '#8B5CF6',
  text_color TEXT NOT NULL DEFAULT '#FFFFFF',
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  rotation_seconds INTEGER NOT NULL DEFAULT 5,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;

-- Create policies for banners
CREATE POLICY "Banners são públicos para leitura"
ON public.banners
FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins podem inserir banners"
ON public.banners
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins podem atualizar banners"
ON public.banners
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins podem deletar banners"
ON public.banners
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins podem ver todos os banners"
ON public.banners
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_banners_updated_at
BEFORE UPDATE ON public.banners
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default free shipping banner
INSERT INTO public.banners (title, description, background_color, text_color, display_order, rotation_seconds)
VALUES 
  ('🎉 Frete GRÁTIS', 'Em compras acima de R$100,00!', '#8B5CF6', '#FFFFFF', 1, 5),
  ('⚡ Entrega Rápida', 'Receba seus produtos em até 3 dias úteis', '#EC4899', '#FFFFFF', 2, 5);