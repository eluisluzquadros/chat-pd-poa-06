-- Fix for llm_model_configs security vulnerability - Corrected approach
-- Remove the public read access policy and implement proper access controls

-- First, drop the existing public access policy
DROP POLICY IF EXISTS "Anyone can view model configs" ON public.llm_model_configs;

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
  -- Only expose safe capability information, excluding sensitive data
  CASE 
    WHEN capabilities ? 'supports_function_calling' THEN 
      jsonb_build_object('supports_function_calling', capabilities->'supports_function_calling')
    ELSE '{}'::jsonb
  END as public_capabilities
FROM public.llm_model_configs
WHERE is_active = true;

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

-- Grant select permission on the view to authenticated users
GRANT SELECT ON public.llm_models_public TO authenticated;

-- Add comments for documentation
COMMENT ON VIEW public.llm_models_public IS 'Public view of LLM model configurations without sensitive pricing/cost information. Excludes cost_per_input_token, cost_per_output_token, and detailed capabilities.';
COMMENT ON POLICY "Only admins can view full model configs" ON public.llm_model_configs IS 'Restricts access to sensitive pricing and cost data to administrators only. This prevents exposure of business-critical information.';