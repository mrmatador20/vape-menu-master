-- Criar tabela de descontos
CREATE TABLE public.discounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  value NUMERIC NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('percent', 'fixed')),
  schedule_type TEXT NOT NULL CHECK (schedule_type IN ('permanent', 'hourly', 'daily')),
  start_time TIME,
  end_time TIME,
  day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6),
  is_active BOOLEAN NOT NULL DEFAULT true,
  valid_until TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de sabores
CREATE TABLE public.flavors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Adicionar coluna para sabor escolhido nos itens do pedido
ALTER TABLE public.order_items
ADD COLUMN flavor TEXT;

-- Enable RLS
ALTER TABLE public.discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flavors ENABLE ROW LEVEL SECURITY;

-- Políticas para descontos (públicos para leitura)
CREATE POLICY "Descontos são públicos para leitura"
ON public.discounts
FOR SELECT
USING (true);

-- Políticas para sabores (públicos para leitura)
CREATE POLICY "Sabores são públicos para leitura"
ON public.flavors
FOR SELECT
USING (true);

-- Criar índices para performance
CREATE INDEX idx_discounts_code ON public.discounts(code);
CREATE INDEX idx_discounts_active ON public.discounts(is_active);
CREATE INDEX idx_flavors_product_id ON public.flavors(product_id);