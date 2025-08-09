import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

// Template filtering functions (imported from utils)
function removePromotionalTemplate(text: string): string {
  if (!text) return '';
  
  return text
    .replace(/🌟.*?Experimente.*?🌟/gs, '')
    .replace(/📍.*?Explore mais:.*?$/gm, '')
    .replace(/💬.*?Dúvidas\?.*?$/gm, '')
    .replace(/Para mais informações.*?visite.*?\.org/gs, '')
    .replace(/💡.*?Dica:.*$/gm, '')
    .replace(/\*\*Aviso:.*?\*\*/gs, '')
    .replace(/---\s*Experimente.*$/gs, '')
    .replace(/https:\/\/bit\.ly\/\w+\s*↗\s*↗/g, '')
    .replace(/Contribua com sugestões:.*$/gm, '')
    .replace(/Participe da Audiência Pública:.*$/gm, '')
    .replace(/Mapa com Regras Construtivas:.*$/gm, '')
    .replace(/planodiretor@portoalegre\.rs\.gov\.br/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function normalizeText(text: string): string {
  if (!text) return '';
  
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function calculateAccuracyWithoutTemplate(
  actualAnswer: string,
  expectedKeywords: string[],
  expectedAnswer?: string,
  category?: string
): number {
  const cleanActual = normalizeText(removePromotionalTemplate(actualAnswer));
  const cleanExpected = expectedAnswer ? normalizeText(removePromotionalTemplate(expectedAnswer)) : '';
  
  let accuracy = 0;
  
  if (expectedKeywords?.length > 0) {
    const normalizedKeywords = expectedKeywords.map(k => normalizeText(k));
    const matchedKeywords = normalizedKeywords.filter(keyword => 
      cleanActual.includes(keyword) || keyword.includes(cleanActual.substring(0, 20))
    );
    accuracy = matchedKeywords.length / normalizedKeywords.length;
  } else if (cleanExpected) {
    const actualWords = cleanActual.split(/\s+/).filter(w => w.length > 2);
    const expectedWords = cleanExpected.split(/\s+/).filter(w => w.length > 2);
    
    if (expectedWords.length > 0) {
      const commonWords = actualWords.filter(word => expectedWords.includes(word));
      accuracy = commonWords.length / expectedWords.length;
    }
  }
  
  return Math.min(accuracy, 1);
}

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

  const requestStartTime = Date.now();
  let totalRunsCreated = 0;

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
      models = ['anthropic/claude-3-5-sonnet-20241022'], // Default para um modelo válido real
      includeSQL = true,
      excludeSQL = false
    }: ValidationRequest = await req.json();

    console.log(`[QA-VALIDATION-V2] Starting validation at ${new Date().toISOString()}`);
    console.log(`[QA-VALIDATION-V2] Request params:`, { mode, models, randomCount, includeSQL, excludeSQL });

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
      totalRunsCreated++;
      
      console.log(`[QA-VALIDATION-V2] Creating validation run for model: ${model} with ID: ${runId}`);
      
      // Create validation run with proper error handling
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
        console.error(`[QA-VALIDATION-V2] CRITICAL: Error creating validation run for ${model}:`, runError);
        throw new Error(`Failed to create validation run for ${model}: ${runError.message}`);
      }

      console.log(`[QA-VALIDATION-V2] Successfully created validation run for ${model}`);

      // Execute tests for this model
      const results: TestResult[] = [];
      let passedCount = 0;
      let totalResponseTime = 0;
      let totalAccuracy = 0;

      // Process tests in batches to avoid overwhelming the system with better error handling
      const batchSize = 3; // Reduced batch size for better error handling
      let processedTests = 0;
      console.log(`[QA-VALIDATION-V2] Processing ${casesToRun.length} tests for model ${model} in batches of ${batchSize}`);
      
      for (let i = 0; i < casesToRun.length; i += batchSize) {
        const batch = casesToRun.slice(i, i + batchSize);
        
        console.log(`[QA-VALIDATION-V2] Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(casesToRun.length/batchSize)} for model ${model}`);
        
        const batchResults = await Promise.all(
          batch.map(async (testCase) => {
            const startTime = Date.now();
            const testTimeout = 30000; // 30 second timeout per test
            
            try {
              console.log(`[QA-VALIDATION-V2] Testing case ${testCase.id} with model ${model}`);
              
              // Add timeout to the fetch request
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), testTimeout);
              
              // Call agentic-rag endpoint with the specified model
              console.log(`[QA-VALIDATION-V2] Testing case ${testCase.id} with model ${model} via agentic-rag`);
              
              let response;
              try {
                response = await fetch(`${supabaseUrl}/functions/v1/agentic-rag`, {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${supabaseServiceKey}`,
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({
                    query: testCase.query || testCase.question,
                    sessionId: `qa_validation_${model.replace('/', '_')}_${Date.now()}`,
                    model: model, // Pass the specific model to use
                    bypassCache: true, // Force fresh results for validation
                    userRole: 'user'
                  }),
                  signal: controller.signal
                });
                
                if (response.ok) {
                  console.log(`[QA-VALIDATION-V2] Successfully called agentic-rag for model ${model}`);
                } else {
                  throw new Error(`agentic-rag returned status ${response.status}: ${await response.text()}`);
                }
              } catch (endpointError) {
                console.error(`[QA-VALIDATION-V2] agentic-rag failed for model ${model}:`, endpointError.message);
                throw endpointError;
              }
              
              clearTimeout(timeoutId);

              const responseTime = Date.now() - startTime;
              totalResponseTime += responseTime;

              if (!response || !response.ok) {
                throw new Error(`agentic-rag endpoint failed with status ${response?.status}`);
              }

              const result = await response.json();
              const rawAnswer = result.response || result.text || '';

              // Enhanced accuracy calculation with template filtering
              const cleanAnswer = removePromotionalTemplate(rawAnswer);
              const accuracy = calculateAccuracyWithoutTemplate(
                cleanAnswer,
                testCase.expected_keywords || [],
                testCase.expected_answer,
                testCase.category
              );

              // Category-specific accuracy thresholds
              const categoryThresholds: Record<string, number> = {
                'zoneamento': 0.8,
                'altura_maxima': 0.9,
                'uso-solo': 0.7,
                'conceptual': 0.6,
                'counting': 0.9,
                'construction': 0.7,
                'street': 0.5,
                'specific-zot': 0.8,
                'neighborhood-zots': 0.7,
              };
              
              const threshold = categoryThresholds[testCase.category] || 0.6;
              const isCorrect = accuracy >= threshold;
              
              console.log(`[QA-VALIDATION-V2] Case ${testCase.id}: accuracy=${(accuracy * 100).toFixed(1)}%, threshold=${(threshold * 100).toFixed(1)}%, result=${isCorrect ? 'PASS' : 'FAIL'}`);
              if (isCorrect) passedCount++;
              totalAccuracy += accuracy;

                // Store detailed result in database with retry logic
                const testCaseId = testCase.id.toString();
                console.log(`[QA-VALIDATION-V2] Preparing result for test case ${testCaseId} (type: ${typeof testCase.id})`);
                
                const resultData = {
                  validation_run_id: runId,
                test_case_id: testCaseId, // Ensure string type for TEXT column
                model,
                actual_answer: cleanAnswer.substring(0, 2000),
                  is_correct: isCorrect,
                  accuracy_score: accuracy,
                  response_time_ms: responseTime,
                  error_type: isCorrect ? null : 'accuracy_below_threshold',
                  error_details: isCorrect ? null : `Accuracy: ${(accuracy * 100).toFixed(1)}%`,
                  created_at: new Date().toISOString()
                };

                let insertSuccess = false;
                for (let retry = 0; retry < 3; retry++) {
                  const { error: insertError } = await supabase
                    .from('qa_validation_results')
                    .insert(resultData);

                  if (!insertError) {
                    insertSuccess = true;
                    console.log(`[QA-VALIDATION-V2] Successfully saved result for test ${testCase.id}`);
                    break;
                  } else {
                    console.error(`[QA-VALIDATION-V2] Error inserting result for test ${testCase.id} (attempt ${retry + 1}):`, insertError);
                    if (retry === 2) {
                      console.error(`[QA-VALIDATION-V2] CRITICAL: Failed to save result after 3 attempts for test ${testCase.id}`);
                    }
                  }
                }

              return {
                testCaseId: testCase.id,
                testCaseTestId: testCase.test_id,
                question: testCase.question || testCase.query,
                expectedAnswer: testCase.expected_answer,
                actualAnswer: cleanAnswer.substring(0, 500), // Truncate for response
                success: isCorrect,
                accuracy,
                responseTime,
                model
              };

            } catch (error) {
              console.error(`[QA-VALIDATION-V2] Error testing case ${testCase.id} with ${model}:`, error);
              
              const responseTime = Date.now() - startTime;
              
              // Determine error type based on error message
              let errorType = 'execution_error';
              if (error.name === 'AbortError' || error.message.includes('timeout')) {
                errorType = 'timeout_error';
              } else if (error.message.includes('fetch')) {
                errorType = 'network_error';
              }
              
              // Save error result with retry logic
              const testCaseId = testCase.id.toString();
              console.log(`[QA-VALIDATION-V2] Preparing error result for test case ${testCaseId}`);
              
              const errorData = {
                validation_run_id: runId,
                test_case_id: testCaseId, // Ensure string type for TEXT column
                model,
                actual_answer: '',
                is_correct: false,
                accuracy_score: 0,
                response_time_ms: responseTime,
                error_type: errorType,
                error_details: error.message.substring(0, 1000),
                created_at: new Date().toISOString()
              };

              for (let retry = 0; retry < 3; retry++) {
                const { error: insertError } = await supabase
                  .from('qa_validation_results')
                  .insert(errorData);

                if (!insertError) {
                  console.log(`[QA-VALIDATION-V2] Successfully saved error result for test ${testCase.id}`);
                  break;
                } else {
                  console.error(`[QA-VALIDATION-V2] Error inserting error result for test ${testCase.id} (attempt ${retry + 1}):`, insertError);
                }
              }

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
        processedTests += batch.length;
        
        console.log(`[QA-VALIDATION-V2] Completed batch for model ${model}: ${processedTests}/${casesToRun.length} tests processed`);
        
        // Add small delay between batches to avoid overwhelming the system
        if (i + batchSize < casesToRun.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      // Update validation run with final results
      const overallAccuracy = casesToRun.length > 0 
        ? totalAccuracy / casesToRun.length 
        : 0;
      const avgResponseTime = casesToRun.length > 0 
        ? Math.round(totalResponseTime / casesToRun.length) 
        : 0;

      const completedAt = new Date().toISOString();
      
      // Always update to completed status, even if there were errors
      console.log(`[QA-VALIDATION-V2] Finalizing run ${runId} for model ${model}: ${passedCount}/${casesToRun.length} passed, accuracy: ${(overallAccuracy * 100).toFixed(1)}%`);
      
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
        console.error(`[QA-VALIDATION-V2] CRITICAL: Error updating validation run ${runId}:`, updateError);
        // Try to mark as failed instead
        await supabase
          .from('qa_validation_runs')
          .update({
            status: 'failed',
            error_message: `Failed to update run: ${updateError.message}`,
            completed_at: completedAt
          })
          .eq('id', runId);
      } else {
        console.log(`[QA-VALIDATION-V2] Successfully completed validation run ${runId} for model ${model}`);
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

    console.log(`[QA-VALIDATION-V2] Waiting for all ${models.length} model validations to complete...`);
    
    // Wait for all models to complete with better error handling
    const allResults = await Promise.allSettled(validationPromises);
    
    // Separate successful and failed results
    const successfulResults = allResults
      .filter(result => result.status === 'fulfilled')
      .map(result => (result as PromiseFulfilledResult<any>).value);
    
    const failedResults = allResults
      .filter(result => result.status === 'rejected')
      .map(result => (result as PromiseRejectedResult).reason);
    
    if (failedResults.length > 0) {
      console.error(`[QA-VALIDATION-V2] ${failedResults.length} model validations failed:`, failedResults);
    }

    // Calculate aggregate statistics only from successful results
    const totalRuns = successfulResults.length;
    const avgAccuracy = totalRuns > 0 ? successfulResults.reduce((sum, r) => sum + r.overallAccuracy, 0) / totalRuns : 0;
    const avgResponseTime = totalRuns > 0 ? successfulResults.reduce((sum, r) => sum + r.avgResponseTime, 0) / totalRuns : 0;
    const totalTestsRun = successfulResults.reduce((sum, r) => sum + r.totalTests, 0);
    const totalPassed = successfulResults.reduce((sum, r) => sum + r.passedTests, 0);
    const executionTime = Date.now() - requestStartTime;

    console.log(`[QA-VALIDATION-V2] Validation completed in ${executionTime}ms. Success: ${totalRuns}/${models.length} models, ${totalPassed}/${totalTestsRun} tests passed`);

    return new Response(
      JSON.stringify({
        success: totalRuns > 0, // Success if at least one model completed
        runId: successfulResults.length === 1 ? successfulResults[0].runId : null, // For single model compatibility
        summary: {
          totalModels: totalRuns,
          totalTestsRun,
          totalPassed,
          avgAccuracy,
          avgResponseTime,
          executionTime,
          failedModels: failedResults.length,
          successfulModels: totalRuns
        },
        runs: successfulResults,
        errors: failedResults.length > 0 ? failedResults.map(err => err.message) : undefined
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