-- Remove a restrição de categorias fixas para permitir categorias dinâmicas
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_category_check;