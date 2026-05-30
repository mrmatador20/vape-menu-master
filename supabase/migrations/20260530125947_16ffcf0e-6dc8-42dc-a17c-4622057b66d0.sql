-- ============================================================
-- LGPD COMPLIANCE INFRASTRUCTURE
-- ============================================================

-- 1) USER CONSENTS (immutable audit trail)
CREATE TABLE public.user_consents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  anonymous_id TEXT,
  consent_type TEXT NOT NULL,
  consent_version TEXT NOT NULL DEFAULT '1.0',
  granted BOOLEAN NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB,
  granted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  revoked_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT user_consents_subject_check CHECK (user_id IS NOT NULL OR anonymous_id IS NOT NULL),
  CONSTRAINT user_consents_type_check CHECK (consent_type IN (
    'cookies_essential','cookies_analytics','cookies_marketing',
    'terms_of_use','privacy_policy','marketing_communications','age_verification'
  ))
);

GRANT SELECT, INSERT ON public.user_consents TO anon;
GRANT SELECT, INSERT ON public.user_consents TO authenticated;
GRANT ALL ON public.user_consents TO service_role;

ALTER TABLE public.user_consents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own consents"
  ON public.user_consents FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins view all consents"
  ON public.user_consents FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated can insert own consents"
  ON public.user_consents FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Anonymous can insert anonymous consents"
  ON public.user_consents FOR INSERT TO anon
  WITH CHECK (user_id IS NULL AND anonymous_id IS NOT NULL);

CREATE POLICY "Service role manages consents"
  ON public.user_consents FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE INDEX idx_user_consents_user ON public.user_consents(user_id, consent_type);
CREATE INDEX idx_user_consents_anon ON public.user_consents(anonymous_id) WHERE anonymous_id IS NOT NULL;

-- Immutability trigger (reuses existing prevent_audit_log_modification semantics)
CREATE OR REPLACE FUNCTION public.prevent_consent_modification()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    -- Only allow setting revoked_at (one-way state change)
    IF OLD.id <> NEW.id
       OR OLD.user_id IS DISTINCT FROM NEW.user_id
       OR OLD.consent_type <> NEW.consent_type
       OR OLD.granted <> NEW.granted
       OR OLD.granted_at <> NEW.granted_at THEN
      RAISE EXCEPTION 'Consent records are immutable except for revocation';
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Consent records cannot be deleted (LGPD audit requirement)';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER user_consents_immutable
BEFORE UPDATE OR DELETE ON public.user_consents
FOR EACH ROW EXECUTE FUNCTION public.prevent_consent_modification();

-- 2) DATA SUBJECT REQUESTS (Art. 18 LGPD)
CREATE TABLE public.data_subject_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  request_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  legal_deadline TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '15 days'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE,
  processed_by UUID,
  CONSTRAINT dsr_type_check CHECK (request_type IN ('access','correction','deletion','export','portability','revoke_consent','complaint')),
  CONSTRAINT dsr_status_check CHECK (status IN ('pending','in_progress','completed','rejected'))
);

GRANT SELECT, INSERT ON public.data_subject_requests TO authenticated;
GRANT ALL ON public.data_subject_requests TO service_role;

ALTER TABLE public.data_subject_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own DSR"
  ON public.data_subject_requests FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users create own DSR"
  ON public.data_subject_requests FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins update DSR"
  ON public.data_subject_requests FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_dsr_user ON public.data_subject_requests(user_id, created_at DESC);
CREATE INDEX idx_dsr_pending ON public.data_subject_requests(status, legal_deadline) WHERE status IN ('pending','in_progress');

-- 3) EXPORT USER DATA (Art. 18 II/V — access + portability)
CREATE OR REPLACE FUNCTION public.export_user_data()
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_result JSONB;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  SELECT jsonb_build_object(
    'export_metadata', jsonb_build_object(
      'generated_at', now(),
      'user_id', v_uid,
      'legal_basis', 'LGPD Art. 18, incisos II e V',
      'format_version', '1.0'
    ),
    'account', (SELECT jsonb_build_object('email', email, 'created_at', created_at, 'last_sign_in_at', last_sign_in_at) FROM auth.users WHERE id = v_uid),
    'profile', (SELECT to_jsonb(p) FROM public.profiles p WHERE id = v_uid),
    'saved_addresses', COALESCE((SELECT jsonb_agg(to_jsonb(s)) FROM public.saved_addresses s WHERE user_id = v_uid), '[]'::jsonb),
    'orders', COALESCE((SELECT jsonb_agg(to_jsonb(o)) FROM public.orders o WHERE user_id = v_uid), '[]'::jsonb),
    'order_items', COALESCE((SELECT jsonb_agg(to_jsonb(oi)) FROM public.order_items oi JOIN public.orders o ON o.id = oi.order_id WHERE o.user_id = v_uid), '[]'::jsonb),
    'reviews', COALESCE((SELECT jsonb_agg(to_jsonb(r)) FROM public.reviews r WHERE user_id = v_uid), '[]'::jsonb),
    'referral_points', (SELECT to_jsonb(rp) FROM public.referral_points rp WHERE user_id = v_uid),
    'referral_transactions', COALESCE((SELECT jsonb_agg(to_jsonb(rt)) FROM public.referral_transactions rt WHERE user_id = v_uid), '[]'::jsonb),
    'trusted_devices', COALESCE((SELECT jsonb_agg(jsonb_build_object('device_name', device_name, 'last_used_at', last_used_at, 'created_at', created_at)) FROM public.trusted_devices WHERE user_id = v_uid), '[]'::jsonb),
    'notification_preferences', (SELECT to_jsonb(np) FROM public.notification_preferences np WHERE user_id = v_uid),
    'consents', COALESCE((SELECT jsonb_agg(to_jsonb(c)) FROM public.user_consents c WHERE user_id = v_uid), '[]'::jsonb),
    'data_subject_requests', COALESCE((SELECT jsonb_agg(to_jsonb(d)) FROM public.data_subject_requests d WHERE user_id = v_uid), '[]'::jsonb)
  ) INTO v_result;

  -- audit log
  INSERT INTO public.user_activity_logs (user_id, activity_type, severity, metadata)
  VALUES (v_uid, 'data_export', 'info', jsonb_build_object('legal_basis','LGPD Art. 18'));

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.export_user_data() TO authenticated;

-- 4) REQUEST ACCOUNT DELETION (Art. 18 VI)
CREATE OR REPLACE FUNCTION public.request_account_deletion(p_reason TEXT DEFAULT NULL)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_id UUID;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  -- Prevent duplicate pending deletion requests
  IF EXISTS (SELECT 1 FROM public.data_subject_requests WHERE user_id = v_uid AND request_type = 'deletion' AND status IN ('pending','in_progress')) THEN
    RAISE EXCEPTION 'Já existe uma solicitação de exclusão em andamento';
  END IF;

  INSERT INTO public.data_subject_requests (user_id, request_type, status, notes)
  VALUES (v_uid, 'deletion', 'pending', p_reason)
  RETURNING id INTO v_id;

  INSERT INTO public.user_activity_logs (user_id, activity_type, severity, metadata)
  VALUES (v_uid, 'account_deletion_requested', 'warning', jsonb_build_object('request_id', v_id));

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.request_account_deletion(TEXT) TO authenticated;