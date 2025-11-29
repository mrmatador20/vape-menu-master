-- Permitir CEP NULL para frete grátis aplicável a qualquer CEP
-- Remover constraint de NOT NULL do CEP para permitir taxas de frete grátis globais
ALTER TABLE public.shipping_rates
ALTER COLUMN cep DROP NOT NULL;

-- Adicionar comentário explicativo
COMMENT ON COLUMN public.shipping_rates.cep IS 'CEP específico para esta taxa. NULL = aplica para qualquer CEP (frete grátis global)';

-- Criar unique constraint condicional: apenas um registro pode ter CEP NULL
CREATE UNIQUE INDEX shipping_rates_null_cep_unique 
ON public.shipping_rates (free_shipping_min_value) 
WHERE cep IS NULL AND free_shipping_min_value IS NOT NULL;