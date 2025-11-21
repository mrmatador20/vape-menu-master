-- Adiciona política RLS para admins excluírem avaliações
CREATE POLICY "Admins podem deletar qualquer avaliação"
ON public.reviews
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Adiciona política RLS para admins visualizarem estatísticas
CREATE POLICY "Admins podem visualizar todas avaliações"
ON public.reviews
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'));