export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      agent_executions: {
        Row: {
          agent_type: string
          created_at: string
          error_message: string | null
          execution_time_ms: number | null
          id: string
          input_data: Json | null
          output_data: Json | null
          session_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          agent_type: string
          created_at?: string
          error_message?: string | null
          execution_time_ms?: number | null
          id?: string
          input_data?: Json | null
          output_data?: Json | null
          session_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          agent_type?: string
          created_at?: string
          error_message?: string | null
          execution_time_ms?: number | null
          id?: string
          input_data?: Json | null
          output_data?: Json | null
          session_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_executions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          created_at: string | null
          id: string
          ip_address: unknown | null
          new_values: Json | null
          old_values: Json | null
          record_id: string | null
          table_name: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      auth_attempts: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          ip_address: unknown
          success: boolean | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
          ip_address: unknown
          success?: boolean | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          ip_address?: unknown
          success?: boolean | null
        }
        Relationships: []
      }
      bairros_risco_desastre: {
        Row: {
          areas_criticas: string | null
          bairro_nome: string
          bairro_nome_normalizado: string | null
          created_at: string | null
          frequencia_anual: number | null
          id: number
          nivel_risco_deslizamento: number | null
          nivel_risco_geral: number | null
          nivel_risco_inundacao: number | null
          observacoes: string | null
          risco_alagamento: boolean | null
          risco_deslizamento: boolean | null
          risco_granizo: boolean | null
          risco_inundacao: boolean | null
          risco_vendaval: boolean | null
          ultima_ocorrencia: string | null
          updated_at: string | null
        }
        Insert: {
          areas_criticas?: string | null
          bairro_nome: string
          bairro_nome_normalizado?: string | null
          created_at?: string | null
          frequencia_anual?: number | null
          id?: number
          nivel_risco_deslizamento?: number | null
          nivel_risco_geral?: number | null
          nivel_risco_inundacao?: number | null
          observacoes?: string | null
          risco_alagamento?: boolean | null
          risco_deslizamento?: boolean | null
          risco_granizo?: boolean | null
          risco_inundacao?: boolean | null
          risco_vendaval?: boolean | null
          ultima_ocorrencia?: string | null
          updated_at?: string | null
        }
        Update: {
          areas_criticas?: string | null
          bairro_nome?: string
          bairro_nome_normalizado?: string | null
          created_at?: string | null
          frequencia_anual?: number | null
          id?: number
          nivel_risco_deslizamento?: number | null
          nivel_risco_geral?: number | null
          nivel_risco_inundacao?: number | null
          observacoes?: string | null
          risco_alagamento?: boolean | null
          risco_deslizamento?: boolean | null
          risco_granizo?: boolean | null
          risco_inundacao?: boolean | null
          risco_vendaval?: boolean | null
          ultima_ocorrencia?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      chat_history: {
        Row: {
          created_at: string
          id: string
          message: Json
          session_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: Json
          session_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: Json
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_history_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_sessions: {
        Row: {
          created_at: string
          id: string
          last_message: string | null
          model: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message?: string | null
          model?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message?: string | null
          model?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      chunk_cross_references: {
        Row: {
          confidence: number | null
          created_at: string | null
          id: string
          reference_text: string | null
          reference_type: string
          source_chunk_id: string
          target_chunk_id: string
        }
        Insert: {
          confidence?: number | null
          created_at?: string | null
          id?: string
          reference_text?: string | null
          reference_type: string
          source_chunk_id: string
          target_chunk_id: string
        }
        Update: {
          confidence?: number | null
          created_at?: string | null
          id?: string
          reference_text?: string | null
          reference_type?: string
          source_chunk_id?: string
          target_chunk_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chunk_cross_references_source_chunk_id_fkey"
            columns: ["source_chunk_id"]
            isOneToOne: false
            referencedRelation: "legal_document_chunks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chunk_cross_references_target_chunk_id_fkey"
            columns: ["target_chunk_id"]
            isOneToOne: false
            referencedRelation: "legal_document_chunks"
            referencedColumns: ["id"]
          },
        ]
      }
      document_chunks: {
        Row: {
          chunk_index: number
          content: string
          created_at: string | null
          document_id: number | null
          embedding: string | null
          id: number
          metadata: Json | null
        }
        Insert: {
          chunk_index: number
          content: string
          created_at?: string | null
          document_id?: number | null
          embedding?: string | null
          id?: number
          metadata?: Json | null
        }
        Update: {
          chunk_index?: number
          content?: string
          created_at?: string | null
          document_id?: number | null
          embedding?: string | null
          id?: number
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "document_chunks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      document_embeddings: {
        Row: {
          chunk_metadata: Json | null
          content_chunk: string
          created_at: string | null
          document_id: number | null
          embedding: string | null
          id: number
        }
        Insert: {
          chunk_metadata?: Json | null
          content_chunk: string
          created_at?: string | null
          document_id?: number | null
          embedding?: string | null
          id?: number
        }
        Update: {
          chunk_metadata?: Json | null
          content_chunk?: string
          created_at?: string | null
          document_id?: number | null
          embedding?: string | null
          id?: number
        }
        Relationships: [
          {
            foreignKeyName: "document_embeddings_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      document_metadata: {
        Row: {
          created_at: string | null
          id: string
          schema: string | null
          title: string | null
          url: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id: string
          schema?: string | null
          title?: string | null
          url?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          schema?: string | null
          title?: string | null
          url?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      document_sections: {
        Row: {
          content: string
          created_at: string | null
          embedding: string | null
          id: string
          metadata: Json | null
          updated_at: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          embedding?: string | null
          id?: string
          metadata?: Json | null
          updated_at?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          embedding?: string | null
          id?: string
          metadata?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      documents: {
        Row: {
          content: string | null
          embedding: string | null
          file_name: string | null
          file_path: string | null
          id: number
          is_processed: boolean | null
          is_public: boolean | null
          metadata: Json | null
          title: string | null
          type: string | null
          user_id: string | null
        }
        Insert: {
          content?: string | null
          embedding?: string | null
          file_name?: string | null
          file_path?: string | null
          id?: number
          is_processed?: boolean | null
          is_public?: boolean | null
          metadata?: Json | null
          title?: string | null
          type?: string | null
          user_id?: string | null
        }
        Update: {
          content?: string | null
          embedding?: string | null
          file_name?: string | null
          file_path?: string | null
          id?: number
          is_processed?: boolean | null
          is_public?: boolean | null
          metadata?: Json | null
          title?: string | null
          type?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      interest_manifestations: {
        Row: {
          account_created: boolean
          created_at: string
          email: string
          full_name: string
          id: string
          newsletter_opt_in: boolean
          status: string
          updated_at: string
        }
        Insert: {
          account_created?: boolean
          created_at?: string
          email: string
          full_name: string
          id?: string
          newsletter_opt_in?: boolean
          status?: string
          updated_at?: string
        }
        Update: {
          account_created?: boolean
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          newsletter_opt_in?: boolean
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      knowledge_graph_edges: {
        Row: {
          created_at: string | null
          id: string
          properties: Json | null
          relationship_type: string
          source_id: string
          target_id: string
          weight: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          properties?: Json | null
          relationship_type: string
          source_id: string
          target_id: string
          weight?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          properties?: Json | null
          relationship_type?: string
          source_id?: string
          target_id?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_graph_edges_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "knowledge_graph_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_graph_edges_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "knowledge_graph_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_graph_nodes: {
        Row: {
          created_at: string | null
          embedding: string | null
          id: string
          importance_score: number | null
          label: string
          node_type: string
          properties: Json | null
        }
        Insert: {
          created_at?: string | null
          embedding?: string | null
          id?: string
          importance_score?: number | null
          label: string
          node_type: string
          properties?: Json | null
        }
        Update: {
          created_at?: string | null
          embedding?: string | null
          id?: string
          importance_score?: number | null
          label?: string
          node_type?: string
          properties?: Json | null
        }
        Relationships: []
      }
      legal_document_chunks: {
        Row: {
          content: string
          created_at: string | null
          document_id: string
          embedding: string | null
          full_path: string | null
          id: string
          level: number
          level_type: string
          metadata: Json | null
          numero_artigo: number | null
          parent_chunk_id: string | null
          sequence_number: number
          title: string
        }
        Insert: {
          content: string
          created_at?: string | null
          document_id: string
          embedding?: string | null
          full_path?: string | null
          id?: string
          level: number
          level_type: string
          metadata?: Json | null
          numero_artigo?: number | null
          parent_chunk_id?: string | null
          sequence_number: number
          title: string
        }
        Update: {
          content?: string
          created_at?: string | null
          document_id?: string
          embedding?: string | null
          full_path?: string | null
          id?: string
          level?: number
          level_type?: string
          metadata?: Json | null
          numero_artigo?: number | null
          parent_chunk_id?: string | null
          sequence_number?: number
          title?: string
        }
        Relationships: []
      }
      llm_metrics: {
        Row: {
          completion_tokens: number | null
          cost: number | null
          created_at: string
          error_message: string | null
          execution_time_ms: number | null
          id: string
          metadata: Json | null
          model_name: string
          prompt_tokens: number | null
          provider: string | null
          request_type: string | null
          session_id: string | null
          success: boolean | null
          total_tokens: number | null
          user_id: string | null
        }
        Insert: {
          completion_tokens?: number | null
          cost?: number | null
          created_at?: string
          error_message?: string | null
          execution_time_ms?: number | null
          id?: string
          metadata?: Json | null
          model_name: string
          prompt_tokens?: number | null
          provider?: string | null
          request_type?: string | null
          session_id?: string | null
          success?: boolean | null
          total_tokens?: number | null
          user_id?: string | null
        }
        Update: {
          completion_tokens?: number | null
          cost?: number | null
          created_at?: string
          error_message?: string | null
          execution_time_ms?: number | null
          id?: string
          metadata?: Json | null
          model_name?: string
          prompt_tokens?: number | null
          provider?: string | null
          request_type?: string | null
          session_id?: string | null
          success?: boolean | null
          total_tokens?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      llm_model_configs: {
        Row: {
          average_latency: number | null
          capabilities: Json | null
          cost_per_input_token: number
          cost_per_output_token: number
          created_at: string | null
          id: number
          is_active: boolean | null
          max_tokens: number
          model: string
          provider: string
          updated_at: string | null
        }
        Insert: {
          average_latency?: number | null
          capabilities?: Json | null
          cost_per_input_token: number
          cost_per_output_token: number
          created_at?: string | null
          id?: number
          is_active?: boolean | null
          max_tokens: number
          model: string
          provider: string
          updated_at?: string | null
        }
        Update: {
          average_latency?: number | null
          capabilities?: Json | null
          cost_per_input_token?: number
          cost_per_output_token?: number
          created_at?: string | null
          id?: number
          is_active?: boolean | null
          max_tokens?: number
          model?: string
          provider?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      manual_qa_results: {
        Row: {
          actual_answer: string
          category: string
          expected_answer: string
          id: string
          is_correct: boolean
          notes: string | null
          question: string
          response_time_ms: number | null
          session_info: Json | null
          test_case_id: number
          tested_at: string
          tested_by: string | null
        }
        Insert: {
          actual_answer: string
          category: string
          expected_answer: string
          id?: string
          is_correct: boolean
          notes?: string | null
          question: string
          response_time_ms?: number | null
          session_info?: Json | null
          test_case_id: number
          tested_at?: string
          tested_by?: string | null
        }
        Update: {
          actual_answer?: string
          category?: string
          expected_answer?: string
          id?: string
          is_correct?: boolean
          notes?: string | null
          question?: string
          response_time_ms?: number | null
          session_info?: Json | null
          test_case_id?: number
          tested_at?: string
          tested_by?: string | null
        }
        Relationships: []
      }
      message_feedback: {
        Row: {
          comment: string | null
          created_at: string
          helpful: boolean | null
          id: string
          message_id: string
          model: string
          session_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          helpful?: boolean | null
          id?: string
          message_id: string
          model: string
          session_id: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          helpful?: boolean | null
          id?: string
          message_id?: string
          model?: string
          session_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          created_at: string | null
          feedback: Json | null
          id: string
          metadata: Json | null
          model: string | null
          role: string
          session_id: string | null
          tokens_used: number | null
        }
        Insert: {
          content: string
          created_at?: string | null
          feedback?: Json | null
          id?: string
          metadata?: Json | null
          model?: string | null
          role: string
          session_id?: string | null
          tokens_used?: number | null
        }
        Update: {
          content?: string
          created_at?: string | null
          feedback?: Json | null
          id?: string
          metadata?: Json | null
          model?: string | null
          role?: string
          session_id?: string | null
          tokens_used?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      n8n_chat_histories: {
        Row: {
          id: number
          message: Json
          session_id: string
          user_id: string | null
        }
        Insert: {
          id?: number
          message: Json
          session_id: string
          user_id?: string | null
        }
        Update: {
          id?: number
          message?: Json
          session_id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      qa_automated_reports: {
        Row: {
          all_passed: boolean
          created_at: string | null
          critical_failures: number | null
          id: string
          results: Json
          run_date: string
          scenarios_tested: number
        }
        Insert: {
          all_passed: boolean
          created_at?: string | null
          critical_failures?: number | null
          id?: string
          results: Json
          run_date: string
          scenarios_tested: number
        }
        Update: {
          all_passed?: boolean
          created_at?: string | null
          critical_failures?: number | null
          id?: string
          results?: Json
          run_date?: string
          scenarios_tested?: number
        }
        Relationships: []
      }
      qa_benchmarks: {
        Row: {
          created_at: string | null
          id: number
          metadata: Json | null
          results: Json
          summaries: Json
          timestamp: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          metadata?: Json | null
          results: Json
          summaries: Json
          timestamp?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          metadata?: Json | null
          results?: Json
          summaries?: Json
          timestamp?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      qa_learning_insights: {
        Row: {
          category: string
          confidence_score: number | null
          created_at: string | null
          id: string
          insight_data: Json
          insight_type: string
          is_applied: boolean | null
          model: string
        }
        Insert: {
          category: string
          confidence_score?: number | null
          created_at?: string | null
          id?: string
          insight_data: Json
          insight_type: string
          is_applied?: boolean | null
          model: string
        }
        Update: {
          category?: string
          confidence_score?: number | null
          created_at?: string | null
          id?: string
          insight_data?: Json
          insight_type?: string
          is_applied?: boolean | null
          model?: string
        }
        Relationships: []
      }
      qa_test_case_history: {
        Row: {
          category: string
          change_reason: string | null
          changed_at: string | null
          changed_by: string | null
          difficulty: string
          expected_answer: string
          expected_sql: string | null
          id: string
          is_sql_related: boolean | null
          question: string
          sql_complexity: string | null
          tags: string[] | null
          test_case_id: string
          version: number
        }
        Insert: {
          category: string
          change_reason?: string | null
          changed_at?: string | null
          changed_by?: string | null
          difficulty: string
          expected_answer: string
          expected_sql?: string | null
          id?: string
          is_sql_related?: boolean | null
          question: string
          sql_complexity?: string | null
          tags?: string[] | null
          test_case_id: string
          version: number
        }
        Update: {
          category?: string
          change_reason?: string | null
          changed_at?: string | null
          changed_by?: string | null
          difficulty?: string
          expected_answer?: string
          expected_sql?: string | null
          id?: string
          is_sql_related?: boolean | null
          question?: string
          sql_complexity?: string | null
          tags?: string[] | null
          test_case_id?: string
          version?: number
        }
        Relationships: []
      }
      qa_test_cases: {
        Row: {
          category: string
          complexity: string
          created_at: string | null
          difficulty: string | null
          expected_answer: string | null
          expected_keywords: string[]
          expected_sql: string | null
          id: number
          is_active: boolean | null
          is_sql_related: boolean | null
          min_response_length: number | null
          query: string
          question: string | null
          sql_complexity: string | null
          tags: string[] | null
          test_id: string
          updated_at: string | null
          version: number | null
        }
        Insert: {
          category: string
          complexity: string
          created_at?: string | null
          difficulty?: string | null
          expected_answer?: string | null
          expected_keywords: string[]
          expected_sql?: string | null
          id?: number
          is_active?: boolean | null
          is_sql_related?: boolean | null
          min_response_length?: number | null
          query: string
          question?: string | null
          sql_complexity?: string | null
          tags?: string[] | null
          test_id: string
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          category?: string
          complexity?: string
          created_at?: string | null
          difficulty?: string | null
          expected_answer?: string | null
          expected_keywords?: string[]
          expected_sql?: string | null
          id?: number
          is_active?: boolean | null
          is_sql_related?: boolean | null
          min_response_length?: number | null
          query?: string
          question?: string | null
          sql_complexity?: string | null
          tags?: string[] | null
          test_id?: string
          updated_at?: string | null
          version?: number | null
        }
        Relationships: []
      }
      qa_token_usage: {
        Row: {
          created_at: string | null
          estimated_cost: number | null
          id: string
          input_tokens: number
          model: string
          output_tokens: number
          test_case_id: string | null
          total_tokens: number
          validation_run_id: string | null
        }
        Insert: {
          created_at?: string | null
          estimated_cost?: number | null
          id?: string
          input_tokens: number
          model: string
          output_tokens: number
          test_case_id?: string | null
          total_tokens: number
          validation_run_id?: string | null
        }
        Update: {
          created_at?: string | null
          estimated_cost?: number | null
          id?: string
          input_tokens?: number
          model?: string
          output_tokens?: number
          test_case_id?: string | null
          total_tokens?: number
          validation_run_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "qa_token_usage_validation_run_id_fkey"
            columns: ["validation_run_id"]
            isOneToOne: false
            referencedRelation: "qa_validation_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qa_token_usage_validation_run_id_fkey"
            columns: ["validation_run_id"]
            isOneToOne: false
            referencedRelation: "qa_validation_token_stats"
            referencedColumns: ["validation_run_id"]
          },
        ]
      }
      qa_validation_preferences: {
        Row: {
          auto_generate_insights: boolean | null
          created_at: string | null
          default_batch_size: number | null
          default_execution_mode: string | null
          id: string
          preferred_categories: string[] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          auto_generate_insights?: boolean | null
          created_at?: string | null
          default_batch_size?: number | null
          default_execution_mode?: string | null
          id?: string
          preferred_categories?: string[] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          auto_generate_insights?: boolean | null
          created_at?: string | null
          default_batch_size?: number | null
          default_execution_mode?: string | null
          id?: string
          preferred_categories?: string[] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      qa_validation_results: {
        Row: {
          accuracy_score: number | null
          actual_answer: string
          created_at: string
          error_details: string | null
          error_type: string | null
          evaluation_reasoning: string | null
          generated_sql: string | null
          id: string
          is_correct: boolean
          model: string
          response_time_ms: number | null
          session_id: string | null
          sql_executed: boolean | null
          sql_result_match: boolean | null
          sql_syntax_valid: boolean | null
          test_case_id: string
          validation_run_id: string
        }
        Insert: {
          accuracy_score?: number | null
          actual_answer: string
          created_at?: string
          error_details?: string | null
          error_type?: string | null
          evaluation_reasoning?: string | null
          generated_sql?: string | null
          id?: string
          is_correct: boolean
          model: string
          response_time_ms?: number | null
          session_id?: string | null
          sql_executed?: boolean | null
          sql_result_match?: boolean | null
          sql_syntax_valid?: boolean | null
          test_case_id: string
          validation_run_id: string
        }
        Update: {
          accuracy_score?: number | null
          actual_answer?: string
          created_at?: string
          error_details?: string | null
          error_type?: string | null
          evaluation_reasoning?: string | null
          generated_sql?: string | null
          id?: string
          is_correct?: boolean
          model?: string
          response_time_ms?: number | null
          session_id?: string | null
          sql_executed?: boolean | null
          sql_result_match?: boolean | null
          sql_syntax_valid?: boolean | null
          test_case_id?: string
          validation_run_id?: string
        }
        Relationships: []
      }
      qa_validation_runs: {
        Row: {
          avg_response_time_ms: number | null
          completed_at: string | null
          error_message: string | null
          id: string
          last_heartbeat: string | null
          model: string
          overall_accuracy: number | null
          passed_tests: number
          started_at: string
          status: string | null
          total_tests: number
        }
        Insert: {
          avg_response_time_ms?: number | null
          completed_at?: string | null
          error_message?: string | null
          id?: string
          last_heartbeat?: string | null
          model: string
          overall_accuracy?: number | null
          passed_tests?: number
          started_at?: string
          status?: string | null
          total_tests?: number
        }
        Update: {
          avg_response_time_ms?: number | null
          completed_at?: string | null
          error_message?: string | null
          id?: string
          last_heartbeat?: string | null
          model?: string
          overall_accuracy?: number | null
          passed_tests?: number
          started_at?: string
          status?: string | null
          total_tests?: number
        }
        Relationships: []
      }
      quality_alerts: {
        Row: {
          created_at: string | null
          id: string
          issues: Json
          level: string
          metrics: Json | null
          resolved: boolean | null
          resolved_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          issues: Json
          level: string
          metrics?: Json | null
          resolved?: boolean | null
          resolved_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          issues?: Json
          level?: string
          metrics?: Json | null
          resolved?: boolean | null
          resolved_at?: string | null
        }
        Relationships: []
      }
      quality_metrics: {
        Row: {
          category: string | null
          confidence: number | null
          created_at: string | null
          has_beta_message: boolean | null
          has_table: boolean | null
          has_valid_response: boolean | null
          id: string
          query: string
          response: string | null
          response_time: number
          session_id: string
        }
        Insert: {
          category?: string | null
          confidence?: number | null
          created_at?: string | null
          has_beta_message?: boolean | null
          has_table?: boolean | null
          has_valid_response?: boolean | null
          id?: string
          query: string
          response?: string | null
          response_time: number
          session_id: string
        }
        Update: {
          category?: string | null
          confidence?: number | null
          created_at?: string | null
          has_beta_message?: boolean | null
          has_table?: boolean | null
          has_valid_response?: boolean | null
          id?: string
          query?: string
          response?: string | null
          response_time?: number
          session_id?: string
        }
        Relationships: []
      }
      query_cache: {
        Row: {
          created_at: string | null
          expires_at: string | null
          hit_count: number | null
          id: number
          last_hit: string | null
          metadata: Json | null
          query_hash: string
          query_text: string
          query_type: string | null
          response_time_ms: number | null
          result: Json
          token_count: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          hit_count?: number | null
          id?: number
          last_hit?: string | null
          metadata?: Json | null
          query_hash: string
          query_text: string
          query_type?: string | null
          response_time_ms?: number | null
          result: Json
          token_count?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          hit_count?: number | null
          id?: number
          last_hit?: string | null
          metadata?: Json | null
          query_hash?: string
          query_text?: string
          query_type?: string | null
          response_time_ms?: number | null
          result?: Json
          token_count?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      regime_urbanistico: {
        Row: {
          afastamento_frente: string | null
          afastamento_fundos: string | null
          afastamento_lateral: string | null
          afastamentos__frente: string | null
          afastamentos__fundos: string | null
          afastamentos__lateral: string | null
          afastamentos_frente: string | null
          afastamentos_fundos: string | null
          afastamentos_lateral: string | null
          altura_maxima: number | null
          altura_maxima_edificacao_isolada: string | null
          altura_mxima__edificao_isolada: string | null
          area_maxima_quarteirao: string | null
          area_minima_do_lote: string | null
          area_minima_lote: number | null
          area_minima_quarteirao: string | null
          area_publica_equip_desmembramento_t1: string | null
          area_publica_equip_desmembramento_t2: string | null
          area_publica_equip_desmembramento_t3: string | null
          area_publica_equip_fracionamento: string | null
          area_publica_equip_loteamento: string | null
          area_publica_viaria_desmembramento_t1: string | null
          area_publica_viaria_desmembramento_t2: string | null
          area_publica_viaria_desmembramento_t3: string | null
          area_publica_viaria_fracionamento: string | null
          area_publica_viaria_loteamento: string | null
          bairro: string
          coef_aproveitamento_basico: number | null
          coef_aproveitamento_maximo: number | null
          coef_basico_4d: string | null
          coef_maximo_4d: string | null
          coeficiente_de_aproveitamento__bsico: string | null
          coeficiente_de_aproveitamento__mximo: string | null
          coeficiente_de_aproveitamento_basico: string | null
          coeficiente_de_aproveitamento_maximo: string | null
          comercio_atacadista_ia1: string | null
          comercio_atacadista_ia2: string | null
          comercio_atacadista_ia3: string | null
          comercio_varejista_ia1: string | null
          comercio_varejista_ia2: string | null
          comercio_varejista_inocuo: string | null
          created_at: string | null
          densidade_habitacional: string | null
          enquadramento_desmembramento_t1: string | null
          enquadramento_desmembramento_t2: string | null
          enquadramento_desmembramento_t3: string | null
          enquadramento_fracionamento: string | null
          enquadramento_loteamento: string | null
          face_maxima_de_quarteirao: string | null
          face_maxima_quarteirao: string | null
          face_mxima_de_quarteiro: string | null
          fator_conversao_permeabilidade: string | null
          gabarito__n_de_pavimentos: string | null
          gabarito_n_de_pavimentos: string | null
          id: number
          industria_inocua: string | null
          industria_interferencia_ambiental: string | null
          mdulo_de_fracionamento: string | null
          modulo_de_fracionamento: string | null
          modulo_fracionamento: string | null
          nivel_controle_entretenimento: string | null
          observacoes: string | null
          rea_mnima_do_lote: string | null
          recuo_jardim: string | null
          regime_de_atividades: string | null
          regime_volumetrico: string | null
          servico_ia1: string | null
          servico_ia2: string | null
          servico_ia3: string | null
          servico_inocuo: string | null
          taxa_de_ocupacao: string | null
          taxa_de_ocupao: string | null
          taxa_permeabilidade_acima_1500: string | null
          taxa_permeabilidade_ate_1500: string | null
          testada_minima_do_lote: string | null
          testada_minima_lote: number | null
          testada_mnima_do_lote: string | null
          updated_at: string | null
          zona: string
        }
        Insert: {
          afastamento_frente?: string | null
          afastamento_fundos?: string | null
          afastamento_lateral?: string | null
          afastamentos__frente?: string | null
          afastamentos__fundos?: string | null
          afastamentos__lateral?: string | null
          afastamentos_frente?: string | null
          afastamentos_fundos?: string | null
          afastamentos_lateral?: string | null
          altura_maxima?: number | null
          altura_maxima_edificacao_isolada?: string | null
          altura_mxima__edificao_isolada?: string | null
          area_maxima_quarteirao?: string | null
          area_minima_do_lote?: string | null
          area_minima_lote?: number | null
          area_minima_quarteirao?: string | null
          area_publica_equip_desmembramento_t1?: string | null
          area_publica_equip_desmembramento_t2?: string | null
          area_publica_equip_desmembramento_t3?: string | null
          area_publica_equip_fracionamento?: string | null
          area_publica_equip_loteamento?: string | null
          area_publica_viaria_desmembramento_t1?: string | null
          area_publica_viaria_desmembramento_t2?: string | null
          area_publica_viaria_desmembramento_t3?: string | null
          area_publica_viaria_fracionamento?: string | null
          area_publica_viaria_loteamento?: string | null
          bairro: string
          coef_aproveitamento_basico?: number | null
          coef_aproveitamento_maximo?: number | null
          coef_basico_4d?: string | null
          coef_maximo_4d?: string | null
          coeficiente_de_aproveitamento__bsico?: string | null
          coeficiente_de_aproveitamento__mximo?: string | null
          coeficiente_de_aproveitamento_basico?: string | null
          coeficiente_de_aproveitamento_maximo?: string | null
          comercio_atacadista_ia1?: string | null
          comercio_atacadista_ia2?: string | null
          comercio_atacadista_ia3?: string | null
          comercio_varejista_ia1?: string | null
          comercio_varejista_ia2?: string | null
          comercio_varejista_inocuo?: string | null
          created_at?: string | null
          densidade_habitacional?: string | null
          enquadramento_desmembramento_t1?: string | null
          enquadramento_desmembramento_t2?: string | null
          enquadramento_desmembramento_t3?: string | null
          enquadramento_fracionamento?: string | null
          enquadramento_loteamento?: string | null
          face_maxima_de_quarteirao?: string | null
          face_maxima_quarteirao?: string | null
          face_mxima_de_quarteiro?: string | null
          fator_conversao_permeabilidade?: string | null
          gabarito__n_de_pavimentos?: string | null
          gabarito_n_de_pavimentos?: string | null
          id?: number
          industria_inocua?: string | null
          industria_interferencia_ambiental?: string | null
          mdulo_de_fracionamento?: string | null
          modulo_de_fracionamento?: string | null
          modulo_fracionamento?: string | null
          nivel_controle_entretenimento?: string | null
          observacoes?: string | null
          rea_mnima_do_lote?: string | null
          recuo_jardim?: string | null
          regime_de_atividades?: string | null
          regime_volumetrico?: string | null
          servico_ia1?: string | null
          servico_ia2?: string | null
          servico_ia3?: string | null
          servico_inocuo?: string | null
          taxa_de_ocupacao?: string | null
          taxa_de_ocupao?: string | null
          taxa_permeabilidade_acima_1500?: string | null
          taxa_permeabilidade_ate_1500?: string | null
          testada_minima_do_lote?: string | null
          testada_minima_lote?: number | null
          testada_mnima_do_lote?: string | null
          updated_at?: string | null
          zona: string
        }
        Update: {
          afastamento_frente?: string | null
          afastamento_fundos?: string | null
          afastamento_lateral?: string | null
          afastamentos__frente?: string | null
          afastamentos__fundos?: string | null
          afastamentos__lateral?: string | null
          afastamentos_frente?: string | null
          afastamentos_fundos?: string | null
          afastamentos_lateral?: string | null
          altura_maxima?: number | null
          altura_maxima_edificacao_isolada?: string | null
          altura_mxima__edificao_isolada?: string | null
          area_maxima_quarteirao?: string | null
          area_minima_do_lote?: string | null
          area_minima_lote?: number | null
          area_minima_quarteirao?: string | null
          area_publica_equip_desmembramento_t1?: string | null
          area_publica_equip_desmembramento_t2?: string | null
          area_publica_equip_desmembramento_t3?: string | null
          area_publica_equip_fracionamento?: string | null
          area_publica_equip_loteamento?: string | null
          area_publica_viaria_desmembramento_t1?: string | null
          area_publica_viaria_desmembramento_t2?: string | null
          area_publica_viaria_desmembramento_t3?: string | null
          area_publica_viaria_fracionamento?: string | null
          area_publica_viaria_loteamento?: string | null
          bairro?: string
          coef_aproveitamento_basico?: number | null
          coef_aproveitamento_maximo?: number | null
          coef_basico_4d?: string | null
          coef_maximo_4d?: string | null
          coeficiente_de_aproveitamento__bsico?: string | null
          coeficiente_de_aproveitamento__mximo?: string | null
          coeficiente_de_aproveitamento_basico?: string | null
          coeficiente_de_aproveitamento_maximo?: string | null
          comercio_atacadista_ia1?: string | null
          comercio_atacadista_ia2?: string | null
          comercio_atacadista_ia3?: string | null
          comercio_varejista_ia1?: string | null
          comercio_varejista_ia2?: string | null
          comercio_varejista_inocuo?: string | null
          created_at?: string | null
          densidade_habitacional?: string | null
          enquadramento_desmembramento_t1?: string | null
          enquadramento_desmembramento_t2?: string | null
          enquadramento_desmembramento_t3?: string | null
          enquadramento_fracionamento?: string | null
          enquadramento_loteamento?: string | null
          face_maxima_de_quarteirao?: string | null
          face_maxima_quarteirao?: string | null
          face_mxima_de_quarteiro?: string | null
          fator_conversao_permeabilidade?: string | null
          gabarito__n_de_pavimentos?: string | null
          gabarito_n_de_pavimentos?: string | null
          id?: number
          industria_inocua?: string | null
          industria_interferencia_ambiental?: string | null
          mdulo_de_fracionamento?: string | null
          modulo_de_fracionamento?: string | null
          modulo_fracionamento?: string | null
          nivel_controle_entretenimento?: string | null
          observacoes?: string | null
          rea_mnima_do_lote?: string | null
          recuo_jardim?: string | null
          regime_de_atividades?: string | null
          regime_volumetrico?: string | null
          servico_ia1?: string | null
          servico_ia2?: string | null
          servico_ia3?: string | null
          servico_inocuo?: string | null
          taxa_de_ocupacao?: string | null
          taxa_de_ocupao?: string | null
          taxa_permeabilidade_acima_1500?: string | null
          taxa_permeabilidade_ate_1500?: string | null
          testada_minima_do_lote?: string | null
          testada_minima_lote?: number | null
          testada_mnima_do_lote?: string | null
          updated_at?: string | null
          zona?: string
        }
        Relationships: []
      }
      secrets: {
        Row: {
          created_at: string | null
          id: number
          name: string
          updated_at: string | null
          value: string
        }
        Insert: {
          created_at?: string | null
          id?: number
          name: string
          updated_at?: string | null
          value: string
        }
        Update: {
          created_at?: string | null
          id?: number
          name?: string
          updated_at?: string | null
          value?: string
        }
        Relationships: []
      }
      session_memory: {
        Row: {
          agent_results: Json | null
          confidence: number | null
          context: Json | null
          created_at: string | null
          id: string
          metadata: Json | null
          query: string
          response: string | null
          session_id: string
          turn_number: number
          updated_at: string | null
        }
        Insert: {
          agent_results?: Json | null
          confidence?: number | null
          context?: Json | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          query: string
          response?: string | null
          session_id: string
          turn_number: number
          updated_at?: string | null
        }
        Update: {
          agent_results?: Json | null
          confidence?: number | null
          context?: Json | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          query?: string
          response?: string | null
          session_id?: string
          turn_number?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      sessions: {
        Row: {
          created_at: string | null
          id: string
          metadata: Json | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          metadata?: Json | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          metadata?: Json | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      sql_validation_logs: {
        Row: {
          confidence: number | null
          created_at: string | null
          id: string
          is_valid: boolean | null
          issues: string[] | null
          query_text: string
          query_type: string | null
          recommendations: string[] | null
          record_count: number | null
          should_alert: boolean | null
          table_used: string | null
        }
        Insert: {
          confidence?: number | null
          created_at?: string | null
          id?: string
          is_valid?: boolean | null
          issues?: string[] | null
          query_text: string
          query_type?: string | null
          recommendations?: string[] | null
          record_count?: number | null
          should_alert?: boolean | null
          table_used?: string | null
        }
        Update: {
          confidence?: number | null
          created_at?: string | null
          id?: string
          is_valid?: boolean | null
          issues?: string[] | null
          query_text?: string
          query_type?: string | null
          recommendations?: string[] | null
          record_count?: number | null
          should_alert?: boolean | null
          table_used?: string | null
        }
        Relationships: []
      }
      table_coverage_reports: {
        Row: {
          alert_level: string | null
          created_at: string | null
          id: string
          report_data: Json
          total_queries: number | null
        }
        Insert: {
          alert_level?: string | null
          created_at?: string | null
          id?: string
          report_data: Json
          total_queries?: number | null
        }
        Update: {
          alert_level?: string | null
          created_at?: string | null
          id?: string
          report_data?: Json
          total_queries?: number | null
        }
        Relationships: []
      }
      token_usage: {
        Row: {
          created_at: string
          estimated_cost: number
          id: string
          input_tokens: number
          message_content_preview: string | null
          model: string
          output_tokens: number
          session_id: string | null
          total_tokens: number
          user_id: string
        }
        Insert: {
          created_at?: string
          estimated_cost?: number
          id?: string
          input_tokens?: number
          message_content_preview?: string | null
          model: string
          output_tokens?: number
          session_id?: string | null
          total_tokens?: number
          user_id: string
        }
        Update: {
          created_at?: string
          estimated_cost?: number
          id?: string
          input_tokens?: number
          message_content_preview?: string | null
          model?: string
          output_tokens?: number
          session_id?: string | null
          total_tokens?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "token_usage_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_accounts: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          is_active: boolean
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          is_active?: boolean
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          is_active?: boolean
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_feedback: {
        Row: {
          categories: string[] | null
          comment: string | null
          created_at: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          rating: string | null
          session_id: string | null
        }
        Insert: {
          categories?: string[] | null
          comment?: string | null
          created_at?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          rating?: string | null
          session_id?: string | null
        }
        Update: {
          categories?: string[] | null
          comment?: string | null
          created_at?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          rating?: string | null
          session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_feedback_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_feedback_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_queries: {
        Row: {
          confidence_score: number | null
          created_at: string | null
          entities: Json | null
          id: string
          intent: string | null
          normalized_query: string | null
          query: string
          session_id: string | null
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string | null
          entities?: Json | null
          id?: string
          intent?: string | null
          normalized_query?: string | null
          query: string
          session_id?: string | null
        }
        Update: {
          confidence_score?: number | null
          created_at?: string | null
          entities?: Json | null
          id?: string
          intent?: string | null
          normalized_query?: string | null
          query?: string
          session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_queries_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      validation_cache: {
        Row: {
          confidence: number | null
          created_at: string | null
          expires_at: string | null
          id: string
          query_hash: string
          validation_result: Json
        }
        Insert: {
          confidence?: number | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          query_hash: string
          validation_result: Json
        }
        Update: {
          confidence?: number | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          query_hash?: string
          validation_result?: Json
        }
        Relationships: []
      }
      zots_bairros: {
        Row: {
          bairro: string
          created_at: string | null
          id: number
          tem_zona_especial: string | null
          total_zonas_no_bairro: number | null
          updated_at: string | null
          zona: string
        }
        Insert: {
          bairro: string
          created_at?: string | null
          id?: number
          tem_zona_especial?: string | null
          total_zonas_no_bairro?: number | null
          updated_at?: string | null
          zona: string
        }
        Update: {
          bairro?: string
          created_at?: string | null
          id?: number
          tem_zona_especial?: string | null
          total_zonas_no_bairro?: number | null
          updated_at?: string | null
          zona?: string
        }
        Relationships: []
      }
    }
    Views: {
      benchmark_analysis: {
        Row: {
          avg_cost_per_query: number | null
          avg_quality_score: number | null
          avg_response_time: number | null
          model: string | null
          provider: string | null
          recommendation: string | null
          success_rate: number | null
          timestamp: string | null
          total_cost: number | null
        }
        Relationships: []
      }
      cache_statistics: {
        Row: {
          active_entries: number | null
          avg_hits: number | null
          avg_response_time: number | null
          cached_hits: number | null
          expired_entries: number | null
          max_hits: number | null
          query_types: number | null
          total_entries: number | null
        }
        Relationships: []
      }
      cost_projections: {
        Row: {
          avg_daily_cost: number | null
          avg_daily_queries: number | null
          avg_daily_tokens: number | null
          avg_daily_users: number | null
          avg_queries_per_user: number | null
          projected_monthly_cost: number | null
          projected_yearly_cost: number | null
          user_projections: Json | null
        }
        Relationships: []
      }
      feedback_statistics: {
        Row: {
          comments_count: number | null
          date: string | null
          negative_feedback: number | null
          positive_feedback: number | null
          satisfaction_rate: number | null
          total_feedback: number | null
          unique_sessions: number | null
        }
        Relationships: []
      }
      model_feedback_stats: {
        Row: {
          comments_count: number | null
          model: string | null
          satisfaction_rate: number | null
          total_feedback: number | null
        }
        Relationships: []
      }
      qa_quality_monitoring: {
        Row: {
          alert_status: string | null
          hour: string | null
          low_quality_runs: number | null
          negative_feedback: number | null
          positive_feedback: number | null
          qa_accuracy: number | null
          qa_runs: number | null
          user_satisfaction_rate: number | null
        }
        Relationships: []
      }
      qa_validation_token_stats: {
        Row: {
          avg_cost_per_test: number | null
          completed_at: string | null
          model: string | null
          overall_accuracy: number | null
          passed_tests: number | null
          started_at: string | null
          total_estimated_cost: number | null
          total_input_tokens: number | null
          total_output_tokens: number | null
          total_tests: number | null
          total_tokens: number | null
          validation_run_id: string | null
        }
        Relationships: []
      }
      quality_metrics_daily: {
        Row: {
          avg_confidence: number | null
          avg_response_time: number | null
          beta_rate: number | null
          date: string | null
          total_queries: number | null
          unique_sessions: number | null
          valid_response_rate: number | null
        }
        Relationships: []
      }
      quality_metrics_hourly: {
        Row: {
          avg_confidence: number | null
          avg_response_time: number | null
          beta_rate: number | null
          category: string | null
          hour: string | null
          total_queries: number | null
          unique_sessions: number | null
        }
        Relationships: []
      }
      token_usage_summary: {
        Row: {
          message_count: number | null
          model: string | null
          total_cost: number | null
          total_input_tokens: number | null
          total_output_tokens: number | null
          total_tokens: number | null
          usage_date: string | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      add_to_cache: {
        Args: { p_query_text: string; p_query_type: string; p_result: Json }
        Returns: undefined
      }
      binary_quantize: {
        Args: { "": string } | { "": unknown }
        Returns: unknown
      }
      cache_regime_query: {
        Args: { p_bairro?: string; p_zona?: string }
        Returns: Json
      }
      check_auth_rate_limit: {
        Args: {
          max_attempts?: number
          user_ip: unknown
          window_minutes?: number
        }
        Returns: boolean
      }
      check_quality_thresholds: {
        Args: Record<PropertyKey, never>
        Returns: {
          current_value: number
          metric_name: string
          status: string
          threshold_value: number
        }[]
      }
      clean_expired_cache: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      convert_string_to_vector: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      execute_sql_query: {
        Args: { query_text: string }
        Returns: Json
      }
      fast_regime_lookup_simple: {
        Args: { p_bairro?: string; p_zona?: string }
        Returns: {
          afastamento_frente: string | null
          afastamento_fundos: string | null
          afastamento_lateral: string | null
          afastamentos__frente: string | null
          afastamentos__fundos: string | null
          afastamentos__lateral: string | null
          afastamentos_frente: string | null
          afastamentos_fundos: string | null
          afastamentos_lateral: string | null
          altura_maxima: number | null
          altura_maxima_edificacao_isolada: string | null
          altura_mxima__edificao_isolada: string | null
          area_maxima_quarteirao: string | null
          area_minima_do_lote: string | null
          area_minima_lote: number | null
          area_minima_quarteirao: string | null
          area_publica_equip_desmembramento_t1: string | null
          area_publica_equip_desmembramento_t2: string | null
          area_publica_equip_desmembramento_t3: string | null
          area_publica_equip_fracionamento: string | null
          area_publica_equip_loteamento: string | null
          area_publica_viaria_desmembramento_t1: string | null
          area_publica_viaria_desmembramento_t2: string | null
          area_publica_viaria_desmembramento_t3: string | null
          area_publica_viaria_fracionamento: string | null
          area_publica_viaria_loteamento: string | null
          bairro: string
          coef_aproveitamento_basico: number | null
          coef_aproveitamento_maximo: number | null
          coef_basico_4d: string | null
          coef_maximo_4d: string | null
          coeficiente_de_aproveitamento__bsico: string | null
          coeficiente_de_aproveitamento__mximo: string | null
          coeficiente_de_aproveitamento_basico: string | null
          coeficiente_de_aproveitamento_maximo: string | null
          comercio_atacadista_ia1: string | null
          comercio_atacadista_ia2: string | null
          comercio_atacadista_ia3: string | null
          comercio_varejista_ia1: string | null
          comercio_varejista_ia2: string | null
          comercio_varejista_inocuo: string | null
          created_at: string | null
          densidade_habitacional: string | null
          enquadramento_desmembramento_t1: string | null
          enquadramento_desmembramento_t2: string | null
          enquadramento_desmembramento_t3: string | null
          enquadramento_fracionamento: string | null
          enquadramento_loteamento: string | null
          face_maxima_de_quarteirao: string | null
          face_maxima_quarteirao: string | null
          face_mxima_de_quarteiro: string | null
          fator_conversao_permeabilidade: string | null
          gabarito__n_de_pavimentos: string | null
          gabarito_n_de_pavimentos: string | null
          id: number
          industria_inocua: string | null
          industria_interferencia_ambiental: string | null
          mdulo_de_fracionamento: string | null
          modulo_de_fracionamento: string | null
          modulo_fracionamento: string | null
          nivel_controle_entretenimento: string | null
          observacoes: string | null
          rea_mnima_do_lote: string | null
          recuo_jardim: string | null
          regime_de_atividades: string | null
          regime_volumetrico: string | null
          servico_ia1: string | null
          servico_ia2: string | null
          servico_ia3: string | null
          servico_inocuo: string | null
          taxa_de_ocupacao: string | null
          taxa_de_ocupao: string | null
          taxa_permeabilidade_acima_1500: string | null
          taxa_permeabilidade_ate_1500: string | null
          testada_minima_do_lote: string | null
          testada_minima_lote: number | null
          testada_mnima_do_lote: string | null
          updated_at: string | null
          zona: string
        }[]
      }
      get_best_model_for_query: {
        Args: { priority?: string; query_type: string }
        Returns: {
          model: string
          provider: string
          score: number
        }[]
      }
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_from_cache: {
        Args: { p_query_text: string }
        Returns: Json
      }
      get_riscos_bairro: {
        Args: { nome_bairro: string }
        Returns: {
          bairro: string
          descricao_riscos: string
          nivel_risco: number
          riscos_ativos: string[]
        }[]
      }
      get_session_feedback_summary: {
        Args: { p_session_id: string }
        Returns: {
          messages_with_feedback: number
          negative_feedback: number
          positive_feedback: number
          satisfaction_rate: number
          total_messages: number
        }[]
      }
      gtrgm_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_decompress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_options: {
        Args: { "": unknown }
        Returns: undefined
      }
      gtrgm_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      halfvec_avg: {
        Args: { "": number[] }
        Returns: unknown
      }
      halfvec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      halfvec_send: {
        Args: { "": unknown }
        Returns: string
      }
      halfvec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      hnsw_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_sparsevec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnswhandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      hybrid_search: {
        Args: {
          match_count?: number
          match_threshold?: number
          query_embedding: string
          query_text: string
        }
        Returns: {
          content: string
          id: string
          metadata: Json
          rank: number
          similarity: number
        }[]
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_supervisor_or_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      ivfflat_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflat_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflathandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      l2_norm: {
        Args: { "": unknown } | { "": unknown }
        Returns: number
      }
      l2_normalize: {
        Args: { "": string } | { "": unknown } | { "": unknown }
        Returns: unknown
      }
      log_user_action: {
        Args: {
          action_name: string
          new_values?: Json
          old_values?: Json
          record_id?: string
          table_name?: string
        }
        Returns: undefined
      }
      match_document_sections: {
        Args: {
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          content: string
          id: string
          metadata: Json
          similarity: number
        }[]
      }
      match_documents: {
        Args:
          | { filter?: Json; match_count?: number; query_embedding: string }
          | { match_count: number; query_embedding: string }
          | {
              match_count?: number
              match_threshold?: number
              query_embedding: string
            }
        Returns: {
          chunk_metadata: Json
          content_chunk: string
          document_id: number
          similarity: number
        }[]
      }
      match_embeddings: {
        Args: {
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          content: string
          document_id: number
          id: number
          similarity: number
        }[]
      }
      match_hierarchical_documents: {
        Args: {
          match_count: number
          query_embedding: string
          query_text?: string
        }
        Returns: {
          boosted_score: number
          chunk_metadata: Json
          content_chunk: string
          document_id: number
          similarity: number
        }[]
      }
      run_comprehensive_qa_test: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      search_content_by_similarity: {
        Args: { match_count?: number; search_query: string }
        Returns: {
          content: string
          document_id: number
          similarity: number
        }[]
      }
      search_regime_urbanistico: {
        Args: { search_bairro?: string; search_zona?: string }
        Returns: {
          altura_maxima: number
          area_minima_lote: number
          bairro: string
          coef_aproveitamento_basico: number
          coef_aproveitamento_maximo: number
          id: number
          testada_minima_lote: number
          zona: string
        }[]
      }
      search_zots_by_bairro: {
        Args: { search_bairro: string }
        Returns: {
          bairro: string
          tem_zona_especial: string
          total_zonas_no_bairro: number
          zona: string
        }[]
      }
      set_limit: {
        Args: { "": number }
        Returns: number
      }
      show_limit: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      show_trgm: {
        Args: { "": string }
        Returns: string[]
      }
      sparsevec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      sparsevec_send: {
        Args: { "": unknown }
        Returns: string
      }
      sparsevec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      update_chunk_metadata: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      update_document_embedding: {
        Args: { doc_id: string; new_embedding: number[] }
        Returns: undefined
      }
      vector_avg: {
        Args: { "": number[] }
        Returns: string
      }
      vector_dims: {
        Args: { "": string } | { "": unknown }
        Returns: number
      }
      vector_norm: {
        Args: { "": string }
        Returns: number
      }
      vector_out: {
        Args: { "": string }
        Returns: unknown
      }
      vector_send: {
        Args: { "": string }
        Returns: string
      }
      vector_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
    }
    Enums: {
      app_role: "admin" | "supervisor" | "user" | "analyst"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "supervisor", "user", "analyst"],
    },
  },
} as const
