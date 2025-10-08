-- Create policy for public read access to regime urbanistico data
CREATE POLICY "Public read access for regime urbanistico"
ON public.regime_urbanistico_consolidado
FOR SELECT
TO public
USING (true);

-- Create policy for admin management
CREATE POLICY "Admins can manage regime urbanistico"
ON public.regime_urbanistico_consolidado
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  )
);