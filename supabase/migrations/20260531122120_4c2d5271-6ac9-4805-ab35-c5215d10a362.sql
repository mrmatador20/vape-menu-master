
CREATE TABLE public.legal_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_type TEXT NOT NULL CHECK (doc_type IN ('privacy_policy','terms_of_use')),
  version TEXT NOT NULL,
  content TEXT NOT NULL,
  change_summary TEXT,
  is_current BOOLEAN NOT NULL DEFAULT false,
  published_by UUID NOT NULL,
  published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (doc_type, version)
);

CREATE INDEX idx_legal_docs_type_current ON public.legal_documents(doc_type) WHERE is_current = true;
CREATE INDEX idx_legal_docs_type_published ON public.legal_documents(doc_type, published_at DESC);

GRANT SELECT ON public.legal_documents TO anon, authenticated;
GRANT INSERT, UPDATE ON public.legal_documents TO authenticated;
GRANT ALL ON public.legal_documents TO service_role;

ALTER TABLE public.legal_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view legal documents"
ON public.legal_documents FOR SELECT USING (true);

CREATE POLICY "Admins can insert legal documents"
ON public.legal_documents FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND published_by = auth.uid());

CREATE POLICY "Admins can update is_current only"
ON public.legal_documents FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.prevent_legal_doc_tampering()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Versões de documentos legais não podem ser excluídas';
  END IF;
  IF TG_OP = 'UPDATE' THEN
    IF OLD.id <> NEW.id OR OLD.doc_type <> NEW.doc_type OR OLD.version <> NEW.version
       OR OLD.content <> NEW.content OR OLD.published_by <> NEW.published_by
       OR OLD.published_at <> NEW.published_at OR OLD.created_at <> NEW.created_at
       OR COALESCE(OLD.change_summary,'') <> COALESCE(NEW.change_summary,'') THEN
      RAISE EXCEPTION 'Conteúdo de documentos legais é imutável. Apenas is_current pode ser alterado.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_prevent_legal_doc_tampering
BEFORE UPDATE OR DELETE ON public.legal_documents
FOR EACH ROW EXECUTE FUNCTION public.prevent_legal_doc_tampering();

CREATE OR REPLACE FUNCTION public.publish_legal_document(
  p_doc_type TEXT, p_version TEXT, p_content TEXT, p_change_summary TEXT DEFAULT NULL
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_uid UUID := auth.uid(); v_id UUID;
BEGIN
  IF v_uid IS NULL OR NOT public.has_role(v_uid, 'admin'::app_role) THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem publicar documentos legais';
  END IF;
  IF p_doc_type NOT IN ('privacy_policy','terms_of_use') THEN
    RAISE EXCEPTION 'Tipo de documento inválido';
  END IF;
  IF p_content IS NULL OR length(trim(p_content)) < 50 THEN
    RAISE EXCEPTION 'Conteúdo do documento muito curto';
  END IF;
  IF p_version IS NULL OR length(trim(p_version)) = 0 THEN
    RAISE EXCEPTION 'Versão é obrigatória';
  END IF;

  UPDATE public.legal_documents SET is_current = false
   WHERE doc_type = p_doc_type AND is_current = true;

  INSERT INTO public.legal_documents (doc_type, version, content, change_summary, is_current, published_by)
  VALUES (p_doc_type, trim(p_version), p_content, p_change_summary, true, v_uid)
  RETURNING id INTO v_id;

  INSERT INTO public.user_activity_logs (user_id, activity_type, severity, resource_type, resource_id, metadata)
  VALUES (v_uid, 'admin_settings_changed', 'warning', 'legal_document', v_id,
          jsonb_build_object('action','publish','doc_type',p_doc_type,'version',p_version,'summary',p_change_summary));
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.rollback_legal_document(p_version_id UUID, p_new_version TEXT)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_uid UUID := auth.uid(); v_old RECORD; v_id UUID;
BEGIN
  IF v_uid IS NULL OR NOT public.has_role(v_uid, 'admin'::app_role) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;
  SELECT * INTO v_old FROM public.legal_documents WHERE id = p_version_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Versão não encontrada'; END IF;

  UPDATE public.legal_documents SET is_current = false
   WHERE doc_type = v_old.doc_type AND is_current = true;

  INSERT INTO public.legal_documents (doc_type, version, content, change_summary, is_current, published_by)
  VALUES (v_old.doc_type, trim(p_new_version), v_old.content,
          'Rollback para versão ' || v_old.version, true, v_uid)
  RETURNING id INTO v_id;

  INSERT INTO public.user_activity_logs (user_id, activity_type, severity, resource_type, resource_id, metadata)
  VALUES (v_uid, 'admin_settings_changed', 'warning', 'legal_document', v_id,
          jsonb_build_object('action','rollback','doc_type',v_old.doc_type,'rolled_back_from',v_old.version,'new_version',p_new_version));
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.user_needs_legal_reaccept()
RETURNS TABLE(doc_type TEXT, current_version TEXT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT ld.doc_type, ld.version
  FROM public.legal_documents ld
  WHERE ld.is_current = true
    AND auth.uid() IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.user_consents uc
      WHERE uc.user_id = auth.uid()
        AND uc.consent_type = ld.doc_type
        AND uc.granted = true
        AND uc.consent_version = ld.version
        AND uc.revoked_at IS NULL
    );
$$;
