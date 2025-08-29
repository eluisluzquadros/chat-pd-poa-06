import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getCurrentAuthenticatedSession } from '@/utils/authUtils';

interface TokenUsage {
  model: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  estimated_cost: number;
  message_content_preview: string;
  session_id?: string;
}

// Token pricing per 1K tokens (updated for multi-LLM support)
const TOKEN_PRICING = {
  // OpenAI models
  'openai': { input: 0.0015, output: 0.002 },
  'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
  'gpt-4o': { input: 0.005, output: 0.015 },
  
  // Anthropic models
  'claude': { input: 0.003, output: 0.015 },
  'claude-sonnet-4-20250514': { input: 0.003, output: 0.015 },
  'claude-3-haiku': { input: 0.00025, output: 0.00125 },
  'claude-3-sonnet': { input: 0.003, output: 0.015 },
  
  // Google models
  'gemini': { input: 0.0005, output: 0.0015 },
  'gemini-pro': { input: 0.0005, output: 0.0015 },
  'gemini-1.5-flash': { input: 0.000075, output: 0.0003 },
  'gemini-1.5-pro': { input: 0.00125, output: 0.005 },
  
  // Meta models (via Groq/Replicate)
  'llama': { input: 0.0008, output: 0.0008 },
  'llama-3.1-70b-versatile': { input: 0.0008, output: 0.0008 },
  'llama-3-70b-instruct': { input: 0.0008, output: 0.0008 },
  
  // DeepSeek
  'deepseek': { input: 0.00014, output: 0.00028 },
  'deepseek-chat': { input: 0.00014, output: 0.00028 },
  
  // Groq
  'groq': { input: 0.0008, output: 0.0008 },
} as const;

export function useTokenTracking() {
  const trackTokenUsage = useCallback(async (tokenData: TokenUsage) => {
    try {
      const session = await getCurrentAuthenticatedSession();
      if (!session?.user) {
        console.warn('Cannot track tokens: User not authenticated');
        return;
      }

      const pricing = TOKEN_PRICING[tokenData.model as keyof typeof TOKEN_PRICING];
      const estimatedCost = pricing 
        ? (tokenData.input_tokens / 1000) * pricing.input + (tokenData.output_tokens / 1000) * pricing.output
        : 0;

      const { error } = await supabase
        .from('token_usage')
        .insert({
          user_id: session.user.id,
          session_id: tokenData.session_id,
          model: tokenData.model,
          input_tokens: tokenData.input_tokens,
          output_tokens: tokenData.output_tokens,
          total_tokens: tokenData.total_tokens,
          estimated_cost: estimatedCost,
          message_content_preview: tokenData.message_content_preview
        });

      if (error) {
        console.error('Error tracking token usage:', error);
      }
    } catch (error) {
      console.error('Error in trackTokenUsage:', error);
    }
  }, []);

  const getTokenUsageStats = useCallback(async () => {
    try {
      const session = await getCurrentAuthenticatedSession();
      if (!session?.user) return null;

      const { data, error } = await supabase
        .from('token_usage_summary')
        .select('*')
        .eq('user_id', session.user.id)
        .order('usage_date', { ascending: false });

      if (error) {
        console.error('Error fetching token usage stats:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getTokenUsageStats:', error);
      return null;
    }
  }, []);

  const estimateTokens = useCallback((text: string): number => {
    // Rough estimation: ~4 characters per token for most models
    return Math.ceil(text.length / 4);
  }, []);

  return {
    trackTokenUsage,
    getTokenUsageStats,
    estimateTokens,
    TOKEN_PRICING
  };
}