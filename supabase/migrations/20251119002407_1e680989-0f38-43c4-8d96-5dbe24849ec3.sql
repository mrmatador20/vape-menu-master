-- Tornar campos opcionais para facilitar cadastro rápido de produtos
ALTER TABLE products 
  ALTER COLUMN image DROP NOT NULL,
  ALTER COLUMN description DROP NOT NULL;