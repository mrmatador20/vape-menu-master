-- Remove the overly permissive public SELECT policy from reviews table
DROP POLICY IF EXISTS "Avaliações são públicas para leitura" ON public.reviews;

-- Create a policy that allows public access ONLY through specific use cases (not direct user_id exposure)
-- Users can only view their own reviews directly from the reviews table
CREATE POLICY "Users can view their own reviews" 
ON public.reviews 
FOR SELECT 
USING (auth.uid() = user_id);

-- The public_reviews view already exists and anonymizes user_id
-- Grant access to the view for public/anonymous access
GRANT SELECT ON public.public_reviews TO anon;
GRANT SELECT ON public.public_reviews TO authenticated;