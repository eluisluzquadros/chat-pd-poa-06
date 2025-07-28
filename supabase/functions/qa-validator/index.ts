import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface QATestCase {
  id: string;
  question: string;
  expected_answer: string;
  category: string;
  difficulty: string;
  tags: string[];
}

interface ValidationRequest {
  model?: string;
  testCaseIds?: string[];
  categories?: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { model = 'agentic-rag', testCaseIds, categories }: ValidationRequest = await req.json();

    // Create validation run
    const { data: validationRun, error: runError } = await supabase
      .from('qa_validation_runs')
      .insert({
        model,
        status: 'running'
      })
      .select()
      .single();

    if (runError) throw runError;

    console.log(`Starting QA validation run ${validationRun.id} for model ${model}`);

    // Get test cases to run
    let query = supabase
      .from('qa_test_cases')
      .select('*')
      .eq('is_active', true)
      .limit(10); // Limit to 10 test cases to prevent timeout

    if (testCaseIds?.length) {
      query = query.in('id', testCaseIds);
    }

    if (categories?.length) {
      query = query.in('category', categories);
    }

    const { data: testCases, error: testCasesError } = await query;
    if (testCasesError) throw testCasesError;

    console.log(`Found ${testCases.length} test cases to validate`);

    let passedTests = 0;
    const totalTests = testCases.length;
    const results = [];

    // Process test cases in batches of 3 to prevent timeouts
    const batchSize = 3;
    for (let i = 0; i < testCases.length; i += batchSize) {
      const batch = testCases.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (testCase) => {
        const startTime = Date.now();
        
        try {
          console.log(`Testing: ${testCase.question}`);

          // Call the chat model with timeout
          const modelResponse = await Promise.race([
            supabase.functions.invoke(model, {
              body: {
                message: testCase.question,
                userRole: 'admin'
              }
            }),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Model timeout')), 30000)
            )
          ]);

          const responseTime = Date.now() - startTime;
          
          if (modelResponse.error) {
            throw new Error(`Model error: ${modelResponse.error.message}`);
          }
          
          const actualAnswer = modelResponse.data?.response || '';

          // Use OpenAI to compare answers with timeout
          const comparisonResult = await Promise.race([
            compareAnswers(testCase.question, testCase.expected_answer, actualAnswer),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Comparison timeout')), 15000)
            )
          ]);

          const isCorrect = comparisonResult.accuracy >= 0.7;

          // Store result
          return {
            test_case_id: testCase.id,
            model,
            actual_answer: actualAnswer,
            is_correct: isCorrect,
            accuracy_score: comparisonResult.accuracy,
            response_time_ms: responseTime,
            error_type: comparisonResult.error_type,
            error_details: comparisonResult.error_details,
            validation_run_id: validationRun.id
          };

        } catch (error) {
          console.error(`Error testing case ${testCase.id}:`, error);
          
          return {
            test_case_id: testCase.id,
            model,
            actual_answer: '',
            is_correct: false,
            accuracy_score: 0,
            response_time_ms: Date.now() - startTime,
            error_type: 'execution_error',
            error_details: error.message,
            validation_run_id: validationRun.id
          };
        }
      });

      // Wait for batch to complete
      const batchResults = await Promise.allSettled(batchPromises);
      
      // Process batch results
      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value);
          if (result.value.is_correct) passedTests++;
          console.log(`Test ${result.value.test_case_id}: ${result.value.is_correct ? 'PASSED' : 'FAILED'} (${result.value.accuracy_score})`);
        } else {
          console.error('Batch promise rejected:', result.reason);
        }
      }
      
      // Small delay between batches to prevent overwhelming the system
      if (i + batchSize < testCases.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Insert all results
    const { error: resultsError } = await supabase
      .from('qa_validation_results')
      .insert(results);

    if (resultsError) throw resultsError;

    // Update validation run
    const overallAccuracy = totalTests > 0 ? passedTests / totalTests : 0;
    const avgResponseTime = results.reduce((sum, r) => sum + r.response_time_ms, 0) / results.length;

    const { error: updateError } = await supabase
      .from('qa_validation_runs')
      .update({
        total_tests: totalTests,
        passed_tests: passedTests,
        overall_accuracy: overallAccuracy,
        avg_response_time_ms: Math.round(avgResponseTime),
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', validationRun.id);

    if (updateError) throw updateError;

    console.log(`QA validation completed: ${passedTests}/${totalTests} passed (${(overallAccuracy * 100).toFixed(1)}%)`);

    return new Response(JSON.stringify({
      success: true,
      validationRunId: validationRun.id,
      totalTests,
      passedTests,
      overallAccuracy,
      avgResponseTime: Math.round(avgResponseTime),
      results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('QA validation error:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      details: error.stack
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function compareAnswers(question: string, expected: string, actual: string) {
  try {
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an expert QA validator. Compare the actual answer with the expected answer for the given question.

Rate the accuracy from 0.0 to 1.0 based on:
- Factual correctness
- Completeness of the answer
- Relevance to the question
- SQL correctness (if applicable)

Return a JSON object with:
{
  "accuracy": number (0.0-1.0),
  "error_type": string or null,
  "error_details": string or null,
  "explanation": string
}`
          },
          {
            role: 'user',
            content: `Question: ${question}

Expected Answer: ${expected}

Actual Answer: ${actual}

Please evaluate the accuracy:`
          }
        ],
        temperature: 0.1
      }),
    });

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    try {
      return JSON.parse(content);
    } catch {
      // Fallback parsing
      const accuracy = content.includes('1.0') ? 1.0 : 
                      content.includes('0.9') ? 0.9 :
                      content.includes('0.8') ? 0.8 :
                      content.includes('0.7') ? 0.7 :
                      content.includes('0.6') ? 0.6 : 0.5;
                      
      return {
        accuracy,
        error_type: accuracy < 0.7 ? 'low_accuracy' : null,
        error_details: accuracy < 0.7 ? 'Answer quality below threshold' : null,
        explanation: content
      };
    }

  } catch (error) {
    console.error('Answer comparison error:', error);
    return {
      accuracy: 0.0,
      error_type: 'comparison_error',
      error_details: error.message,
      explanation: 'Failed to compare answers'
    };
  }
}