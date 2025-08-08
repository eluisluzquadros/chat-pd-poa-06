-- Add GPT-5 to llm_model_configs if not exists
INSERT INTO public.llm_model_configs (provider, model, cost_per_input_token, cost_per_output_token, max_tokens, average_latency, capabilities, is_active)
SELECT 'openai', 'gpt-5', 0.01/1000.0, 0.03/1000.0, 4096, 4000, '{"synthesis": true, "reasoning": true, "vision": false}'::jsonb, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.llm_model_configs WHERE provider = 'openai' AND model = 'gpt-5'
);

-- Optional: ensure indexes useful for lookups
CREATE INDEX IF NOT EXISTS idx_llm_model_configs_provider_model ON public.llm_model_configs(provider, model);
