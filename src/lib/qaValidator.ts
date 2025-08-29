import { supabase } from "@/integrations/supabase/client";

interface QAValidationOptions {
  model?: string;
  mode?: 'all' | 'selected' | 'filtered' | 'random';
  testCaseIds?: string[];
  categories?: string[];
  difficulties?: string[];
  randomCount?: number;
  includeSQL?: boolean;
  excludeSQL?: boolean;
}

export class QAValidator {
  private static instance: QAValidator;
  
  static getInstance(): QAValidator {
    if (!QAValidator.instance) {
      QAValidator.instance = new QAValidator();
    }
    return QAValidator.instance;
  }

  async runValidation(options: QAValidationOptions) {
    const { 
      model = 'agentic-rag',
      mode = 'all',
      ...rest 
    } = options;

    // Get test cases to validate
    const testCases = await this.getTestCases(options);
    if (testCases.length === 0) {
      throw new Error('No test cases found');
    }

    // Create validation run
    const { data: validationRun, error: createError } = await supabase
      .from('qa_validation_runs')
      .insert({
        model,
        status: 'running',
        total_tests: testCases.length,
        passed_tests: 0,
        overall_accuracy: 0,
        avg_response_time_ms: 0,
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (createError || !validationRun) {
      throw new Error('Failed to create validation run');
    }

    // Process tests one by one
    await this.processTestsSequentially(testCases, validationRun.id, model);

    return validationRun.id;
  }

  private async getTestCases(options: QAValidationOptions) {
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

  private async processTestsSequentially(
    testCases: any[],
    validationRunId: string,
    model: string
  ) {
    let passedTests = 0;
    let totalAccuracy = 0;
    let totalResponseTime = 0;

    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      const startTime = Date.now();

      try {
        // Call the main chat through its public endpoint
        const response = await this.callMainChat(testCase.question, model);
        
        const responseTime = Date.now() - startTime;
        const answer = response.content || '';
        
        // Compare answers
        const isCorrect = this.evaluateAnswer(
          answer,
          testCase.expected_answer
        );
        
        const accuracy = isCorrect ? 1 : 0;

        // Save result
        await supabase
          .from('qa_validation_results')
          .insert({
            test_case_id: testCase.id,
            validation_run_id: validationRunId,
            model,
            actual_answer: answer,
            is_correct: isCorrect,
            accuracy_score: accuracy,
            response_time_ms: responseTime,
            error_type: null,
            error_details: null,
          });

        if (isCorrect) passedTests++;
        totalAccuracy += accuracy;
        totalResponseTime += responseTime;

      } catch (error) {
        // Save error result
        await supabase
          .from('qa_validation_results')
          .insert({
            test_case_id: testCase.id,
            validation_run_id: validationRunId,
            model,
            actual_answer: null,
            is_correct: false,
            accuracy_score: 0,
            response_time_ms: Date.now() - startTime,
            error_type: 'api_error',
            error_details: error.message,
          });
      }

      // Update progress
      const progress = Math.round(((i + 1) / testCases.length) * 100);
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
    await supabase
      .from('qa_validation_runs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', validationRunId);
  }

  private async callMainChat(message: string, model: string): Promise<any> {
    // Map model names to edge function names
    const modelToFunction: Record<string, string> = {
      'agentic-rag': 'agentic-rag',
      'claude-chat': 'claude-chat',
      'gemini-chat': 'gemini-chat',
      'llama-chat': 'llama-chat',
      'deepseek-chat': 'deepseek-chat',
      'groq-chat': 'groq-chat',
    };

    const functionName = modelToFunction[model] || 'agentic-rag';

    // Call through Supabase client to avoid Edge Function to Edge Function issues
    const { data, error } = await supabase.functions.invoke(functionName, {
      body: {
        message,
        userRole: 'user',
        sessionId: `qa-test-${Date.now()}`,
        userId: 'qa-validator'
      }
    });

    if (error) {
      throw error;
    }

    return data;
  }

  private evaluateAnswer(actual: string, expected: string): boolean {
    // This method is deprecated - use SmartQAValidator instead
    console.warn('[QAValidator] Using deprecated evaluation method. Consider using SmartQAValidator for better accuracy.');
    
    const actualLower = actual.toLowerCase().trim();
    const expectedLower = expected.toLowerCase().trim();

    // Direct match
    if (actualLower.includes(expectedLower) || expectedLower.includes(actualLower)) {
      return true;
    }

    // Word overlap check
    const actualWords = actualLower.split(/\s+/);
    const expectedWords = expectedLower.split(/\s+/);
    const commonWords = actualWords.filter(word => 
      expectedWords.some(expWord => word.includes(expWord) || expWord.includes(word))
    ).length;

    return commonWords / expectedWords.length > 0.5;
  }
}