
DROP POLICY "Anyone can submit a lead" ON public.leads;

CREATE POLICY "Anyone can submit a valid lead"
  ON public.leads
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    char_length(email) BETWEEN 5 AND 254
    AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    AND (notes IS NULL OR char_length(notes) <= 1000)
    AND source IN ('landing', 'observatorio', 'cta', 'footer')
  );
