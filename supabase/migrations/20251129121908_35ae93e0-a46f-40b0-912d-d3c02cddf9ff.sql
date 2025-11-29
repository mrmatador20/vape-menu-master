-- Adicionar coluna para valor mínimo de frete grátis na tabela shipping_rates
ALTER TABLE public.shipping_rates
ADD COLUMN free_shipping_min_value numeric DEFAULT NULL;

COMMENT ON COLUMN public.shipping_rates.free_shipping_min_value IS 'Valor mínimo da compra para frete grátis neste CEP. NULL = sem frete grátis.';