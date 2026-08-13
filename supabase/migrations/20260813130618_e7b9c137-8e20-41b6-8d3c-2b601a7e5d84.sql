CREATE TABLE public.payment_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  max_interest_free_installments integer NOT NULL DEFAULT 2,
  max_total_installments integer NOT NULL DEFAULT 12,
  monthly_interest_rate numeric(5,2) NOT NULL DEFAULT 2.99,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_interest_free CHECK (max_interest_free_installments >= 1 AND max_interest_free_installments <= 12),
  CONSTRAINT chk_max_total CHECK (max_total_installments >= 1 AND max_total_installments <= 12),
  CONSTRAINT chk_rate CHECK (monthly_interest_rate >= 0 AND monthly_interest_rate <= 15),
  CONSTRAINT chk_free_lte_total CHECK (max_interest_free_installments <= max_total_installments)
);

GRANT SELECT ON public.payment_settings TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.payment_settings TO authenticated;
GRANT ALL ON public.payment_settings TO service_role;

ALTER TABLE public.payment_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Payment settings are publicly readable"
  ON public.payment_settings FOR SELECT
  USING (true);

CREATE POLICY "Only super admins can insert payment settings"
  ON public.payment_settings FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Only super admins can update payment settings"
  ON public.payment_settings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Only super admins can delete payment settings"
  ON public.payment_settings FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE TRIGGER update_payment_settings_updated_at
  BEFORE UPDATE ON public.payment_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.payment_settings (max_interest_free_installments, max_total_installments, monthly_interest_rate)
VALUES (2, 12, 2.99);