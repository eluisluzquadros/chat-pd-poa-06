import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Available models configuration - synchronized with llm-models-2025.ts
const AVAILABLE_MODELS = [
  // ANTHROPIC CLAUDE MODELS
  { model: 'claude-opus-4-1-20250805', provider: 'anthropic' },
  { model: 'claude-opus-4-20250122', provider: 'anthropic' },
  { model: 'claude-sonnet-4-20250122', provider: 'anthropic' },
  { model: 'claude-sonnet-3-7-20250122', provider: 'anthropic' },
  { model: 'claude-3-5-sonnet-20241022', provider: 'anthropic' },
  { model: 'claude-3-haiku-20240307', provider: 'anthropic' },
  
  // OPENAI GPT MODELS
  { model: 'gpt-4.1', provider: 'openai' },
  { model: 'gpt-4-turbo-2024-04-09', provider: 'openai' },
  { model: 'gpt-4-0125-preview', provider: 'openai' },
  { model: 'gpt-4o-2024-11-20', provider: 'openai' },
  { model: 'gpt-4o-mini-2024-07-18', provider: 'openai' },
  { model: 'gpt-5', provider: 'openai' },
  { model: 'gpt-3.5-turbo-0125', provider: 'openai' },
  
  // GOOGLE GEMINI MODELS
  { model: 'gemini-2.0-flash-exp', provider: 'google' },
  { model: 'gemini-1.5-pro-002', provider: 'google' },
  { model: 'gemini-1.5-flash-002', provider: 'google' },
  
  // DEEPSEEK MODELS
  { model: 'deepseek-chat', provider: 'deepseek' },
  { model: 'deepseek-coder', provider: 'deepseek' },
  
  // ZHIPUAI GLM MODELS  
  { model: 'glm-4-plus', provider: 'zhipuai' },
  { model: 'glm-4-flash', provider: 'zhipuai' },
  { model: 'glm-4', provider: 'zhipuai' }
];

interface TestCase {
  id: string;
  query: string;
  expected_keywords: string[];
  category: string;
  complexity: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting benchmark execution...');
    
    const requestBody = await req.json();
    const { 
      models: selectedModels = [],
      mode = 'all',
      categories,
      difficulties,
      randomCount,
      includeSQL = true,
      excludeSQL = false
    } = requestBody;
    
    console.log('Selected models for testing:', selectedModels);
    console.log('Execution options:', { mode, categories, difficulties, randomCount, includeSQL, excludeSQL });
    
    // Fetch active test cases
    const { data: testCases, error: testCasesError } = await supabase
      .from('qa_test_cases')
      .select('id, query, expected_keywords, category, complexity')
      .eq('is_active', true)
      .limit(5); // Reduced limit for faster execution

    if (testCasesError) {
      console.error('Error fetching test cases:', testCasesError);
      throw testCasesError;
    }

