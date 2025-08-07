import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ValidationRequest {
  mode: 'all' | 'random' | 'selected' | 'filtered';
  selectedIds?: string[];
  categories?: string[];
  difficulties?: string[];
  randomCount?: number;
  models?: string[]; // Suporte para múltiplos modelos
  includeSQL?: boolean;
  excludeSQL?: boolean;
}

interface TestResult {
  testCaseId: string;
  testCaseTestId: string;
  question: string;
  expectedAnswer: string;
  actualAnswer: string;
  success: boolean;
  accuracy: number;
  responseTime: number;
  error?: string;
  model: string;
}

interface ValidationRunResult {
  runId: string;
  model: string;
  totalTests: number;
  passedTests: number;
  overallAccuracy: number;
  avgResponseTime: number;
  status: string;
  startedAt: string;
  completedAt?: string;
  results: TestResult[];
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

    const { 
      mode = 'all', 
      selectedIds, 
      categories, 
      difficulties, 
      randomCount = 10,
      models = ['openai/gpt-3.5-turbo'], // Default para um modelo válido
      includeSQL = true,
      excludeSQL = false
    }: ValidationRequest = await req.json();

    console.log('Starting QA validation with options:', { mode, models, randomCount });

    // Fetch test cases based on mode
    let query = supabase
      .from('qa_test_cases')
      .select('*')
      .eq('is_active', true);

    if (mode === 'selected' && selectedIds?.length) {
      query = query.in('test_id', selectedIds);
    } else if (mode === 'filtered') {
      if (categories?.length) {
        query = query.in('category', categories);
      }
      if (difficulties?.length) {
        query = query.in('complexity', difficulties);
      }
    }

    // Apply SQL filtering
    if (excludeSQL) {
      query = query.eq('is_sql_related', false);
    } else if (!includeSQL) {
      query = query.eq('is_sql_related', false);
    }

    const { data: testCases, error: fetchError } = await query;
    
    if (fetchError) {
      throw new Error(`Failed to fetch test cases: ${fetchError.message}`);
    }

    // Apply random selection if needed
    let casesToRun = testCases || [];
    if (mode === 'random' && randomCount < casesToRun.length) {
      casesToRun = casesToRun
        .sort(() => 0.5 - Math.random())
        .slice(0, randomCount);
    }

    console.log(`Running validation on ${casesToRun.length} test cases with ${models.length} models`);

