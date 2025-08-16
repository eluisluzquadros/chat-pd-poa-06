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

    console.log('🧪 Starting Comprehensive QA Test - Plan Implementation');
    
    // FASE 1: Fetch ALL active test cases (not just 10)
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

    // FASE 1: Execute tests with improved evaluation
    const results: ValidationResult[] = [];
    let passedTests = 0;
    let totalAccuracy = 0;
    let totalResponseTime = 0;

    // Process in smaller batches to avoid timeouts
    const batchSize = 5;
    for (let i = 0; i < testCases.length; i += batchSize) {
      const batch = testCases.slice(i, i + batchSize);
      
      for (const testCase of batch) {
        const startTime = Date.now();
        
        try {
          // Call the agentic-rag-v2 function
          const { data: response, error: callError } = await supabase.functions.invoke('agentic-rag-v2', {
            body: {
              query: testCase.question || testCase.query,
              model: 'openai/gpt-3.5-turbo-0125',
              sessionId: `qa-test-${Date.now()}-${testCase.id}`
            }
          });

          const responseTime = Date.now() - startTime;
          
          if (callError) {
            throw new Error(`API call failed: ${callError.message}`);
          }

          const actualAnswer = response?.content || response?.message || '';
          
          // IMPROVED EVALUATION: Check keywords AND content
          const evaluation = evaluateAnswer(actualAnswer, testCase.expected_answer, testCase.expected_keywords);
          
          const result: ValidationResult = {
            test_case_id: testCase.id.toString(),
            actual_answer: actualAnswer,
            is_correct: evaluation.is_correct,
            accuracy_score: evaluation.accuracy_score,
            response_time_ms: responseTime,
            keywords_found: evaluation.keywords_found,
            keyword_accuracy: evaluation.keyword_accuracy
          };

          // Save result to database
          await supabase
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
              evaluation_reasoning: `Keywords found: ${evaluation.keywords_found.join(', ')} (${evaluation.keyword_accuracy}% accuracy)`
            });

          results.push(result);
          
          if (evaluation.is_correct) passedTests++;
          totalAccuracy += evaluation.accuracy_score;
          totalResponseTime += responseTime;

          console.log(`✅ Test ${testCase.id} (${testCase.category}): ${evaluation.is_correct ? 'PASS' : 'FAIL'} - ${evaluation.accuracy_score}% accuracy`);

        } catch (error) {
          const responseTime = Date.now() - startTime;
          
          const result: ValidationResult = {
            test_case_id: testCase.id.toString(),
            actual_answer: '',
            is_correct: false,
            accuracy_score: 0,
            response_time_ms: responseTime,
            keywords_found: [],
            keyword_accuracy: 0,
            error_details: error.message
          };

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
              error_type: 'api_error',
              error_details: error.message,
            });

          results.push(result);
          totalResponseTime += responseTime;
          
          console.log(`❌ Test ${testCase.id} ERROR: ${error.message}`);
        }

        // Update progress every test
        const progress = i + batch.indexOf(testCase) + 1;
        await supabase
          .from('qa_validation_runs')
          .update({
            passed_tests: passedTests,
            overall_accuracy: progress > 0 ? totalAccuracy / progress : 0,
            avg_response_time_ms: Math.round(totalResponseTime / progress),
            last_heartbeat: new Date().toISOString()
          })
          .eq('id', validationRun.id);
      }
    }

    // Mark as completed
    const finalAccuracy = testCases.length > 0 ? totalAccuracy / testCases.length : 0;
    await supabase
      .from('qa_validation_runs')
      .update({
        status: 'completed',
        overall_accuracy: finalAccuracy,
        completed_at: new Date().toISOString(),
      })
      .eq('id', validationRun.id);

    // Generate category breakdown
    const categoryStats = analyzeCategoryPerformance(results, testCases);

    console.log(`🎯 FINAL RESULTS: ${passedTests}/${testCases.length} passed (${finalAccuracy.toFixed(1)}% accuracy)`);

    return Response.json({
      status: 'completed',
      validation_run_id: validationRun.id,
      total_cases: testCases.length,
      passed_tests: passedTests,
      overall_accuracy: finalAccuracy,
      avg_response_time_ms: Math.round(totalResponseTime / testCases.length),
      category_breakdown: categoryStats,
      recommendations: generateRecommendations(finalAccuracy, categoryStats),
      execution_time_minutes: Math.round((Date.now() - new Date(validationRun.started_at).getTime()) / 60000)
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
                           actualLower.length < 50; // Very short responses likely indicate no data

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
    is_correct: accuracyScore >= 70, // 70% threshold for "correct"
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

function analyzeCategoryPerformance(results: ValidationResult[], testCases: QATestCase[]) {
  const categoryMap: { [key: string]: { total: number; passed: number; accuracy: number } } = {};
  
  for (const result of results) {
    const testCase = testCases.find(tc => tc.id.toString() === result.test_case_id);
    if (!testCase) continue;
    
    const category = testCase.category;
    if (!categoryMap[category]) {
      categoryMap[category] = { total: 0, passed: 0, accuracy: 0 };
    }
    
    categoryMap[category].total++;
    if (result.is_correct) categoryMap[category].passed++;
    categoryMap[category].accuracy += result.accuracy_score;
  }
  
  // Calculate averages
  for (const category in categoryMap) {
    const stats = categoryMap[category];
    stats.accuracy = stats.total > 0 ? stats.accuracy / stats.total : 0;
  }
  
  return categoryMap;
}

function generateRecommendations(overallAccuracy: number, categoryStats: any): string[] {
  const recommendations: string[] = [];
  
  if (overallAccuracy < 90) {
    recommendations.push('🎯 PRIORIDADE: Implementar melhorias para atingir 90%+ accuracy');
    
    // Find worst performing categories
    const sortedCategories = Object.entries(categoryStats)
      .sort(([,a], [,b]) => (a as any).accuracy - (b as any).accuracy)
      .slice(0, 3);
    
    for (const [category, stats] of sortedCategories) {
      const s = stats as any;
      if (s.accuracy < 70) {
        recommendations.push(`🔧 Melhorar categoria "${category}" (${s.accuracy.toFixed(1)}% accuracy)`);
      }
    }
  }
  
  if (overallAccuracy < 50) {
    recommendations.push('🚨 CRÍTICO: Revisar completamente o sistema de response-synthesizer');
    recommendations.push('🔍 Investigar queries que retornam "dados não encontrados"');
  } else if (overallAccuracy < 70) {
    recommendations.push('⚡ Otimizar roteamento de queries entre agentes especializados');
    recommendations.push('📝 Refinar expected_keywords dos casos de teste');
  } else if (overallAccuracy < 90) {
    recommendations.push('🎨 Ajustar prompts dos agentes para melhor precisão');
    recommendations.push('📊 Adicionar casos de teste para cenários edge cases');
  } else {
    recommendations.push('✅ Excelente! Manter monitoramento contínuo');
    recommendations.push('🔄 Executar validações automáticas 2x/dia');
  }
  
  return recommendations;
}