    if (!testCases || testCases.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No active test cases found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${testCases.length} test cases`);

    const results: any[] = [];
    const summaries: any[] = [];

    // Filter models based on selection - only test models that are actually selected
    const modelsToTest = selectedModels
      .map(selectedModel => AVAILABLE_MODELS.find(m => m.model === selectedModel))
      .filter(Boolean) as Array<{ model: string; provider: string }>;
    
    console.log('Selected models:', selectedModels);
    console.log('Models to test:', modelsToTest.map(m => m.model));
    
    if (modelsToTest.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No valid models selected for testing' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`Testing ${modelsToTest.length} models:`, modelsToTest.map(m => m.model));

    // Execute real validations using the qa-execute-validation-v2 function
    console.log('Executing real validations using qa-execute-validation-v2...');
    
    const validationResults = [];
    
    for (const modelConfig of modelsToTest) {
      console.log(`Testing model: ${modelConfig.model} (${modelConfig.provider})`);
      
      try {
        // Call the qa-execute-validation-v2 function for real validation
        const { data: validationData, error: validationError } = await supabase.functions.invoke('qa-execute-validation-v2', {
          body: {
            models: [modelConfig.model], // Single model per execution
            mode,
            categories,
            difficulties,
            randomCount,
            includeSQL,
            excludeSQL
          }
        });

        if (validationError) {
          console.error(`Validation error for ${modelConfig.model}:`, validationError);
          throw validationError;
        }

        if (validationData?.runs && validationData.runs.length > 0) {
          const run = validationData.runs[0];
          
          const summary = {
            provider: modelConfig.provider,
            model: modelConfig.model,
            totalTests: run.totalTests,
            passedTests: run.passedTests,
            avgResponseTime: Math.round(run.avgResponseTime),
            avgQualityScore: Math.round(run.overallAccuracy * 100),
            successRate: Math.round((run.passedTests / run.totalTests) * 100),
            avgCostPerQuery: 0.001, // Placeholder cost calculation
            recommendation: run.overallAccuracy >= 0.9 ? 'Excelente para tarefas complexas' :
                           run.avgResponseTime <= 2000 ? 'Ótimo para respostas rápidas' :
                           'Balanceado para uso geral'
          };

          summaries.push(summary);
          
          // Transform results to match expected format
          const transformedResults = run.results.map(result => ({
            testCaseId: result.testCaseId,
            query: result.question,
            expectedKeywords: [], // Not available in validation results
            actualResponse: result.actualAnswer,
            responseTime: result.responseTime,
            isCorrect: result.success,
            qualityScore: result.accuracy * 100,
            error: result.error || null
          }));

          results.push({
            model: modelConfig.model,
            provider: modelConfig.provider,
            results: transformedResults
          });

          validationResults.push(run);
        } else {
          console.error(`No validation results for ${modelConfig.model}`);
          throw new Error(`No validation results returned for ${modelConfig.model}`);
        }

      } catch (error) {
        console.error(`Error testing model ${modelConfig.model}:`, error);
        
        // Add failed model to summaries with zero scores
        summaries.push({
          provider: modelConfig.provider,
          model: modelConfig.model,
          totalTests: testCases.length,
          passedTests: 0,
          avgResponseTime: 0,
          avgQualityScore: 0,
          successRate: 0,
          avgCostPerQuery: 0,
          recommendation: 'Falha na execução'
        });

        results.push({
          model: modelConfig.model,
          provider: modelConfig.provider,
          results: []
        });
      }
    }

    // Save benchmark results to database
    console.log('Saving benchmark results to database...');
    
    const { data: benchmarkData, error: saveError } = await supabase
      .from('qa_benchmarks')
      .insert({
        results,
        summaries,
        metadata: {
          totalModels: modelsToTest.length,
          totalTestCases: testCases.length,
          executionTime: Date.now(),
          version: '1.0',
          selectedModels: selectedModels
        }
      })
      .select()
      .single();

    if (saveError) {
      console.error('Error saving benchmark:', saveError);
      throw saveError;
    }

    // Also save individual analysis records for easier querying
    const analysisRecords = summaries.map(summary => ({
      model: summary.model,
      provider: summary.provider,
      avg_quality_score: summary.avgQualityScore / 100, // Convert to 0-1 scale
      avg_response_time: summary.avgResponseTime,
      avg_cost_per_query: summary.avgCostPerQuery,
      success_rate: summary.successRate / 100, // Convert to 0-1 scale
      recommendation: summary.recommendation,
      total_cost: summary.avgCostPerQuery * summary.totalTests,
      timestamp: new Date().toISOString()
    }));

    const { error: analysisError } = await supabase
      .from('benchmark_analysis')
      .insert(analysisRecords);

    if (analysisError) {
      console.error('Error saving analysis:', analysisError);
      // Don't throw here, just log the error
    }

    console.log('Benchmark completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        benchmarkId: benchmarkData.id,
        summaries,
        testCasesCount: testCases.length,
        modelsCount: modelsToTest.length,
        executedModels: modelsToTest.map(m => m.model),
        validationResults,
        message: 'Benchmark completed successfully'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Benchmark execution error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Failed to execute benchmark'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});