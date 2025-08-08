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

const MODELS_TO_TEST = [
  { name: 'gpt-4o', provider: 'openai' },
  { name: 'gpt-4o-mini', provider: 'openai' },
  { name: 'claude-3-5-sonnet-20241022', provider: 'anthropic' },
  { name: 'claude-3-5-haiku-20241022', provider: 'anthropic' },
  { name: 'gemini-1.5-pro', provider: 'google' },
  { name: 'gemini-1.5-flash', provider: 'google' },
  { name: 'deepseek-chat', provider: 'deepseek' }
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
    
    // Fetch active test cases
    const { data: testCases, error: testCasesError } = await supabase
      .from('qa_test_cases')
      .select('id, query, expected_keywords, category, complexity')
      .eq('is_active', true)
      .limit(10); // Limit for initial testing

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

    // Run tests for each model
    for (const model of MODELS_TO_TEST) {
      console.log(`Testing model: ${model.name} (${model.provider})`);
      
      const modelResults = [];
      let totalCorrect = 0;
      let totalResponseTime = 0;
      let totalCost = 0;

      for (const testCase of testCases as TestCase[]) {
        const startTime = Date.now();
        
        try {
          // Call the agentic-rag function with the test case
          const { data: response, error: ragError } = await supabase.functions.invoke('agentic-rag', {
            body: {
              query: testCase.query,
              model: model.name,
              provider: model.provider
            }
          });

          const responseTime = Date.now() - startTime;
          
          if (ragError) {
            console.error(`Error for ${model.name} on test ${testCase.id}:`, ragError);
            modelResults.push({
              testCaseId: testCase.id,
              query: testCase.query,
              expectedKeywords: testCase.expected_keywords,
              actualResponse: null,
              responseTime,
              isCorrect: false,
              qualityScore: 0,
              error: ragError.message
            });
            continue;
          }

          // Calculate quality score based on keyword matching
          const responseText = response?.response || '';
          const keywordMatches = testCase.expected_keywords.filter(keyword => 
            responseText.toLowerCase().includes(keyword.toLowerCase())
          ).length;
          
          const qualityScore = testCase.expected_keywords.length > 0 
            ? (keywordMatches / testCase.expected_keywords.length) * 100 
            : 50;

          const isCorrect = qualityScore >= 70; // 70% threshold for correctness
          
          if (isCorrect) totalCorrect++;
          totalResponseTime += responseTime;
          totalCost += 0.001; // Estimated cost per query

          modelResults.push({
            testCaseId: testCase.id,
            query: testCase.query,
            expectedKeywords: testCase.expected_keywords,
            actualResponse: responseText,
            responseTime,
            isCorrect,
            qualityScore,
            error: null
          });

        } catch (error) {
          console.error(`Unexpected error for ${model.name} on test ${testCase.id}:`, error);
          modelResults.push({
            testCaseId: testCase.id,
            query: testCase.query,
            expectedKeywords: testCase.expected_keywords,
            actualResponse: null,
            responseTime: Date.now() - startTime,
            isCorrect: false,
            qualityScore: 0,
            error: error.message
          });
        }
      }

      // Calculate summary metrics
      const avgResponseTime = totalResponseTime / testCases.length;
      const avgQualityScore = modelResults.reduce((sum, r) => sum + r.qualityScore, 0) / testCases.length;
      const successRate = (totalCorrect / testCases.length) * 100;
      const avgCostPerQuery = totalCost / testCases.length;

      let recommendation = '';
      if (avgQualityScore >= 90) recommendation = 'Excelente para tarefas complexas';
      else if (avgResponseTime <= 2000) recommendation = 'Ótimo para respostas rápidas';
      else if (avgCostPerQuery <= 0.0005) recommendation = 'Econômico para alto volume';
      else recommendation = 'Balanceado para uso geral';

      const summary = {
        provider: model.provider,
        model: model.name,
        totalTests: testCases.length,
        passedTests: totalCorrect,
        avgResponseTime: Math.round(avgResponseTime),
        avgQualityScore: Math.round(avgQualityScore * 100) / 100,
        successRate: Math.round(successRate * 100) / 100,
        avgCostPerQuery: Math.round(avgCostPerQuery * 10000) / 10000,
        recommendation
      };

      summaries.push(summary);
      results.push({
        model: model.name,
        provider: model.provider,
        results: modelResults
      });
    }

    // Save benchmark results to database
    const { data: benchmarkData, error: saveError } = await supabase
      .from('qa_benchmarks')
      .insert({
        results,
        summaries,
        metadata: {
          totalModels: MODELS_TO_TEST.length,
          totalTestCases: testCases.length,
          executionTime: Date.now(),
          version: '1.0'
        }
      })
      .select()
      .single();

    if (saveError) {
      console.error('Error saving benchmark:', saveError);
      throw saveError;
    }

    console.log('Benchmark completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        benchmarkId: benchmarkData.id,
        summaries,
        totalModels: MODELS_TO_TEST.length,
        totalTestCases: testCases.length
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