import { supabase } from "@/integrations/supabase/client";
import { removePromotionalTemplate, calculateAccuracyWithoutTemplate, normalizeText } from "@/utils/templateFilter";
import { unifiedRAGService } from "./unifiedRAGService";

interface QAValidationOptions {
  model?: string;
  models?: string[]; // Support for multiple models
  mode?: 'all' | 'selected' | 'filtered' | 'random';
  testCaseIds?: string[];
  categories?: string[];
  difficulties?: string[];
  randomCount?: number;
  includeSQL?: boolean;
  excludeSQL?: boolean;
}

interface TestCase {
  id: number;
  test_id: string;
  question: string;
  query: string;
  expected_answer: string;
  expected_keywords: string[];
  category: string;
  difficulty: string;
  is_sql_related: boolean;
}

interface ValidationResult {
  testCaseId: string;
  actualAnswer: string;
  isCorrect: boolean;
  accuracyScore: number;
  responseTime: number;
  errorType?: string;
  errorDetails?: string;
}

export class SmartQAValidator {
  private static instance: SmartQAValidator;
  
  static getInstance(): SmartQAValidator {
    if (!SmartQAValidator.instance) {
      SmartQAValidator.instance = new SmartQAValidator();
    }
    return SmartQAValidator.instance;
  }

  async runValidation(options: QAValidationOptions) {
    const { 
      model = 'anthropic/claude-3-5-sonnet-20241022',
      models = [model || 'anthropic/claude-3-5-sonnet-20241022'],
      mode = 'all',
      ...rest 
    } = options;

    console.log(`[SmartQAValidator] Using new qa-execute-validation-v2 with models:`, models);

    // Use the improved qa-execute-validation-v2 function
    const { data, error } = await supabase.functions.invoke('qa-execute-validation-v2', {
      body: {
        mode,
        models,
        categories: options.categories,
        difficulties: options.difficulties,
        randomCount: options.randomCount,
        includeSQL: options.includeSQL,
        excludeSQL: options.excludeSQL,
        selectedIds: options.testCaseIds
      }
    });

    if (error) {
      console.error('[SmartQAValidator] Error calling qa-execute-validation-v2:', error);
      throw new Error(`Validation failed: ${error.message}`);
    }

    const results = data?.results || [];
    if (results.length === 0) {
      throw new Error('No validation results returned');
    }

    // Return the first run ID (for single model) or create a summary for multiple models
    const firstResult = results[0];
    console.log(`[SmartQAValidator] Validation started with run ID: ${firstResult.runId}`);
    
    return firstResult.runId;
  }

  private async getTestCases(options: QAValidationOptions): Promise<TestCase[]> {
    let query = supabase
      .from('qa_test_cases')
      .select('*')
      .eq('is_active', true);

    if (options.mode === 'selected' && options.testCaseIds?.length) {
      const numericIds = options.testCaseIds.map(id => typeof id === 'string' ? parseInt(id) : id);
      query = query.in('id', numericIds);
    }

    if (options.categories?.length) {
      query = query.in('category', options.categories);
    }

    if (options.difficulties?.length) {
      query = query.in('difficulty', options.difficulties);
    }

    // SQL filtering
    if (options.excludeSQL) {
      query = query.eq('is_sql_related', false);
    } else if (options.includeSQL === false) {
      query = query.eq('is_sql_related', false);
    }

    const { data, error } = await query.order('created_at', { ascending: true });

    if (error || !data) {
      throw new Error('Failed to fetch test cases');
    }

    // Random selection
    if (options.mode === 'random' && options.randomCount) {
      const shuffled = [...data].sort(() => Math.random() - 0.5);
      return shuffled.slice(0, options.randomCount);
    }

    return data;
  }

  private async processTestsWithSmartEvaluation(
    testCases: TestCase[],
    validationRunId: string,
    model: string
  ) {
    let passedTests = 0;
    let totalAccuracy = 0;
    let totalResponseTime = 0;

    console.log(`[SmartQAValidator] Processing ${testCases.length} tests for validation run ${validationRunId}`);

    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      const startTime = Date.now();

      try {
        console.log(`[SmartQAValidator] Testing case ${testCase.id}: ${testCase.question?.substring(0, 50)}...`);

        // Call the RAG system
        const response = await this.callRAGSystem(testCase.question || testCase.query, model);
        
        const responseTime = Date.now() - startTime;
        const rawAnswer = response.response || response.content || '';
        
        console.log(`[SmartQAValidator] Got response for case ${testCase.id} in ${responseTime}ms`);
        
        // Enhanced evaluation with template filtering
        const result = this.evaluateAnswerIntelligently(
          rawAnswer,
          testCase
        );
        
        const accuracy = result.accuracyScore;
        const isCorrect = result.isCorrect;

        console.log(`[SmartQAValidator] Case ${testCase.id} evaluation: ${isCorrect ? 'PASS' : 'FAIL'} (accuracy: ${(accuracy * 100).toFixed(1)}%)`);

        // Save result
        await supabase
          .from('qa_validation_results')
          .insert({
            test_case_id: testCase.id.toString(),
            validation_run_id: validationRunId,
            model,
            actual_answer: result.actualAnswer.substring(0, 2000),
            is_correct: isCorrect,
            accuracy_score: accuracy,
            response_time_ms: responseTime,
            error_type: result.errorType || null,
            error_details: result.errorDetails || null,
          });

        if (isCorrect) passedTests++;
        totalAccuracy += accuracy;
        totalResponseTime += responseTime;

      } catch (error) {
        console.error(`[SmartQAValidator] Error testing case ${testCase.id}:`, error);
        
        // Determine error type
        let errorType = 'api_error';
        if (error.message?.includes('RAG system')) {
          errorType = 'rag_system_error';
        } else if (error.message?.includes('timeout') || error.message?.includes('Timeout')) {
          errorType = 'timeout_error';
        }
        
        // Save error result
        await supabase
          .from('qa_validation_results')
          .insert({
            test_case_id: testCase.id.toString(),
            validation_run_id: validationRunId,
            model,
            actual_answer: null,
            is_correct: false,
            accuracy_score: 0,
            response_time_ms: Date.now() - startTime,
            error_type: errorType,
            error_details: error.message?.substring(0, 500) || 'Unknown error',
          });
      }

      // Update progress
      const progress = Math.round(((i + 1) / testCases.length) * 100);
      console.log(`[SmartQAValidator] Progress: ${progress}% (${i + 1}/${testCases.length})`);
      
      await supabase
        .from('qa_validation_runs')
        .update({
          passed_tests: passedTests,
          overall_accuracy: (i + 1) > 0 ? totalAccuracy / (i + 1) : 0,
          avg_response_time_ms: Math.round(totalResponseTime / (i + 1)),
        })
        .eq('id', validationRunId);
    }

