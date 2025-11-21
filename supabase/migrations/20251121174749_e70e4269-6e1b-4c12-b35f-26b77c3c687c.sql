-- Criar tabela para gerenciar taxas de entrega por CEP
CREATE TABLE public.shipping_rates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cep TEXT NOT NULL UNIQUE,
  price NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.shipping_rates ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para shipping_rates
CREATE POLICY "Taxas de entrega são públicas para leitura"
ON public.shipping_rates
FOR SELECT
USING (true);

CREATE POLICY "Admins podem inserir taxas de entrega"
ON public.shipping_rates
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins podem atualizar taxas de entrega"
ON public.shipping_rates
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins podem deletar taxas de entrega"
ON public.shipping_rates
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger para atualizar updated_at automaticamente
CREATE TRIGGER update_shipping_rates_updated_at
BEFORE UPDATE ON public.shipping_rates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Adicionar coluna de taxa de entrega na tabela orders
ALTER TABLE public.orders ADD COLUMN shipping_cost NUMERIC DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN cep TEXT;