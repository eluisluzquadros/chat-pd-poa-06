-- Fix RLS for platform_settings table to allow authenticated users to read system configurations
CREATE POLICY "Allow authenticated users to read platform settings" 
ON public.platform_settings 
FOR SELECT 
TO authenticated
USING (true);