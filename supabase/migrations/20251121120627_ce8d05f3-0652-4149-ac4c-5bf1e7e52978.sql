-- Adicionar policy para admins poderem deletar pedidos
CREATE POLICY "Admins can delete orders"
ON public.orders
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));