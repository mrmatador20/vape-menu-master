CREATE TABLE IF NOT EXISTS public.order_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  message text,
  refusal_reason text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.order_logs TO authenticated;
GRANT ALL ON public.order_logs TO service_role;

ALTER TABLE public.order_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own order logs"
ON public.order_logs FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_logs.order_id AND o.user_id = auth.uid()));

CREATE POLICY "Admins view all order logs"
ON public.order_logs FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

CREATE INDEX IF NOT EXISTS idx_order_logs_order_id ON public.order_logs(order_id, created_at DESC);