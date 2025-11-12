-- Criar tabela de produtos
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('v250', 'v400')),
  price DECIMAL(10,2) NOT NULL,
  image TEXT NOT NULL,
  description TEXT NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserir produtos iniciais
INSERT INTO public.products (name, category, price, image, description, stock) VALUES
('Vaper V250 Classic', 'v250', 89.90, '/placeholder.svg', '250 puffs, sabor menta refrescante', 100),
('Vaper V250 Tropical', 'v250', 89.90, '/placeholder.svg', '250 puffs, mix de frutas tropicais', 100),
('Vaper V250 Berry', 'v250', 89.90, '/placeholder.svg', '250 puffs, frutas vermelhas intensas', 100),
('Vaper V250 Ice', 'v250', 94.90, '/placeholder.svg', '250 puffs, menta gelada extrema', 100),
('Vaper V400 Premium', 'v400', 129.90, '/placeholder.svg', '400 puffs, sabor uva premium', 100),
('Vaper V400 Citrus', 'v400', 129.90, '/placeholder.svg', '400 puffs, cítricos refrescantes', 100),
('Vaper V400 Mango', 'v400', 134.90, '/placeholder.svg', '400 puffs, manga tropical suave', 100),
('Vaper V400 Watermelon', 'v400', 129.90, '/placeholder.svg', '400 puffs, melancia refrescante', 100),
('Vaper V400 Mint', 'v400', 134.90, '/placeholder.svg', '400 puffs, menta suave e refrescante', 100),
('Vaper V400 Lychee', 'v400', 139.90, '/placeholder.svg', '400 puffs, lichia doce e exótica', 100);

-- Criar tabela de pedidos
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('pix', 'dinheiro')),
  change_amount DECIMAL(10,2),
  address_street TEXT NOT NULL,
  address_number TEXT NOT NULL,
  address_neighborhood TEXT NOT NULL,
  address_city TEXT NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'delivered', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar tabela de itens do pedido
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS nas tabelas
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Políticas RLS - produtos são públicos (todos podem ver)
CREATE POLICY "Produtos são públicos"
  ON public.products FOR SELECT
  USING (true);

-- Políticas RLS - pedidos são públicos (loja sem login)
CREATE POLICY "Qualquer um pode criar pedidos"
  ON public.orders FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Qualquer um pode ver pedidos"
  ON public.orders FOR SELECT
  USING (true);

-- Políticas RLS - itens de pedido são públicos
CREATE POLICY "Qualquer um pode criar itens de pedido"
  ON public.order_items FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Qualquer um pode ver itens de pedido"
  ON public.order_items FOR SELECT
  USING (true);

-- Criar índices para melhor performance
CREATE INDEX idx_products_category ON public.products(category);
CREATE INDEX idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX idx_order_items_product_id ON public.order_items(product_id);