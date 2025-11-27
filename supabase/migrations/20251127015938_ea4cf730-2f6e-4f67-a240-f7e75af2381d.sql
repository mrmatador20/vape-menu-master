-- ============================================
-- CORREÇÃO 1: RLS de notification_preferences
-- Remove acesso público a números de telefone
-- ============================================

-- Drop existing public policies if any
DROP POLICY IF EXISTS "Only admins can insert notification preferences" ON public.notification_preferences;
DROP POLICY IF EXISTS "Only admins can update notification preferences" ON public.notification_preferences;
DROP POLICY IF EXISTS "Only admins can view notification preferences" ON public.notification_preferences;
DROP POLICY IF EXISTS "Service role can manage notification preferences" ON public.notification_preferences;

-- Recreate strict policies: Only admins and service_role can access
CREATE POLICY "Only admins can view notification preferences"
ON public.notification_preferences
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can insert notification preferences"
ON public.notification_preferences
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can update notification preferences"
ON public.notification_preferences
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete notification preferences"
ON public.notification_preferences
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Service role still needs full access for edge functions
CREATE POLICY "Service role full access on notification_preferences"
ON public.notification_preferences
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================
-- CORREÇÃO 4: Política SELECT pública para discounts ativos
-- Permite usuários verem promoções disponíveis
-- ============================================

-- Add public read policy for active discounts only
CREATE POLICY "Public can view active discounts"
ON public.discounts
FOR SELECT
TO authenticated
USING (
  is_active = true 
  AND (valid_until IS NULL OR valid_until >= now())
);