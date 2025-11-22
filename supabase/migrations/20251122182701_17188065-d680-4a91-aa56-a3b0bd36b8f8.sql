-- Adicionar campo display_order na tabela products
ALTER TABLE products ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- Criar índice para melhorar performance na ordenação
CREATE INDEX IF NOT EXISTS idx_products_display_order ON products(display_order);

-- Atualizar produtos existentes com valores sequenciais
UPDATE products 
SET display_order = subquery.row_num
FROM (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as row_num
  FROM products
) AS subquery
WHERE products.id = subquery.id;