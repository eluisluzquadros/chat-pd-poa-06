import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';

interface BenchmarkRequest {
  models?: string[];
  mode?: 'all' | 'filtered' | 'random';
  categories?: string[];
  difficulties?: string[];
  randomCount?: number;
  includeSQL?: boolean;
  excludeSQL?: boolean;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: BenchmarkRequest = await req.json();
    const { 
      models = ['gpt-3.5-turbo'],
      mode = 'all',
      categories,
      difficulties,
      randomCount,
      includeSQL = true,
      excludeSQL = false
    } = body;

    console.log(`[qa-benchmark-unified] Starting benchmark with ${models.length} models, mode: ${mode}`);

    // For benchmarking, we'll use the validation function with multiple models
    const validationBody = {
      models,
      mode,
      categories,
      difficulties,
      randomCount,
      includeSQL,
      excludeSQL
    };

    // Call the validation function which already handles multiple models
    const validationResponse = await fetch(`${supabaseUrl}/functions/v1/qa-execute-validation-v2`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(validationBody)
    });

    if (!validationResponse.ok) {
      const errorText = await validationResponse.text();
      console.error('[qa-benchmark-unified] Validation function error:', errorText);
      throw new Error(`Validation function failed: ${errorText}`);
    }

    const validationData = await validationResponse.json();

    // Process results for benchmark format
    const results = validationData.results || [];
    const summaries = [];
    const successfulModels = [];
    const failedModels = [];

    for (const result of results) {
      if (result.success) {
        successfulModels.push(result.model);
        
        // Fetch run data for summary
        const { data: runData } = await supabase
          .from('qa_validation_runs')
          .select('*')
          .eq('id', result.runId)
          .single();

        if (runData) {
          summaries.push({
            model: result.model,
            provider: getProviderFromModel(result.model),
            avgQualityScore: Math.round((runData.overall_accuracy || 0) * 100),
            avgResponseTime: Math.round(runData.avg_response_time_ms || 0),
            avgCostPerQuery: 0.001, // Placeholder - would need real cost calculation
            successRate: Math.round(((runData.passed_tests || 0) / (runData.total_tests || 1)) * 100),
            totalTests: runData.total_tests || 0,
            recommendation: generateRecommendation(runData)
          });
        }
      } else {
        failedModels.push(result.model);
      }
    }

    // Save benchmark results
    if (summaries.length > 0) {
      const { data: benchmarkData, error: benchmarkError } = await supabase
        .from('qa_benchmarks')
        .insert({
          timestamp: new Date().toISOString(),
          summaries,
          metadata: {
            mode,
            categories,
            difficulties,
            randomCount,
            includeSQL,
            excludeSQL,
            totalModels: models.length,
            successfulModels: successfulModels.length,
            failedModels: failedModels.length
          }
        })
        .select()
        .single();

      if (benchmarkError) {
        console.error('[qa-benchmark-unified] Error saving benchmark:', benchmarkError);
      } else {
        console.log('[qa-benchmark-unified] Benchmark saved with ID:', benchmarkData?.id);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        summary: {
          totalModels: models.length,
          successfulModels: successfulModels.length,
          failedModels: failedModels.length,
          models: successfulModels,
          failed: failedModels
        },
        results,
        summaries
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('[qa-benchmark-unified] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        success: false 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});

function getProviderFromModel(model: string): string {
  if (model.includes('gpt')) return 'openai';
  if (model.includes('claude')) return 'anthropic';
  if (model.includes('gemini')) return 'google';
  if (model.includes('deepseek')) return 'deepseek';
  if (model.includes('mixtral') || model.includes('llama')) return 'groq';
  if (model.includes('glm')) return 'zhipuai';
  return 'unknown';
}

function generateRecommendation(runData: any): string {
  const accuracy = runData.overall_accuracy || 0;
  const responseTime = runData.avg_response_time_ms || 0;
  
  if (accuracy >= 0.9) {
    return 'Excelente para tarefas complexas';
  } else if (responseTime <= 2000) {
    return 'Ótimo para respostas rápidas';
  } else if (accuracy >= 0.7 && responseTime <= 5000) {
    return 'Balanceado para uso geral';
  } else {
    return 'Adequado para tarefas simples';
  }
}