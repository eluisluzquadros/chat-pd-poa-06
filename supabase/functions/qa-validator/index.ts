import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BATCH_SIZE = 1; // Process only 1 test to avoid timeout
const TIMEOUT_PER_TEST = 8000; // 8 seconds timeout per test
const BASE_DELAY_BETWEEN_TESTS = 100; // Minimal delay
const TOKENS_PER_MINUTE_LIMIT = 10000; // Rate limit for tokens per minute
const MAX_EXECUTION_TIME = 50000; // 50 seconds max execution time

// Map frontend model names to edge function names
const modelToFunction: Record<string, string> = {
  'agentic-rag': 'agentic-rag',
  'claude-chat': 'claude-chat',
  'gemini-chat': 'gemini-chat',
  'llama-chat': 'llama-chat',
  'deepseek-chat': 'deepseek-chat',
  'groq-chat': 'groq-chat',
  'openai': 'agentic-rag'
};

// Token tracking for rate limiting
let tokenWindow: { timestamp: number; tokens: number }[] = [];

function addTokensToWindow(tokens: number) {
  const now = Date.now();
  tokenWindow.push({ timestamp: now, tokens });
  // Remove entries older than 1 minute
  tokenWindow = tokenWindow.filter(entry => now - entry.timestamp < 60000);
}

function getTokensInLastMinute(): number {
  const now = Date.now();
  return tokenWindow
    .filter(entry => now - entry.timestamp < 60000)
    .reduce((sum, entry) => sum + entry.tokens, 0);
}

