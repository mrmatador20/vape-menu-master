-- Create review_responses table
CREATE TABLE public.review_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  review_id UUID NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE,
  admin_user_id UUID NOT NULL,
  response_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.review_responses ENABLE ROW LEVEL SECURITY;

-- Public can read responses
CREATE POLICY "Respostas são públicas para leitura"
ON public.review_responses
FOR SELECT
USING (true);

-- Admins can create responses
CREATE POLICY "Admins podem criar respostas"
ON public.review_responses
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update responses
CREATE POLICY "Admins podem atualizar respostas"
ON public.review_responses
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can delete responses
CREATE POLICY "Admins podem deletar respostas"
ON public.review_responses
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_review_responses_updated_at
BEFORE UPDATE ON public.review_responses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();