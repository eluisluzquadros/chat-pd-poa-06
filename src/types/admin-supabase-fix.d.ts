// Comprehensive type fixes for admin components
declare global {
  interface SupabaseError {
    message: string;
    details?: string;
    hint?: string;
    code?: string;
  }
  
  interface SupabaseResponse<T> {
    data: T | null;
    error: SupabaseError | null;
  }
  
  interface QATestCase {
    id: any;
    test_id: string;
    question: string;
    expected_answer: string;
    expected_sql?: string;
    category: string;
    difficulty?: string;
    tags?: string[];
    is_sql_related?: boolean;
    sql_complexity?: string;
    version?: number;
    is_active?: boolean;
  }
  
  interface QAValidationRun {
    id: string;
    status: string;
    total_tests: number;
    passed_tests: number;
    error_message?: string;
    last_heartbeat?: string;
    overall_accuracy?: number;
    avg_response_time_ms?: number;
    completed_at?: string;
  }

  interface QAValidationResult {
    id: string;
    validation_run_id: string;
    test_case_id: string;
    model: string;
    is_correct: boolean;
    accuracy_score?: number;
    actual_answer: string;
    response_time_ms?: number;
    error_details?: string;
    created_at: string;
  }

  interface InterestManifestation {
    id?: string;
    full_name: string;
    email: string;
    newsletter_opt_in: boolean;
    status: string;
    account_created: boolean;
    created_at?: string;
    updated_at?: string;
  }

  interface UserAccount {
    id?: string;
    user_id?: string;
    email: string;
    full_name?: string;
    role?: string;
    created_at?: string;
    updated_at?: string;
  }
}

export {};