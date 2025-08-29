// Unified QA types to prevent conflicts across components
export interface QATestCase {
  id: string | number;
  test_id?: string;
  question?: string;
  query?: string;
  expected_answer: string;
  expected_response?: string;
  expected_sql?: string;
  category: string;
  difficulty?: string | null;
  complexity?: string;
  tags?: string[];
  is_active?: boolean;
  is_sql_related?: boolean;
  version?: number;
  created_at?: string;
  updated_at?: string;
  // Additional optional fields for compatibility
  expected_keywords?: string[];
  min_response_length?: number;
  sql_complexity?: string;
}

export interface QAValidationRun {
  id: string;
  model: string;
  status: string;
  total_tests: number;
  passed_tests: number;
  overall_accuracy: number;
  avg_response_time_ms: number;
  started_at: string;
  completed_at: string;
  error_message?: string;
}

export interface QAValidationResult {
  id: string;
  test_case_id: string;
  model: string;
  actual_answer: string;
  is_correct: boolean;
  accuracy_score: number;
  response_time_ms: number;
  error_details?: string;
  error_type?: string;
  generated_sql?: string;
  sql_syntax_valid?: boolean;
  sql_result_match?: boolean;
  sql_executed?: boolean;
  created_at: string;
  session_id?: string;
  qa_test_cases?: QATestCase;
}

export interface ExecutionResult {
  runId: string;
  model: string;
  testCases: number;
  passed: number;
  accuracy: number;
  avgResponseTime: number;
  status: string;
}

export interface ValidationSummary {
  totalTestsRun: number;
  totalPassed: number;
  avgAccuracy: number;
  avgResponseTime: number;
}