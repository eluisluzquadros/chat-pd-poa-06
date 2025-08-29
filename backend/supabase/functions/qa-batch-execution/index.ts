import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BatchExecutionRequest {
  models: string[];
  options: {
    mode: 'all' | 'random' | 'selected' | 'filtered';
    selectedIds?: string[];
    categories?: string[];
    difficulties?: string[];
    randomCount?: number;
    includeSQL?: boolean;
    excludeSQL?: boolean;
  };
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

    const { models, options }: BatchExecutionRequest = await req.json();

    console.log(`Starting batch execution for ${models.length} models`);

    // Execute validations in controlled sequence to avoid overload
    const results = [];
    
    for (const model of models) {
      console.log(`Executing validation for model: ${model}`);
      
      try {
        // Call the qa-execute-validation-v2 function for each model using Supabase client
        const { data: result, error: validationError } = await supabase.functions.invoke('qa-execute-validation-v2', {
          body: {
            models: [model], // Single model for this execution
            mode: options.mode,
            selectedIds: options.selectedIds,
            categories: options.categories,
            difficulties: options.difficulties,
            randomCount: options.randomCount,
            includeSQL: options.includeSQL,
            excludeSQL: options.excludeSQL
          }
        });

        if (validationError) {
          throw new Error(`Validation failed for ${model}: ${validationError.message}`);
        }

        results.push({
          model,
          success: true,
          ...result
        });

        // Small delay between executions to avoid overload
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`Error executing validation for ${model}:`, error);
        results.push({
          model,
          success: false,
          error: error.message
        });
      }
    }

    // Aggregate results
    const successfulResults = results.filter(r => r.success);
    const failedResults = results.filter(r => !r.success);

    const summary = {
      totalModels: models.length,
      successfulModels: successfulResults.length,
      failedModels: failedResults.length,
      avgAccuracy: successfulResults.length > 0 
        ? successfulResults.reduce((sum, r) => sum + (r.summary?.avgAccuracy || 0), 0) / successfulResults.length
        : 0,
      totalTestsRun: successfulResults.reduce((sum, r) => sum + (r.summary?.totalTestsRun || 0), 0),
      totalPassed: successfulResults.reduce((sum, r) => sum + (r.summary?.totalPassed || 0), 0)
    };

    return new Response(
      JSON.stringify({
        success: true,
        summary,
        results,
        executionTime: Date.now()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Error in qa-batch-execution:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});