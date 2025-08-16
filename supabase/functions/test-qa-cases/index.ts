import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface QATestCase {
  id: number;
  test_id: string;
  query: string;
  question?: string;
  expected_answer: string;
  expected_keywords: string[];
  category: string;
  complexity: string;
  difficulty?: string;
  is_active: boolean;
  is_sql_related?: boolean;
}

interface ValidationResult {
  test_case_id: string;
  actual_answer: string;
  is_correct: boolean;
  accuracy_score: number;
  response_time_ms: number;
  keywords_found: string[];
  keyword_accuracy: number;
  error_details?: string;
}

export default async function handler(req: Request) {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('🧪 Starting Hybrid QA Test (Sync + Background)');
    
    // Fetch ALL active test cases
    const { data: testCases, error: fetchError } = await supabase
      .from('qa_test_cases')
      .select('*')
      .eq('is_active', true)
      .order('category', { ascending: true })
      .order('id', { ascending: true });

    if (fetchError) {
      throw new Error(`Failed to fetch test cases: ${fetchError.message}`);
    }

    if (!testCases || testCases.length === 0) {
      return Response.json({
        status: 'error',
        message: 'No active test cases found',
        total_cases: 0
      }, { headers: corsHeaders });
    }

    console.log(`📊 Found ${testCases.length} active test cases`);

    // Create a new validation run
    const { data: validationRun, error: runError } = await supabase
      .from('qa_validation_runs')
      .insert({
        model: 'agentic-rag-v2',
        status: 'running',
        total_tests: testCases.length,
        passed_tests: 0,
        overall_accuracy: 0,
        avg_response_time_ms: 0,
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (runError || !validationRun) {
      throw new Error(`Failed to create validation run: ${runError?.message}`);
    }

    console.log(`🚀 Created validation run: ${validationRun.id}`);

    // Hybrid approach: Process some tests synchronously, then continue in background
    const results: ValidationResult[] = [];
    let passedTests = 0;
    let totalAccuracy = 0;
    let totalResponseTime = 0;

    // Process first 5 tests synchronously to ensure some results are saved
    const syncBatchSize = Math.min(5, testCases.length);
    const syncTests = testCases.slice(0, syncBatchSize);
    const remainingTests = testCases.slice(syncBatchSize);

    console.log(`🔄 Processing first ${syncBatchSize} tests synchronously...`);

    // Process synchronous batch
    for (let i = 0; i < syncTests.length; i++) {
      const testCase = syncTests[i];
      const startTime = Date.now();
      
      try {
        console.log(`🔬 Sync Test ${i + 1}/${syncBatchSize}: ${testCase.category} - ${testCase.id}`);
        
        const { data: response, error: callError } = await supabase.functions.invoke('agentic-rag', {
          body: {
            query: testCase.question || testCase.query,
            model: 'openai/gpt-3.5-turbo-0125',
            sessionId: `qa-sync-${Date.now()}-${testCase.id}`
          }
        });

        const responseTime = Date.now() - startTime;
        
        if (callError) {
          throw new Error(`API call failed: ${callError.message}`);
        }

        const actualAnswer = response?.content || response?.message || '';
        const evaluation = evaluateAnswer(actualAnswer, testCase.expected_answer, testCase.expected_keywords);
        
        // Save result immediately
        const { error: saveError } = await supabase
          .from('qa_validation_results')
          .insert({
            test_case_id: testCase.id.toString(),
            validation_run_id: validationRun.id,
            model: 'agentic-rag-v2',
            actual_answer: actualAnswer,
            is_correct: evaluation.is_correct,
            accuracy_score: evaluation.accuracy_score,
            response_time_ms: responseTime,
            error_type: null,
            error_details: null,
            evaluation_reasoning: `Sync test - Keywords found: ${evaluation.keywords_found.join(', ')} (${evaluation.keyword_accuracy}% accuracy)`
          });

        if (saveError) {
          console.error(`Failed to save sync result for test ${testCase.id}:`, saveError);
        }

        if (evaluation.is_correct) passedTests++;
        totalAccuracy += evaluation.accuracy_score;
        totalResponseTime += responseTime;

        console.log(`✅ Sync Test ${testCase.id}: ${evaluation.is_correct ? 'PASS' : 'FAIL'} - ${evaluation.accuracy_score}%`);

      } catch (error) {
        const responseTime = Date.now() - startTime;
        
        // Save error result
        await supabase
          .from('qa_validation_results')
          .insert({
            test_case_id: testCase.id.toString(),
            validation_run_id: validationRun.id,
            model: 'agentic-rag-v2',
            actual_answer: '',
            is_correct: false,
            accuracy_score: 0,
            response_time_ms: responseTime,
            error_type: 'sync_api_error',
            error_details: error.message,
          });

        totalResponseTime += responseTime;
        console.log(`❌ Sync Test ${testCase.id} ERROR: ${error.message}`);
      }
    }

    // Update progress after sync tests
    await supabase
      .from('qa_validation_runs')
      .update({
        passed_tests: passedTests,
        overall_accuracy: syncBatchSize > 0 ? totalAccuracy / syncBatchSize : 0,
        avg_response_time_ms: Math.round(totalResponseTime / syncBatchSize),
        last_heartbeat: new Date().toISOString()
      })
      .eq('id', validationRun.id);

    // Background task for remaining tests
    const backgroundTask = async () => {
      try {
        console.log(`🚀 Starting background processing of ${remainingTests.length} remaining tests...`);
        
        const batchSize = 2;
        let bgPassedTests = passedTests;
        let bgTotalAccuracy = totalAccuracy;
        let bgTotalResponseTime = totalResponseTime;
        let processedTests = syncBatchSize;
        
        for (let i = 0; i < remainingTests.length; i += batchSize) {
          const batch = remainingTests.slice(i, i + batchSize);
          
          // Update heartbeat before processing batch
          await supabase
            .from('qa_validation_runs')
            .update({
              last_heartbeat: new Date().toISOString(),
              status: 'running'
            })
            .eq('id', validationRun.id);
          
          const batchPromises = batch.map(async (testCase, batchIndex) => {
            const testNumber = syncBatchSize + i + batchIndex + 1;
            const startTime = Date.now();
            
            try {
              console.log(`🔬 BG Test ${testNumber}/${testCases.length}: ${testCase.category} - ${testCase.id}`);
              
              const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Test timeout after 30s')), 30000)
              );
              
              const testPromise = supabase.functions.invoke('agentic-rag', {
                body: {
                  query: testCase.question || testCase.query,
                  model: 'openai/gpt-3.5-turbo-0125',
                  sessionId: `qa-bg-${Date.now()}-${testCase.id}`
                }
              });

              const { data: response, error: callError } = await Promise.race([
                testPromise,
                timeoutPromise
              ]) as any;

              const responseTime = Date.now() - startTime;
              
              if (callError) {
                throw new Error(`API call failed: ${callError.message}`);
              }

              const actualAnswer = response?.content || response?.message || '';
              const evaluation = evaluateAnswer(actualAnswer, testCase.expected_answer, testCase.expected_keywords);
              
              // Save result with retries
              let saveAttempts = 0;
              const maxSaveAttempts = 3;
              
              while (saveAttempts < maxSaveAttempts) {
                try {
                  const { error: saveError } = await supabase
                    .from('qa_validation_results')
                    .insert({
                      test_case_id: testCase.id.toString(),
                      validation_run_id: validationRun.id,
                      model: 'agentic-rag-v2',
                      actual_answer: actualAnswer,
                      is_correct: evaluation.is_correct,
                      accuracy_score: evaluation.accuracy_score,
                      response_time_ms: responseTime,
                      error_type: null,
                      error_details: null,
                      evaluation_reasoning: `BG test - Keywords found: ${evaluation.keywords_found.join(', ')} (${evaluation.keyword_accuracy}% accuracy)`
                    });

                  if (!saveError) break;
                  
                  saveAttempts++;
                  if (saveAttempts >= maxSaveAttempts) {
                    console.error(`Failed to save BG result for test ${testCase.id} after ${maxSaveAttempts} attempts:`, saveError);
                  } else {
                    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s before retry
                  }
                } catch (retryError) {
                  saveAttempts++;
                  console.error(`Save retry ${saveAttempts} failed for test ${testCase.id}:`, retryError);
                  if (saveAttempts < maxSaveAttempts) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                  }
                }
              }

              if (evaluation.is_correct) bgPassedTests++;
              bgTotalAccuracy += evaluation.accuracy_score;
              bgTotalResponseTime += responseTime;

              console.log(`✅ BG Test ${testCase.id}: ${evaluation.is_correct ? 'PASS' : 'FAIL'} - ${evaluation.accuracy_score}%`);

              return true;

            } catch (error) {
              const responseTime = Date.now() - startTime;
              
              // Save error result with retries
              try {
                await supabase
                  .from('qa_validation_results')
                  .insert({
                    test_case_id: testCase.id.toString(),
                    validation_run_id: validationRun.id,
                    model: 'agentic-rag-v2',
                    actual_answer: '',
                    is_correct: false,
                    accuracy_score: 0,
                    response_time_ms: responseTime,
                    error_type: 'bg_api_error',
                    error_details: error.message,
                  });
              } catch (saveError) {
                console.error(`Failed to save BG error result for test ${testCase.id}:`, saveError);
              }

              bgTotalResponseTime += responseTime;
              console.log(`❌ BG Test ${testCase.id} ERROR: ${error.message}`);
              return false;
            }
          });

          await Promise.all(batchPromises);
          processedTests += batch.length;

          // Update progress after each batch
          await supabase
            .from('qa_validation_runs')
            .update({
              passed_tests: bgPassedTests,
              overall_accuracy: processedTests > 0 ? bgTotalAccuracy / processedTests : 0,
              avg_response_time_ms: Math.round(bgTotalResponseTime / processedTests),
              last_heartbeat: new Date().toISOString()
            })
            .eq('id', validationRun.id);

          // Delay between batches
          if (i + batchSize < remainingTests.length) {
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }

        // Mark as completed
        const finalAccuracy = testCases.length > 0 ? bgTotalAccuracy / testCases.length : 0;
        await supabase
          .from('qa_validation_runs')
          .update({
            status: 'completed',
            overall_accuracy: finalAccuracy,
            completed_at: new Date().toISOString(),
            last_heartbeat: new Date().toISOString()
          })
          .eq('id', validationRun.id);

        console.log(`🎯 FINAL BG RESULTS: ${bgPassedTests}/${testCases.length} passed (${finalAccuracy.toFixed(1)}% accuracy)`);
      } catch (bgError) {
        console.error('❌ Background task failed:', bgError);
        
        // Mark as failed
        await supabase
          .from('qa_validation_runs')
          .update({
            status: 'failed',
            error_details: bgError.message,
            last_heartbeat: new Date().toISOString()
          })
          .eq('id', validationRun.id);
      }
    };

    // Start background task with multiple fallbacks
    let backgroundStarted = false;
    
    // Try EdgeRuntime.waitUntil first
    if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
      try {
        EdgeRuntime.waitUntil(backgroundTask());
        backgroundStarted = true;
        console.log('✅ Background task started with EdgeRuntime.waitUntil');
      } catch (edgeError) {
        console.error('❌ EdgeRuntime.waitUntil failed:', edgeError);
      }
    }
    
    // Fallback: Start as fire-and-forget
    if (!backgroundStarted) {
      backgroundTask().catch(error => {
        console.error('❌ Fallback background task failed:', error);
      });
      console.log('✅ Background task started as fallback');
    }

    // Return immediately with run_id for polling
    return Response.json({
      status: 'started',
      validation_run_id: validationRun.id,
      total_cases: testCases.length,
      sync_tests_completed: syncBatchSize,
      remaining_tests: remainingTests.length,
      message: `Processed ${syncBatchSize} tests synchronously. ${remainingTests.length} tests running in background.`,
      estimated_completion_minutes: Math.ceil(remainingTests.length / 6) // ~6 tests per minute in background
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('❌ QA Test Error:', error);
    return Response.json({
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    }, { 
      status: 500,
      headers: corsHeaders 
    });
  }
}

function evaluateAnswer(actual: string, expected: string, keywords: string[]): {
  is_correct: boolean;
  accuracy_score: number;
  keywords_found: string[];
  keyword_accuracy: number;
} {
  const actualLower = actual.toLowerCase().trim();
  const expectedLower = expected.toLowerCase().trim();
  
  // Check if it's a "data not found" response
  const isNoDataResponse = actualLower.includes('não encontrei') || 
                           actualLower.includes('dados não encontrados') ||
                           actualLower.includes('sem dados') ||
                           actualLower.includes('nenhum dado') ||
                           actualLower.length < 50;

  if (isNoDataResponse) {
    return {
      is_correct: false,
      accuracy_score: 0,
      keywords_found: [],
      keyword_accuracy: 0
    };
  }

  // Keyword matching
  const keywordsFound: string[] = [];
  let keywordMatches = 0;

  for (const keyword of keywords) {
    const keywordLower = keyword.toLowerCase();
    if (actualLower.includes(keywordLower)) {
      keywordsFound.push(keyword);
      keywordMatches++;
    }
  }

  const keywordAccuracy = keywords.length > 0 ? (keywordMatches / keywords.length) * 100 : 0;
  
  // Content similarity check
  const contentMatch = actualLower.includes(expectedLower) || 
                      expectedLower.includes(actualLower) ||
                      calculateWordOverlap(actualLower, expectedLower) > 0.3;

  // Combined scoring: keywords (70%) + content match (30%)
  const accuracyScore = (keywordAccuracy * 0.7) + (contentMatch ? 30 : 0);
  
  return {
    is_correct: accuracyScore >= 70,
    accuracy_score: Math.round(accuracyScore),
    keywords_found: keywordsFound,
    keyword_accuracy: Math.round(keywordAccuracy)
  };
}

function calculateWordOverlap(text1: string, text2: string): number {
  const words1 = text1.split(/\s+/).filter(w => w.length > 3);
  const words2 = text2.split(/\s+/).filter(w => w.length > 3);
  
  if (words1.length === 0 || words2.length === 0) return 0;
  
  const commonWords = words1.filter(word => 
    words2.some(w => word.includes(w) || w.includes(word))
  ).length;
  
  return commonWords / Math.max(words1.length, words2.length);
}