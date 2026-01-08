import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Token pricing per 1K tokens (updated Jan 2025)
export const TOKEN_PRICING: Record<string, { input: number; output: number }> = {
  // OpenAI models
  'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
  'gpt-4o': { input: 0.005, output: 0.015 },
  'gpt-4': { input: 0.03, output: 0.06 },
  'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
  
  // Anthropic models
  'claude-sonnet-4-20250514': { input: 0.003, output: 0.015 },
  'claude-3-haiku': { input: 0.00025, output: 0.00125 },
  'claude-3-sonnet': { input: 0.003, output: 0.015 },
  
  // Google models
  'gemini-2.5-flash': { input: 0.000075, output: 0.0003 },
  'gemini-2.5-pro': { input: 0.00125, output: 0.005 },
  'gemini-pro': { input: 0.0005, output: 0.0015 },
  
  // Meta/Groq models
  'llama-3.1-70b-versatile': { input: 0.0008, output: 0.0008 },
  
  // DeepSeek
  'deepseek-chat': { input: 0.00014, output: 0.00028 },
};

export interface TokenUsageData {
  userId?: string;
  sessionId?: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  messagePreview?: string;
  source?: string; // e.g., 'chat', 'analyze-messages', 'security-validator'
}

export function calculateEstimatedCost(model: string, inputTokens: number, outputTokens: number): number {
  // Find pricing - try exact match first, then partial match
  let pricing = TOKEN_PRICING[model];
  
  if (!pricing) {
    // Try partial match
    const modelLower = model.toLowerCase();
    for (const [key, value] of Object.entries(TOKEN_PRICING)) {
      if (modelLower.includes(key.toLowerCase()) || key.toLowerCase().includes(modelLower)) {
        pricing = value;
        break;
      }
    }
  }
  
  // Default to gpt-4o-mini pricing if not found
  if (!pricing) {
    pricing = TOKEN_PRICING['gpt-4o-mini'];
  }
  
  return (inputTokens / 1000) * pricing.input + (outputTokens / 1000) * pricing.output;
}

export async function trackTokenUsage(data: TokenUsageData): Promise<void> {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseKey) {
      console.warn('[token-tracker] Supabase credentials not found, skipping tracking');
      return;
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const estimatedCost = calculateEstimatedCost(data.model, data.inputTokens, data.outputTokens);
    
    const insertData: Record<string, unknown> = {
      model: data.model,
      input_tokens: data.inputTokens,
      output_tokens: data.outputTokens,
      total_tokens: data.totalTokens,
      estimated_cost: estimatedCost,
      message_content_preview: data.messagePreview 
        ? `${data.source || 'edge-function'}: ${data.messagePreview.substring(0, 100)}`
        : data.source || 'edge-function',
    };
    
    // Add user_id if provided, otherwise use a system user placeholder
    if (data.userId) {
      insertData.user_id = data.userId;
    } else {
      // Use a fixed UUID for system operations
      insertData.user_id = '00000000-0000-0000-0000-000000000000';
    }
    
    // Add session_id only if provided and valid
    if (data.sessionId && data.sessionId !== 'no-thread') {
      insertData.session_id = data.sessionId;
    }
    
    const { error } = await supabase
      .from('token_usage')
      .insert(insertData);
    
    if (error) {
      console.error('[token-tracker] Failed to track token usage:', error);
    } else {
      console.log(`[token-tracker] Tracked ${data.totalTokens} tokens for ${data.model} ($${estimatedCost.toFixed(6)})`);
    }
  } catch (err) {
    console.error('[token-tracker] Error tracking tokens:', err);
  }
}

// Helper to log to llm_metrics table (more detailed)
export async function logLLMMetrics(data: {
  modelName: string;
  provider?: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  cost?: number;
  executionTimeMs?: number;
  success?: boolean;
  errorMessage?: string;
  requestType?: string;
  sessionId?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseKey) {
      return;
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const cost = data.cost ?? calculateEstimatedCost(
      data.modelName, 
      data.promptTokens || 0, 
      data.completionTokens || 0
    );
    
    const { error } = await supabase
      .from('llm_metrics')
      .insert({
        model_name: data.modelName,
        provider: data.provider || 'openai',
        prompt_tokens: data.promptTokens,
        completion_tokens: data.completionTokens,
        total_tokens: data.totalTokens,
        cost: cost,
        execution_time_ms: data.executionTimeMs,
        success: data.success ?? true,
        error_message: data.errorMessage,
        request_type: data.requestType,
        session_id: data.sessionId,
        user_id: data.userId,
        metadata: data.metadata,
      });
    
    if (error) {
      console.error('[llm-metrics] Failed to log metrics:', error);
    }
  } catch (err) {
    console.error('[llm-metrics] Error logging metrics:', err);
  }
}