function calculateDelay(estimatedTokens: number): number {
  const currentTokens = getTokensInLastMinute();
  const remainingCapacity = TOKENS_PER_MINUTE_LIMIT - currentTokens;
  
  if (remainingCapacity <= estimatedTokens) {
    // Need to wait for some tokens to expire from the window
    return 10000; // Wait 10 seconds
  }
  
  // Scale delay based on current usage
  const usageRatio = currentTokens / TOKENS_PER_MINUTE_LIMIT;
  return BASE_DELAY_BETWEEN_TESTS * (1 + usageRatio * 2);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  
  try {
    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    const { 
      model = 'agentic-rag',
      mode = 'all',
      testCaseIds = [],
      categories = [],
      difficulties = [],
      randomCount,
      includeSQL = true,
      excludeSQL = false,
      validationRunId = null,  // For continuing an existing run
      startIndex = 0          // For batch processing
    } = body;
    
    console.log(`Starting QA validation for model: ${model}, mode: ${mode}`);
    console.log('Request body:', JSON.stringify(body, null, 2));
    
    // Create or get validation run
    let validationRun;
    
    if (validationRunId) {
      // Continue existing run
      const { data, error } = await supabase
        .from('qa_validation_runs')
        .select('*')
        .eq('id', validationRunId)
        .single();
        
      if (error || !data) {
        throw new Error('Failed to find validation run');
      }
      
      validationRun = data;
      console.log(`Continuing validation run: ${validationRun.id}`);
    } else {
      // Create new run
      const { data, error: runError } = await supabase
        .from('qa_validation_runs')
        .insert({
          model,
          status: 'running',
          total_tests: 0,
          passed_tests: 0,
          overall_accuracy: 0,
          avg_response_time_ms: 0,
          started_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (runError || !data) {
        throw new Error('Failed to create validation run');
      }
      
      validationRun = data;
      console.log(`Created validation run: ${validationRun.id}`);
    }

    // Get test cases based on mode
    console.log('Building query with params:', { mode, includeSQL, excludeSQL, categories, difficulties });
    
    let query = supabase
      .from('qa_test_cases')
      .select('*')
      .eq('is_active', true);

    if (mode === 'selected' && testCaseIds.length > 0) {
      console.log('Mode: selected, filtering by IDs:', testCaseIds);
      query = query.in('id', testCaseIds);
    } else if (mode === 'filtered') {
      console.log('Mode: filtered, applying filters');
      if (categories.length > 0) {
        console.log('Filtering by categories:', categories);
        query = query.in('category', categories);
      }
      if (difficulties.length > 0) {
        console.log('Filtering by difficulties:', difficulties);
        query = query.in('difficulty', difficulties);
      }
    } else if (mode === 'all') {
      console.log('Mode: all, no additional filters');
    }

    // Apply SQL filters
    if (includeSQL && excludeSQL) {
      console.log('SQL filter: including all (both SQL and non-SQL)');
      // Include all - no filter needed
    } else if (excludeSQL) {
      console.log('SQL filter: excluding SQL cases');
      query = query.eq('is_sql_related', false);
    } else if (includeSQL === false) {
      console.log('SQL filter: excluding SQL cases (includeSQL=false)');
      query = query.eq('is_sql_related', false);
    }

    query = query.order('created_at', { ascending: true }).limit(1000);

    const { data: allTestCases, error: testError } = await query;

    console.log(`Query returned ${allTestCases?.length || 0} test cases`);
    console.log('Test cases IDs:', allTestCases?.map(tc => tc.id).join(', '));

    if (testError || !allTestCases || allTestCases.length === 0) {
      throw new Error('Failed to fetch test cases or no active tests found');
    }

    // Apply random selection if needed
    let testCases = allTestCases;
    if (mode === 'random' && randomCount) {
      const shuffled = [...allTestCases].sort(() => Math.random() - 0.5);
      testCases = shuffled.slice(0, randomCount);
    }

    const totalTests = testCases.length;
    console.log(`Found ${totalTests} test cases to process`);
    
    // Calculate batch
    const endIndex = Math.min(startIndex + BATCH_SIZE, totalTests);
    const batchTestCases = testCases.slice(startIndex, endIndex);
    
    console.log(`Processing batch: tests ${startIndex + 1} to ${endIndex} of ${totalTests}`);
    console.log('Batch test cases:', batchTestCases.map(tc => ({ id: tc.id, question: tc.question })));
    
    // Update total tests count immediately
    await supabase
      .from('qa_validation_runs')
      .update({ total_tests: totalTests })
      .eq('id', validationRun.id);

    // Process tests one by one
    let passedTests = 0;
    let totalAccuracy = 0;
    let totalResponseTime = 0;
    let processedTests = 0;
    let totalTokensUsed = 0;


    // Get existing results count if continuing
    let existingPassedTests = 0;
    let existingTotalAccuracy = 0;
    let existingProcessedTests = 0;
    let existingTotalResponseTime = 0;
    
    if (validationRunId) {
      const { data: existingRun } = await supabase
        .from('qa_validation_runs')
        .select('passed_tests, overall_accuracy, avg_response_time_ms')
        .eq('id', validationRunId)
        .single();
        
      if (existingRun) {
        existingPassedTests = existingRun.passed_tests || 0;
        existingProcessedTests = startIndex;
        existingTotalAccuracy = (existingRun.overall_accuracy || 0) * existingProcessedTests;
        existingTotalResponseTime = (existingRun.avg_response_time_ms || 0) * existingProcessedTests;
      }
    }

    for (let i = 0; i < batchTestCases.length; i++) {
      const testCase = batchTestCases[i];
      const globalIndex = startIndex + i;
      console.log(`\n=== Processing test ${globalIndex + 1}/${totalTests} ===`);
      console.log(`Test ID: ${testCase.id}`);
      console.log(`Question: ${testCase.question}`);
      
      const testStartTime = Date.now();
      
      try {
        // Determine which edge function to call
        const functionName = modelToFunction[model] || 'agentic-rag';
        
        // Call the edge function
        const response = await callEdgeFunction(
          supabase,
          functionName,
          {
            message: testCase.question,
            userRole: 'user',
            sessionId: `qa-test-${validationRun.id}`,
            userId: 'qa-validator'
          },
          TIMEOUT_PER_TEST
        );
        
        const responseTime = Date.now() - testStartTime;
        console.log(`Test completed in ${responseTime}ms`);
        
        // Extract answer and tokens
        const answer = response.response || response.content || response.text || '';
        const confidence = response.confidence || 0.5;
        const tokensUsed = response.usage?.total_tokens || 
                          estimateTokens(testCase.question + answer);
        
        totalTokensUsed += tokensUsed;
        addTokensToWindow(tokensUsed);
        
        // Compare answers
        const actualAnswer = answer.toLowerCase().trim();
        const expectedAnswer = testCase.expected_answer.toLowerCase().trim();
        
        // Calculate accuracy
        let isCorrect = false;
        let accuracy = 0;
        
        if (actualAnswer.includes(expectedAnswer) || expectedAnswer.includes(actualAnswer)) {
          isCorrect = true;
          accuracy = 1;
        } else if (actualAnswer.length > 0) {
          // Word overlap calculation
          const actualWords = actualAnswer.split(/\s+/);
          const expectedWords = expectedAnswer.split(/\s+/);
          const commonWords = actualWords.filter(word => 
            expectedWords.some(expWord => word.includes(expWord) || expWord.includes(word))
          ).length;
          accuracy = Math.min(commonWords / Math.max(expectedWords.length, 1), 1);
          isCorrect = accuracy > 0.5;
        }
        
        // Factor in confidence
        if (confidence > 0) {
          accuracy = accuracy * 0.7 + confidence * 0.3;
        }
        
        // Save result
        const result = {
          test_case_id: testCase.id,
          validation_run_id: validationRun.id,
          model,
          actual_answer: answer || 'Sem resposta',
          is_correct: isCorrect,
          accuracy_score: accuracy,
          response_time_ms: Math.round(responseTime),
          error_type: null,
          error_details: null,
          generated_sql: response.generatedSql || null
        };
        
        const { error: insertError } = await supabase
          .from('qa_validation_results')
          .insert(result);

        if (insertError) {
          console.error('Error inserting result:', insertError);
          throw insertError;
        }
        
        processedTests++;
        console.log(`✓ Test ${i + 1} completed successfully`);
        if (isCorrect) passedTests++;
        totalAccuracy += accuracy;
        totalResponseTime += responseTime;
        
      } catch (error) {
        console.error(`Test failed for "${testCase.question}":`, error.message);
        
        // Save error result
        const errorResult = {
          test_case_id: testCase.id,
          validation_run_id: validationRun.id,
          model,
          actual_answer: null,
          is_correct: false,
          accuracy_score: 0,
          response_time_ms: Date.now() - testStartTime,
          error_type: error.message.includes('timeout') ? 'timeout' : 'api_error',
          error_details: error.message,
          generated_sql: null
        };
        
        await supabase
          .from('qa_validation_results')
          .insert(errorResult);
        
        processedTests++;
        console.log(`✓ Test ${i + 1} completed successfully`);
      }

      // Update progress after each test
      await supabase
        .from('qa_validation_runs')
        .update({
          passed_tests: passedTests,
          overall_accuracy: processedTests > 0 ? totalAccuracy / processedTests : 0,
          avg_response_time_ms: Math.round(totalResponseTime / Math.max(processedTests, 1)),
        })
        .eq('id', validationRun.id);
      
      // Calculate and apply delay before next test
      if (i < testCases.length - 1) {
        const estimatedNextTokens = 500; // Estimate for next test
        const delay = calculateDelay(estimatedNextTokens);
        console.log(`Waiting ${delay}ms before next test (${getTokensInLastMinute()} tokens in last minute)`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      // Log current execution time
      const currentExecutionTime = Date.now() - startTime;
      console.log(`Total execution time so far: ${currentExecutionTime}ms`);
      
      // Send progress response if we're taking too long
      if (currentExecutionTime > MAX_EXECUTION_TIME) {
        console.log('⚠️ Approaching timeout, sending partial response');
        console.log(`Processed ${processedTests} of ${batchTestCases.length} tests in this batch`);
        break;
      }
    }

    // Calculate totals including existing results
    const totalProcessed = existingProcessedTests + processedTests;
    const totalPassed = existingPassedTests + passedTests;
    const totalAccuracySum = existingTotalAccuracy + totalAccuracy;
    const totalResponseTimeSum = existingTotalResponseTime + totalResponseTime;
    
    const hasMoreTests = endIndex < totalTests;
    const status = hasMoreTests ? 'running' : 'completed';
    
    // Update run status
    await supabase
      .from('qa_validation_runs')
      .update({
        status,
        completed_at: hasMoreTests ? null : new Date().toISOString(),
        passed_tests: totalPassed,
        overall_accuracy: totalProcessed > 0 ? totalAccuracySum / totalProcessed : 0,
        avg_response_time_ms: Math.round(totalResponseTimeSum / Math.max(totalProcessed, 1)),
      })
      .eq('id', validationRun.id);

    const executionTime = Date.now() - startTime;
    
    return new Response(JSON.stringify({
      success: true,
      validationRunId: validationRun.id,
      batchInfo: {
        startIndex,
        endIndex,
        batchSize: processedTests,
        hasMoreTests,
        nextStartIndex: hasMoreTests ? endIndex : null
      },
      totalTests,
      processedTests: totalProcessed,
      passedTests: totalPassed,
      overallAccuracy: totalProcessed > 0 ? totalAccuracySum / totalProcessed : 0,
      avgResponseTime: Math.round(totalResponseTimeSum / Math.max(totalProcessed, 1)),
      executionTime,
      totalTokensUsed,
      message: `Processed batch ${startIndex + 1}-${endIndex} of ${totalTests} tests (${processedTests} tests in ${executionTime}ms)`,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Function error:', error);
    
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Call edge function through Supabase client to avoid Edge Function to Edge Function issues
async function callEdgeFunction(
  supabase: any,
  functionName: string,
  payload: any,
  timeout: number
): Promise<any> {
  console.log(`Calling ${functionName} with payload:`, JSON.stringify(payload).substring(0, 100));
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    // Use Supabase client's invoke method which handles auth and CORS properly
    const { data, error } = await supabase.functions.invoke(functionName, {
      body: payload,
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (error) {
      throw new Error(`${functionName} error: ${error.message}`);
    }
    
    console.log(`${functionName} responded successfully`);
    return data;
    
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
      throw new Error(`Timeout after ${timeout}ms`);
    }
    
    throw error;
  }
}

// Estimate tokens (rough approximation)
function estimateTokens(text: string): number {
  // Rough estimate: 1 token per 4 characters
  return Math.ceil(text.length / 4);
}