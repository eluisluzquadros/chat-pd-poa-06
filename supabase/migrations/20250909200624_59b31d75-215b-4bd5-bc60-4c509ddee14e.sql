-- Fix for llm_model_configs security vulnerability
-- Remove the public read access policy and implement proper access controls

-- First, drop the existing public access policy
DROP POLICY IF EXISTS "Anyone can view model configs" ON public.llm_model_configs;

-- Create a restricted policy for authenticated users to access only non-sensitive information
CREATE POLICY "Authenticated users can view basic model info" 
ON public.llm_model_configs 
FOR SELECT 
TO authenticated
USING (true);

-- However, we need to create a view that exposes only non-sensitive data
-- Create a view for public model information (without pricing/cost data)
CREATE OR REPLACE VIEW public.llm_models_public AS
SELECT 
  id,
  provider,
  model,
  max_tokens,
  is_active,
  average_latency,
  created_at,
  updated_at,
  -- Only expose safe capability information
  CASE 
    WHEN capabilities ? 'supports_function_calling' THEN 
      jsonb_build_object('supports_function_calling', capabilities->'supports_function_calling')
    ELSE '{}'::jsonb
  END as public_capabilities
FROM public.llm_model_configs
WHERE is_active = true;

-- Enable RLS on the view (though it inherits from the table)
-- Add policy for the view that allows authenticated users to read
CREATE POLICY "Authenticated users can view public model info" 
ON public.llm_models_public 
FOR SELECT 
TO authenticated
USING (true);

-- Update the main table policy to be more restrictive
-- Remove the overly permissive authenticated user policy and replace with admin-only
DROP POLICY IF EXISTS "Authenticated users can view basic model info" ON public.llm_model_configs;

-- Only admins can view the full sensitive model configs
CREATE POLICY "Only admins can view full model configs" 
ON public.llm_model_configs 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Ensure the admin management policy remains
-- The existing "Admins can manage model configs" policy should remain as is

-- Add a comment for documentation
COMMENT ON VIEW public.llm_models_public IS 'Public view of LLM model configurations without sensitive pricing/cost information';
COMMENT ON POLICY "Only admins can view full model configs" ON public.llm_model_configs IS 'Restricts access to sensitive pricing and cost data to administrators only';