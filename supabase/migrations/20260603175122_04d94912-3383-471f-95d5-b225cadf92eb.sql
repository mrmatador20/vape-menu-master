
-- 1. Fix SECURITY DEFINER view: public_reviews
ALTER VIEW public.public_reviews SET (security_invoker = true);

-- 2. Fix function search_path mutable
CREATE OR REPLACE FUNCTION public.slugify(v text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT trim(both '-' from
    regexp_replace(
      regexp_replace(
        lower(
          translate(
            COALESCE(v, ''),
            'àáâãäåāăąçćčďđèéêëēĕėęěğģìíîïīĭįıłļľńņňñòóôõöōŏőøŕŗřśşšţťùúûüũūŭůűųŵýÿŷźżžÀÁÂÃÄÅĀĂĄÇĆČĎĐÈÉÊËĒĔĖĘĚĞĢÌÍÎÏĪĬĮİŁĻĽŃŅŇÑÒÓÔÕÖŌŎŐØŔŖŘŚŞŠŢŤÙÚÛÜŨŪŬŮŰŲŴÝŸŶŹŻŽ',
            'aaaaaaaaacccddeeeeeeeeegģiiiiiiiilllnnnnoooooooooorrrsssttuuuuuuuuuuwyyyzzzAAAAAAAAACCCDDEEEEEEEEEGGIIIIIIIILLLNNNNOOOOOOOOORRRSSSTTUUUUUUUUUUWYYYZZZ'
          )
        ),
        '[^a-z0-9]+', '-', 'g'
      ),
      '-+', '-', 'g'
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.set_slug_from_name()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base text;
  candidate text;
  n int := 1;
  tbl text := TG_TABLE_NAME;
  exists_count int;
BEGIN
  IF NEW.slug IS NULL OR length(trim(NEW.slug)) = 0 THEN
    base := public.slugify(NEW.name);
  ELSE
    base := public.slugify(NEW.slug);
  END IF;

  IF base IS NULL OR base = '' THEN
    base := 'item';
  END IF;

  candidate := base;
  LOOP
    EXECUTE format(
      'SELECT count(*) FROM public.%I WHERE slug = $1 AND id <> COALESCE($2, ''00000000-0000-0000-0000-000000000000''::uuid)',
      tbl
    ) INTO exists_count USING candidate, NEW.id;
    EXIT WHEN exists_count = 0;
    n := n + 1;
    candidate := base || '-' || n;
  END LOOP;

  NEW.slug := candidate;
  RETURN NEW;
END;
$$;

-- 3. Scope avatars storage SELECT policy to owner's folder
DROP POLICY IF EXISTS "Avatars: authenticated can list/select" ON storage.objects;
CREATE POLICY "Avatars: users can read their own avatar"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- 4. Stop exposing discount `code` to all authenticated users.
-- Drop the broad authenticated SELECT policies and expose a safe view
-- with only the fields needed by the public catalog (no `code`).
DROP POLICY IF EXISTS "Public can view active general discounts" ON public.discounts;

CREATE OR REPLACE VIEW public.public_active_discounts
WITH (security_invoker = true) AS
SELECT
  id,
  value,
  type,
  schedule_type,
  start_time,
  end_time,
  day_of_week,
  is_active,
  valid_until,
  scope_type,
  scope_category,
  scope_subcategory
FROM public.discounts
WHERE is_referral_reward = false
  AND is_influencer_coupon = false
  AND is_active = true
  AND (valid_until IS NULL OR valid_until >= now())
  AND user_id IS NULL;

-- Re-add a minimal SELECT policy so the view (security_invoker) can read rows,
-- but only for the same rows it exposes. Code column is still readable through
-- this policy, BUT we revoke column-level SELECT on `code` from non-admins below
-- to mitigate harvesting.
CREATE POLICY "Public can view active general discounts (no code)"
ON public.discounts
FOR SELECT
TO authenticated
USING (
  is_referral_reward = false
  AND is_influencer_coupon = false
  AND is_active = true
  AND (valid_until IS NULL OR valid_until >= now())
  AND user_id IS NULL
);

-- Column-level lockdown: only admins/service_role get `code`.
REVOKE SELECT (code) ON public.discounts FROM authenticated, anon;

GRANT SELECT ON public.public_active_discounts TO authenticated, anon;

-- 5. Stop exposing referral_rewards.discount_code to all authenticated users.
-- The frontend only needs name/description/points_required/is_active.
-- The actual coupon is generated server-side on redeem via generate_unique_coupon_code.
REVOKE SELECT (discount_code) ON public.referral_rewards FROM authenticated, anon;