    // Execute validations for each model in parallel
    const validationPromises = models.map(async (model) => {
      // Generate a valid UUID v4
      const runId = crypto.randomUUID();
      
      // Create validation run
      const { error: runError } = await supabase
        .from('qa_validation_runs')
        .insert({
          id: runId,
          model,
          total_tests: casesToRun.length,
          passed_tests: 0,
          overall_accuracy: 0,
          avg_response_time_ms: 0,
          status: 'running',
          started_at: new Date().toISOString()
        });

      if (runError) {
        console.error(`Error creating validation run for ${model}:`, runError);
      }

      // Execute tests for this model
      const results: TestResult[] = [];
      let passedCount = 0;
      let totalResponseTime = 0;
      let totalAccuracy = 0;

      // Process tests in batches to avoid overwhelming the system
      const batchSize = 5;
      for (let i = 0; i < casesToRun.length; i += batchSize) {
        const batch = casesToRun.slice(i, i + batchSize);
        
        const batchResults = await Promise.all(
          batch.map(async (testCase) => {
            const startTime = Date.now();
            
            try {
              // Always use agentic-rag endpoint which supports all models
              const endpoint = 'agentic-rag';
              
              const response = await fetch(`${supabaseUrl}/functions/v1/${endpoint}`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${supabaseServiceKey}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  message: testCase.query || testCase.question,
                  sessionId: `qa_validation_${model.replace('/', '_')}`,
                  model: model,
                  bypassCache: true // Force fresh results for validation
                })
              });

              const responseTime = Date.now() - startTime;
              totalResponseTime += responseTime;

              if (!response.ok) {
                throw new Error(`Function returned ${response.status}`);
              }

              const result = await response.json();
              const actualAnswer = result.response || result.text || '';

              // Calculate accuracy based on keyword matching and similarity
              const expectedKeywords = testCase.expected_keywords || [];
              const actualLower = actualAnswer.toLowerCase();
              const matchedKeywords = expectedKeywords.filter(keyword => 
                actualLower.includes(keyword.toLowerCase())
              );
              
              // Enhanced accuracy calculation
              let accuracy = 0;
              if (expectedKeywords.length > 0) {
                accuracy = matchedKeywords.length / expectedKeywords.length;
              } else {
                // Fallback to simple similarity check
                const expectedLower = (testCase.expected_answer || '').toLowerCase();
                const commonWords = expectedLower.split(/\s+/).filter(word => 
                  word.length > 3 && actualLower.includes(word)
                );
                accuracy = Math.min(commonWords.length / 10, 1); // Cap at 1
              }

              const isCorrect = accuracy >= 0.6;
              if (isCorrect) passedCount++;
              totalAccuracy += accuracy;

              // Store detailed result in database
              await supabase
                .from('qa_validation_results')
                .insert({
                  validation_run_id: runId,
                  test_case_id: testCase.id,
                  model,
                  actual_answer: actualAnswer.substring(0, 2000),
                  is_correct: isCorrect,
                  accuracy_score: accuracy,
                  response_time_ms: responseTime,
                  error_type: isCorrect ? null : 'accuracy_below_threshold',
                  error_details: isCorrect ? null : `Accuracy: ${(accuracy * 100).toFixed(1)}%`,
                  created_at: new Date().toISOString()
                });

              return {
                testCaseId: testCase.id,
                testCaseTestId: testCase.test_id,
                question: testCase.question || testCase.query,
                expectedAnswer: testCase.expected_answer,
                actualAnswer: actualAnswer.substring(0, 500), // Truncate for response
                success: isCorrect,
                accuracy,
                responseTime,
                model
              };

            } catch (error) {
              console.error(`Error testing case ${testCase.id} with ${model}:`, error);
              
              const responseTime = Date.now() - startTime;
              
              await supabase
                .from('qa_validation_results')
                .insert({
                  validation_run_id: runId,
                  test_case_id: testCase.id,
                  model,
                  actual_answer: '',
                  is_correct: false,
                  accuracy_score: 0,
                  response_time_ms: responseTime,
                  error_type: 'execution_error',
                  error_details: error.message,
                  created_at: new Date().toISOString()
                });

              return {
                testCaseId: testCase.id,
                testCaseTestId: testCase.test_id,
                question: testCase.question || testCase.query,
                expectedAnswer: testCase.expected_answer,
                actualAnswer: '',
                success: false,
                accuracy: 0,
                responseTime,
                error: error.message,
                model
              };
            }
          })
        );
        
        results.push(...batchResults);
      }

      // Update validation run with final results
      const overallAccuracy = casesToRun.length > 0 
        ? totalAccuracy / casesToRun.length 
        : 0;
      const avgResponseTime = casesToRun.length > 0 
        ? totalResponseTime / casesToRun.length 
        : 0;

      const completedAt = new Date().toISOString();
      
      // Always update to completed status, even if there were errors
      const { error: updateError } = await supabase
        .from('qa_validation_runs')
        .update({
          passed_tests: passedCount,
          overall_accuracy: overallAccuracy,
          avg_response_time_ms: avgResponseTime,
          status: 'completed',
          completed_at: completedAt
        })
        .eq('id', runId);
        
      if (updateError) {
        console.error(`Error updating validation run ${runId}:`, updateError);
      }

      return {
        runId,
        model,
        totalTests: casesToRun.length,
        passedTests: passedCount,
        overallAccuracy,
        avgResponseTime,
        status: 'completed',
        startedAt: new Date().toISOString(),
        completedAt,
        results
      };
    });

    // Wait for all models to complete
    const allResults = await Promise.all(validationPromises);

    // Calculate aggregate statistics
    const totalRuns = allResults.length;
    const avgAccuracy = allResults.reduce((sum, r) => sum + r.overallAccuracy, 0) / totalRuns;
    const avgResponseTime = allResults.reduce((sum, r) => sum + r.avgResponseTime, 0) / totalRuns;
    const totalTestsRun = allResults.reduce((sum, r) => sum + r.totalTests, 0);
    const totalPassed = allResults.reduce((sum, r) => sum + r.passedTests, 0);

    return new Response(
      JSON.stringify({
        success: true,
        summary: {
          totalModels: totalRuns,
          totalTestsRun,
          totalPassed,
          avgAccuracy,
          avgResponseTime,
          executionTime: Date.now() - Date.parse(allResults[0].startedAt)
        },
        runs: allResults
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Error in qa-execute-validation-v2:', error);
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