    // Mark as completed
    const finalAccuracy = testCases.length > 0 ? totalAccuracy / testCases.length : 0;
    console.log(`[SmartQAValidator] Validation completed. Final accuracy: ${(finalAccuracy * 100).toFixed(1)}%`);
    
    await supabase
      .from('qa_validation_runs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        last_heartbeat: new Date().toISOString(),
      })
      .eq('id', validationRunId);
  }

  private async callRAGSystem(message: string, model: string): Promise<any> {
    console.log(`[SmartQAValidator] Calling RAG system with model: ${model}`);
    
    const startTime = Date.now();
    
    try {
      // Use the unified RAG service for consistency with chat
      const result = await unifiedRAGService.testQuery(message, model);
      
      const responseTime = Date.now() - startTime;
      console.log(`[SmartQAValidator] RAG response received in ${responseTime}ms`);

      if (!result) {
        throw new Error('RAG system returned empty response');
      }

      return result;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      console.error(`[SmartQAValidator] RAG call failed after ${responseTime}ms:`, error);
      throw error;
    }
  }

  private evaluateAnswerIntelligently(
    rawAnswer: string,
    testCase: TestCase
  ): ValidationResult {
    // Remove promotional template first
    const cleanAnswer = removePromotionalTemplate(rawAnswer);
    
    console.log(`[SmartQAValidator] Evaluating answer for case ${testCase.id} (category: ${testCase.category})`);
    
    // Calculate accuracy using enhanced method
    const accuracyScore = calculateAccuracyWithoutTemplate(
      cleanAnswer,
      testCase.expected_keywords || [],
      testCase.expected_answer,
      testCase.category
    );
    
    // Determine if correct based on category-specific thresholds
    const threshold = this.getCategoryThreshold(testCase.category, testCase.difficulty);
    const isCorrect = accuracyScore >= threshold;
    
    // Detect common issues
    let errorType: string | undefined;
    let errorDetails: string | undefined;
    
    if (!isCorrect) {
      if (cleanAnswer.length < 50) {
        errorType = 'incomplete_response';
        errorDetails = 'Response too short or incomplete';
      } else if (accuracyScore < 0.2) {
        errorType = 'incorrect_content';
        errorDetails = 'Response content does not match expected answer';
      } else {
        errorType = 'accuracy_below_threshold';
        errorDetails = `Accuracy ${(accuracyScore * 100).toFixed(1)}% below threshold ${(threshold * 100).toFixed(1)}%`;
      }
    }
    
    console.log(`[SmartQAValidator] Case ${testCase.id}: accuracy=${(accuracyScore * 100).toFixed(1)}%, threshold=${(threshold * 100).toFixed(1)}%, result=${isCorrect ? 'PASS' : 'FAIL'}`);
    
    return {
      testCaseId: testCase.id.toString(),
      actualAnswer: cleanAnswer,
      isCorrect,
      accuracyScore,
      responseTime: 0, // Will be set by caller
      errorType,
      errorDetails
    };
  }

  private getCategoryThreshold(category: string, difficulty: string): number {
    // Category-specific thresholds
    const categoryThresholds: Record<string, number> = {
      'zoneamento': 0.8, // High precision needed for zoning info
      'altura_maxima': 0.9, // Very high precision for numeric values
      'uso-solo': 0.7, // Moderate precision for regulatory content
      'conceptual': 0.6, // Lower threshold for conceptual questions
      'counting': 0.9, // High precision for counting questions
      'construction': 0.7, // Moderate precision for construction rules
      'street': 0.5, // Lower threshold as these often require clarification
      'specific-zot': 0.8, // High precision for specific zone info
      'neighborhood-zots': 0.7, // Moderate precision for neighborhood info
    };
    
    // Difficulty adjustments
    const difficultyAdjustments: Record<string, number> = {
      'simple': 0.1, // Easier questions should have higher accuracy
      'medium': 0, // No adjustment
      'high': -0.1, // Harder questions get slightly lower threshold
    };
    
    const baseThreshold = categoryThresholds[category] || 0.6;
    const adjustment = difficultyAdjustments[difficulty] || 0;
    
    return Math.max(0.4, Math.min(0.95, baseThreshold + adjustment));
  }
}