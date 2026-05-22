
-- Allow influencers (linked user) to view their own coupon conversions
CREATE POLICY "Influencers can view their own coupon conversions"
ON public.coupon_conversions
FOR SELECT
TO authenticated
USING (influencer_user_id = auth.uid());

-- Admin-only RPC to list users (with email from auth.users) for linking influencer coupons
CREATE OR REPLACE FUNCTION public.list_users_for_influencer_linking(search_text text DEFAULT NULL)
RETURNS TABLE (id uuid, full_name text, email text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  RETURN QUERY
  SELECT p.id, p.full_name, u.email::text
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
  WHERE search_text IS NULL
     OR length(trim(search_text)) = 0
     OR p.full_name ILIKE '%' || search_text || '%'
     OR u.email ILIKE '%' || search_text || '%'
  ORDER BY COALESCE(p.full_name, u.email::text) ASC
  LIMIT 50;
END;
$$;

REVOKE ALL ON FUNCTION public.list_users_for_influencer_linking(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_users_for_influencer_linking(text) TO authenticated;
