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
      agent_knowledge_bases: {
        Row: {
          agent_id: string
          created_at: string
          id: string
          is_active: boolean
          knowledge_base_id: string
          priority: number
        }
        Insert: {
          agent_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          knowledge_base_id: string
          priority?: number
        }
        Update: {
          agent_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          knowledge_base_id?: string
          priority?: number
        }
        Relationships: [
          {
            foreignKeyName: "agent_knowledge_bases_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "dify_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_knowledge_bases_knowledge_base_id_fkey"
            columns: ["knowledge_base_id"]
            isOneToOne: false
            referencedRelation: "external_knowledge_bases"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_performance_metrics: {
        Row: {
          agent_type: string
          confidence: number | null
          created_at: string | null
          data_sources_used: string[] | null
          error_message: string | null
          execution_time: number | null
          id: number
          query_context: Json | null
          records_processed: number | null
          success: boolean | null
        }
        Insert: {
          agent_type: string
          confidence?: number | null
          created_at?: string | null
          data_sources_used?: string[] | null
          error_message?: string | null
          execution_time?: number | null
          id?: number
          query_context?: Json | null
          records_processed?: number | null
          success?: boolean | null
        }
        Update: {
          agent_type?: string
          confidence?: number | null
          created_at?: string | null
          data_sources_used?: string[] | null
          error_message?: string | null
          execution_time?: number | null
          id?: number
          query_context?: Json | null
          records_processed?: number | null
          success?: boolean | null
        }
        Relationships: []
      }
      agentic_query_cache: {
        Row: {
          agent_results: Json | null
          confidence: number | null
          created_at: string | null
          execution_time: number | null
          expires_at: string | null
          final_response: string | null
          hit_count: number | null
          id: number
          original_query: string
          query_context: Json | null
          query_hash: string
          sources: Json | null
          updated_at: string | null
        }
        Insert: {
          agent_results?: Json | null
          confidence?: number | null
          created_at?: string | null
          execution_time?: number | null
          expires_at?: string | null
          final_response?: string | null
          hit_count?: number | null
          id?: number
          original_query: string
          query_context?: Json | null
          query_hash: string
          sources?: Json | null
          updated_at?: string | null
        }
        Update: {
          agent_results?: Json | null
          confidence?: number | null
          created_at?: string | null
          execution_time?: number | null
          expires_at?: string | null
          final_response?: string | null
          hit_count?: number | null
          id?: number
          original_query?: string
          query_context?: Json | null
          query_hash?: string
          sources?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      article_anexo_references: {
        Row: {
          anexo_id: number | null
          article_number: number
          created_at: string | null
          document_type: string
          id: number
          reference_type: string | null
        }
        Insert: {
          anexo_id?: number | null
          article_number: number
          created_at?: string | null
          document_type: string
          id?: number
          reference_type?: string | null
        }
        Update: {
          anexo_id?: number | null
          article_number?: number
          created_at?: string | null
          document_type?: string
          id?: number
          reference_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "article_anexo_references_anexo_id_fkey"
            columns: ["anexo_id"]
            isOneToOne: false
            referencedRelation: "legal_anexos"
            referencedColumns: ["id"]
          },
        ]
      }
      article_metadata: {
        Row: {
          alinea_count: number | null
          article_number: number
          created_at: string | null
          document_type: string
          has_alineas: boolean | null
          has_incisos: boolean | null
          has_paragraphs: boolean | null
          id: number
          inciso_count: number | null
          metadata: Json | null
          paragraph_count: number | null
        }
        Insert: {
          alinea_count?: number | null
          article_number: number
          created_at?: string | null
          document_type: string
          has_alineas?: boolean | null
          has_incisos?: boolean | null
          has_paragraphs?: boolean | null
          id?: number
          inciso_count?: number | null
          metadata?: Json | null
          paragraph_count?: number | null
        }
        Update: {
          alinea_count?: number | null
          article_number?: number
          created_at?: string | null
          document_type?: string
          has_alineas?: boolean | null
          has_incisos?: boolean | null
          has_paragraphs?: boolean | null
          id?: number
          inciso_count?: number | null
          metadata?: Json | null
          paragraph_count?: number | null
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          created_at: string | null
          id: string
          ip_address: unknown
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
          ip_address?: unknown
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
          ip_address?: unknown
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
      benchmark_v3_results: {
        Row: {
          avg_cost_per_query: number | null
          avg_quality_score: number | null
          avg_response_time: number | null
          benchmark_session_id: string
          created_at: string | null
          historical_comparison: Json | null
          id: string
          model: string
          optimization_suggestions: Json | null
          passed_tests: number
          performance_metrics: Json | null
          provider: string
          success_rate: number | null
          test_category: string
          total_tests: number
          trend_analysis: Json | null
          updated_at: string | null
        }
        Insert: {
          avg_cost_per_query?: number | null
          avg_quality_score?: number | null
          avg_response_time?: number | null
          benchmark_session_id: string
          created_at?: string | null
          historical_comparison?: Json | null
          id?: string
          model: string
          optimization_suggestions?: Json | null
          passed_tests?: number
          performance_metrics?: Json | null
          provider: string
          success_rate?: number | null
          test_category: string
          total_tests?: number
          trend_analysis?: Json | null
          updated_at?: string | null
        }
        Update: {
          avg_cost_per_query?: number | null
          avg_quality_score?: number | null
          avg_response_time?: number | null
          benchmark_session_id?: string
          created_at?: string | null
          historical_comparison?: Json | null
          id?: string
          model?: string
          optimization_suggestions?: Json | null
          passed_tests?: number
          performance_metrics?: Json | null
          provider?: string
          success_rate?: number | null
          test_category?: string
          total_tests?: number
          trend_analysis?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      chat_history: {
        Row: {
          created_at: string
          id: string
          message: Json
          metadata: Json | null
          session_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: Json
          metadata?: Json | null
          session_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: Json
          metadata?: Json | null
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
      chat_memory: {
        Row: {
          assistant_response: string
          created_at: string | null
          id: number
          metadata: Json | null
          session_id: string
          timestamp: string | null
          user_message: string
        }
        Insert: {
          assistant_response: string
          created_at?: string | null
          id?: number
          metadata?: Json | null
          session_id: string
          timestamp?: string | null
          user_message: string
        }
        Update: {
          assistant_response?: string
          created_at?: string | null
          id?: number
          metadata?: Json | null
          session_id?: string
          timestamp?: string | null
          user_message?: string
        }
        Relationships: []
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
      cookie_preferences: {
        Row: {
          analytics_cookies: boolean | null
          created_at: string | null
          essential_cookies: boolean | null
          functional_cookies: boolean | null
          id: string
          session_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          analytics_cookies?: boolean | null
          created_at?: string | null
          essential_cookies?: boolean | null
          functional_cookies?: boolean | null
          id?: string
          session_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          analytics_cookies?: boolean | null
          created_at?: string | null
          essential_cookies?: boolean | null
          functional_cookies?: boolean | null
          id?: string
          session_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      data_consistency_log: {
        Row: {
          check_type: string
          created_at: string | null
          details: Json
          id: string
          resolved: boolean | null
        }
        Insert: {
          check_type: string
          created_at?: string | null
          details: Json
          id?: string
          resolved?: boolean | null
        }
        Update: {
          check_type?: string
          created_at?: string | null
          details?: Json
          id?: string
          resolved?: boolean | null
        }
        Relationships: []
      }
      debug_logs: {
        Row: {
          component: string
          created_at: string | null
          id: string
          level: string
          message: string
          metadata: Json | null
          session_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          component: string
          created_at?: string | null
          id?: string
          level: string
          message: string
          metadata?: Json | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          component?: string
          created_at?: string | null
          id?: string
          level?: string
          message?: string
          metadata?: Json | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      dify_agents: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          dify_config: Json
          display_name: string
          id: string
          is_active: boolean
          is_default: boolean
          model: string
          name: string
          parameters: Json
          provider: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          dify_config?: Json
          display_name: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          model: string
          name: string
          parameters?: Json
          provider: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          dify_config?: Json
          display_name?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          model?: string
          name?: string
          parameters?: Json
          provider?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      external_knowledge_bases: {
        Row: {
          config: Json
          created_at: string
          created_by: string | null
          description: string | null
          display_name: string
          id: string
          is_active: boolean
          name: string
          provider: string
          retrieval_settings: Json
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          config?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_name: string
          id?: string
          is_active?: boolean
          name: string
          provider: string
          retrieval_settings?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          config?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_name?: string
          id?: string
          is_active?: boolean
          name?: string
          provider?: string
          retrieval_settings?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      intelligence_alerts: {
        Row: {
          acknowledged: boolean | null
          acknowledged_at: string | null
          acknowledged_by: string | null
          alert_type: string
          data: Json | null
          description: string | null
          id: string
          severity: string | null
          title: string
          triggered_at: string
        }
        Insert: {
          acknowledged?: boolean | null
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type: string
          data?: Json | null
          description?: string | null
          id?: string
          severity?: string | null
          title: string
          triggered_at?: string
        }
        Update: {
          acknowledged?: boolean | null
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type?: string
          data?: Json | null
          description?: string | null
          id?: string
          severity?: string | null
          title?: string
          triggered_at?: string
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
      ios_debug_logs: {
        Row: {
          created_at: string | null
          details: Json | null
          error_message: string | null
          error_name: string | null
          id: string
          log_level: string
          log_type: string
          message: string
          session_id: string | null
          stack_trace: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          details?: Json | null
          error_message?: string | null
          error_name?: string | null
          id?: string
          log_level: string
          log_type: string
          message: string
          session_id?: string | null
          stack_trace?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          details?: Json | null
          error_message?: string | null
          error_name?: string | null
          id?: string
          log_level?: string
          log_type?: string
          message?: string
          session_id?: string | null
          stack_trace?: string | null
          user_agent?: string | null
          user_id?: string | null
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
      knowledgebase: {
        Row: {
          arquivo_origem: string | null
          capitulo: string | null
          categoria_qa: string | null
          embedding: string | null
          id: string | null
          numero_qa: string | null
          parte: string | null
          pergunta: string | null
          resposta: string | null
          secao: string | null
          subsecao: string | null
          tamanho_texto: number | null
          texto: string | null
          tipo_documento: string | null
          titulo: string | null
        }
        Insert: {
          arquivo_origem?: string | null
          capitulo?: string | null
          categoria_qa?: string | null
          embedding?: string | null
          id?: string | null
          numero_qa?: string | null
          parte?: string | null
          pergunta?: string | null
          resposta?: string | null
          secao?: string | null
          subsecao?: string | null
          tamanho_texto?: number | null
          texto?: string | null
          tipo_documento?: string | null
          titulo?: string | null
        }
        Update: {
          arquivo_origem?: string | null
          capitulo?: string | null
          categoria_qa?: string | null
          embedding?: string | null
          id?: string | null
          numero_qa?: string | null
          parte?: string | null
          pergunta?: string | null
          resposta?: string | null
          secao?: string | null
          subsecao?: string | null
          tamanho_texto?: number | null
          texto?: string | null
          tipo_documento?: string | null
          titulo?: string | null
        }
        Relationships: []
      }
      legal_anexos: {
        Row: {
          anexo_name: string
          anexo_number: string
          anexo_type: string | null
          content_text: string | null
          created_at: string | null
          description: string | null
          document_type: string
          file_path: string | null
          id: number
          is_processed: boolean | null
          metadata: Json | null
          updated_at: string | null
        }
        Insert: {
          anexo_name: string
          anexo_number: string
          anexo_type?: string | null
          content_text?: string | null
          created_at?: string | null
          description?: string | null
          document_type: string
          file_path?: string | null
          id?: number
          is_processed?: boolean | null
          metadata?: Json | null
          updated_at?: string | null
        }
        Update: {
          anexo_name?: string
          anexo_number?: string
          anexo_type?: string | null
          content_text?: string | null
          created_at?: string | null
          description?: string | null
          document_type?: string
          file_path?: string | null
          id?: number
          is_processed?: boolean | null
          metadata?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      legal_articles: {
        Row: {
          article_number: number
          article_text: string | null
          created_at: string | null
          document_type: string
          embedding: string | null
          full_content: string
          id: number
          keywords: string[] | null
          updated_at: string | null
        }
        Insert: {
          article_number: number
          article_text?: string | null
          created_at?: string | null
          document_type: string
          embedding?: string | null
          full_content: string
          id?: number
          keywords?: string[] | null
          updated_at?: string | null
        }
        Update: {
          article_number?: number
          article_text?: string | null
          created_at?: string | null
          document_type?: string
          embedding?: string | null
          full_content?: string
          id?: number
          keywords?: string[] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      legal_articles_backup_content: {
        Row: {
          article_number: number | null
          article_text: string | null
          created_at: string | null
          document_type: string | null
          embedding: string | null
          full_content: string | null
          id: number | null
          keywords: string[] | null
          updated_at: string | null
        }
        Insert: {
          article_number?: number | null
          article_text?: string | null
          created_at?: string | null
          document_type?: string | null
          embedding?: string | null
          full_content?: string | null
          id?: number | null
          keywords?: string[] | null
          updated_at?: string | null
        }
        Update: {
          article_number?: number | null
          article_text?: string | null
          created_at?: string | null
          document_type?: string | null
          embedding?: string | null
          full_content?: string | null
          id?: number | null
          keywords?: string[] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      legal_documents: {
        Row: {
          content: string
          created_at: string | null
          created_by: string | null
          document_type: string
          effective_date: string
          id: string
          is_active: boolean | null
          title: string
          version: string
        }
        Insert: {
          content: string
          created_at?: string | null
          created_by?: string | null
          document_type: string
          effective_date: string
          id?: string
          is_active?: boolean | null
          title: string
          version: string
        }
        Update: {
          content?: string
          created_at?: string | null
          created_by?: string | null
          document_type?: string
          effective_date?: string
          id?: string
          is_active?: boolean | null
          title?: string
          version?: string
        }
        Relationships: []
      }
      legal_hierarchy: {
        Row: {
          article_end: number | null
          article_start: number | null
          created_at: string | null
          document_type: string
          full_path: string | null
          hierarchy_name: string
          hierarchy_number: string
          hierarchy_type: string
          id: number
          order_index: number | null
          parent_id: number | null
        }
        Insert: {
          article_end?: number | null
          article_start?: number | null
          created_at?: string | null
          document_type: string
          full_path?: string | null
          hierarchy_name: string
          hierarchy_number: string
          hierarchy_type: string
          id?: number
          order_index?: number | null
          parent_id?: number | null
        }
        Update: {
          article_end?: number | null
          article_start?: number | null
          created_at?: string | null
          document_type?: string
          full_path?: string | null
          hierarchy_name?: string
          hierarchy_number?: string
          hierarchy_type?: string
          id?: number
          order_index?: number | null
          parent_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "legal_hierarchy_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "legal_hierarchy"
            referencedColumns: ["id"]
          },
        ]
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
      message_insights: {
        Row: {
          analyzed_at: string
          created_at: string
          id: string
          intent: string[] | null
          keywords: string[] | null
          sentiment: string | null
          sentiment_score: number | null
          session_id: string
          topics: string[] | null
          user_message: string
        }
        Insert: {
          analyzed_at?: string
          created_at?: string
          id?: string
          intent?: string[] | null
          keywords?: string[] | null
          sentiment?: string | null
          sentiment_score?: number | null
          session_id: string
          topics?: string[] | null
          user_message: string
        }
        Update: {
          analyzed_at?: string
          created_at?: string
          id?: string
          intent?: string[] | null
          keywords?: string[] | null
          sentiment?: string | null
          sentiment_score?: number | null
          session_id?: string
          topics?: string[] | null
          user_message?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_insights_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
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
      platform_announcements: {
        Row: {
          category: string | null
          content: string | null
          created_at: string | null
          created_by: string | null
          description: string
          expires_at: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          metadata: Json | null
          priority: number | null
          published_at: string | null
          title: string
          type: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          content?: string | null
          created_at?: string | null
          created_by?: string | null
          description: string
          expires_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          metadata?: Json | null
          priority?: number | null
          published_at?: string | null
          title: string
          type: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          content?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string
          expires_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          metadata?: Json | null
          priority?: number | null
          published_at?: string | null
          title?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      platform_service_metrics: {
        Row: {
          avg_response_time_ms: number | null
          created_at: string | null
          date: string
          failed_requests: number | null
          id: string
          incidents_count: number | null
          metadata: Json | null
          service_name: string
          total_requests: number | null
          uptime_percentage: number | null
        }
        Insert: {
          avg_response_time_ms?: number | null
          created_at?: string | null
          date: string
          failed_requests?: number | null
          id?: string
          incidents_count?: number | null
          metadata?: Json | null
          service_name: string
          total_requests?: number | null
          uptime_percentage?: number | null
        }
        Update: {
          avg_response_time_ms?: number | null
          created_at?: string | null
          date?: string
          failed_requests?: number | null
          id?: string
          incidents_count?: number | null
          metadata?: Json | null
          service_name?: string
          total_requests?: number | null
          uptime_percentage?: number | null
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      platform_status_events: {
        Row: {
          affected_users: number | null
          created_at: string | null
          description: string
          duration_minutes: number | null
          event_type: string
          id: string
          metadata: Json | null
          resolved_at: string | null
          service_name: string
          severity: string
          started_at: string | null
          status: string
          title: string
          updated_at: string | null
          updates: Json | null
        }
        Insert: {
          affected_users?: number | null
          created_at?: string | null
          description: string
          duration_minutes?: number | null
          event_type: string
          id?: string
          metadata?: Json | null
          resolved_at?: string | null
          service_name: string
          severity: string
          started_at?: string | null
          status: string
          title: string
          updated_at?: string | null
          updates?: Json | null
        }
        Update: {
          affected_users?: number | null
          created_at?: string | null
          description?: string
          duration_minutes?: number | null
          event_type?: string
          id?: string
          metadata?: Json | null
          resolved_at?: string | null
          service_name?: string
          severity?: string
          started_at?: string | null
          status?: string
          title?: string
          updated_at?: string | null
          updates?: Json | null
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
      qa_dual_validation_runs: {
        Row: {
          accuracy_difference: number | null
          avg_response_time_v1: number | null
          avg_response_time_v2: number | null
          comparison_results: Json | null
          completed_at: string | null
          config: Json
          created_at: string | null
          created_by: string | null
          error_message: string | null
          id: string
          session_id: string
          started_at: string | null
          status: string
          total_tests: number | null
          updated_at: string | null
          v1_accuracy: number | null
          v1_metrics: Json | null
          v1_passed_tests: number | null
          v1_run_id: string | null
          v2_accuracy: number | null
          v2_metrics: Json | null
          v2_passed_tests: number | null
          v2_run_id: string | null
        }
        Insert: {
          accuracy_difference?: number | null
          avg_response_time_v1?: number | null
          avg_response_time_v2?: number | null
          comparison_results?: Json | null
          completed_at?: string | null
          config?: Json
          created_at?: string | null
          created_by?: string | null
          error_message?: string | null
          id?: string
          session_id: string
          started_at?: string | null
          status?: string
          total_tests?: number | null
          updated_at?: string | null
          v1_accuracy?: number | null
          v1_metrics?: Json | null
          v1_passed_tests?: number | null
          v1_run_id?: string | null
          v2_accuracy?: number | null
          v2_metrics?: Json | null
          v2_passed_tests?: number | null
          v2_run_id?: string | null
        }
        Update: {
          accuracy_difference?: number | null
          avg_response_time_v1?: number | null
          avg_response_time_v2?: number | null
          comparison_results?: Json | null
          completed_at?: string | null
          config?: Json
          created_at?: string | null
          created_by?: string | null
          error_message?: string | null
          id?: string
          session_id?: string
          started_at?: string | null
          status?: string
          total_tests?: number | null
          updated_at?: string | null
          v1_accuracy?: number | null
          v1_metrics?: Json | null
          v1_passed_tests?: number | null
          v1_run_id?: string | null
          v2_accuracy?: number | null
          v2_metrics?: Json | null
          v2_passed_tests?: number | null
          v2_run_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "qa_dual_validation_runs_v1_run_id_fkey"
            columns: ["v1_run_id"]
            isOneToOne: false
            referencedRelation: "qa_validation_runs"
            referencedColumns: ["id"]
          },
        ]
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
          test_case_id: number
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
          test_case_id: number
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
          test_case_id?: number
          validation_run_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_validation_results_test_case"
            columns: ["test_case_id"]
            isOneToOne: false
            referencedRelation: "qa_test_cases"
            referencedColumns: ["id"]
          },
        ]
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
      quality_insights_v3: {
        Row: {
          category: string
          confidence_score: number | null
          created_at: string | null
          data_points: Json | null
          description: string
          id: string
          impact_score: number | null
          insight_type: string
          is_resolved: boolean | null
          rag_version: string
          recommendations: Json | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          title: string
          updated_at: string | null
        }
        Insert: {
          category: string
          confidence_score?: number | null
          created_at?: string | null
          data_points?: Json | null
          description: string
          id?: string
          impact_score?: number | null
          insight_type: string
          is_resolved?: boolean | null
          rag_version: string
          recommendations?: Json | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity: string
          title: string
          updated_at?: string | null
        }
        Update: {
          category?: string
          confidence_score?: number | null
          created_at?: string | null
          data_points?: Json | null
          description?: string
          id?: string
          impact_score?: number | null
          insight_type?: string
          is_resolved?: boolean | null
          rag_version?: string
          recommendations?: Json | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          title?: string
          updated_at?: string | null
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
      rag_version_comparisons: {
        Row: {
          created_at: string | null
          difference_analysis: Json | null
          dual_run_id: string | null
          id: string
          quality_metrics: Json | null
          query_text: string
          similarity_score: number | null
          test_case_id: number | null
          v1_accuracy_score: number | null
          v1_is_correct: boolean | null
          v1_response: string | null
          v1_response_time: number | null
          v2_accuracy_score: number | null
          v2_is_correct: boolean | null
          v2_response: string | null
          v2_response_time: number | null
        }
        Insert: {
          created_at?: string | null
          difference_analysis?: Json | null
          dual_run_id?: string | null
          id?: string
          quality_metrics?: Json | null
          query_text: string
          similarity_score?: number | null
          test_case_id?: number | null
          v1_accuracy_score?: number | null
          v1_is_correct?: boolean | null
          v1_response?: string | null
          v1_response_time?: number | null
          v2_accuracy_score?: number | null
          v2_is_correct?: boolean | null
          v2_response?: string | null
          v2_response_time?: number | null
        }
        Update: {
          created_at?: string | null
          difference_analysis?: Json | null
          dual_run_id?: string | null
          id?: string
          quality_metrics?: Json | null
          query_text?: string
          similarity_score?: number | null
          test_case_id?: number | null
          v1_accuracy_score?: number | null
          v1_is_correct?: boolean | null
          v1_response?: string | null
          v1_response_time?: number | null
          v2_accuracy_score?: number | null
          v2_is_correct?: boolean | null
          v2_response?: string | null
          v2_response_time?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "rag_version_comparisons_dual_run_id_fkey"
            columns: ["dual_run_id"]
            isOneToOne: false
            referencedRelation: "qa_dual_validation_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rag_version_comparisons_test_case_id_fkey"
            columns: ["test_case_id"]
            isOneToOne: false
            referencedRelation: "qa_test_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      regime_urbanistico_consolidado: {
        Row: {
          "afastamentos - frente": string | null
          "afastamentos - fundos": string | null
          "afastamentos - laterais": string | null
          "altura máxima para edificação isolada": string | null
          "área de destinação pública – equipamentos fracionamento":
            | string
            | null
          "área de destinação pública – malha viária fracionamento":
            | string
            | null
          "área máxima do quarteirão": string | null
          "área mínima do lote": string | null
          "área mínima do quarteirão": string | null
          "área pública – equipamentos desmembramento tipo 1": string | null
          "área pública – equipamentos desmembramento tipo 2": string | null
          "área pública – equipamentos desmembramento tipo 3": string | null
          "área pública – equipamentos loteamento": string | null
          "área pública – malha viária desmembramento tipo 1": string | null
          "área pública – malha viária desmembramento tipo 2": string | null
          "área pública – malha viária desmembramento tipo 3": string | null
          "área pública – malha viária loteamento": string | null
          atividades: string | null
          bairro: string | null
          caracteristicas: string | null
          categoria_risco: string | null
          cod: string | null
          "coeficiente de aproveitamento básico": string | null
          "coeficiente de aproveitamento básico 4d": string | null
          "coeficiente de aproveitamento máximo": string | null
          "coeficiente de aproveitamento máximo 4d": string | null
          "comércio atacadista ia1 – restrição porte": string | null
          "comércio atacadista ia2 – restrição porte": string | null
          "comércio atacadista ia3 – restrição porte": string | null
          "comércio varejista ia1 – restrição porte": string | null
          "comércio varejista ia2 – restrição porte": string | null
          "comércio varejista inócuo – restrição porte": string | null
          "comparativo entre planos": string | null
          edificações: string | null
          "enquadramento desmembramento tipo 1": string | null
          "enquadramento desmembramento tipo 2": string | null
          "enquadramento desmembramento tipo 3": string | null
          "enquadramento fracionamento": string | null
          "enquadramento loteamento": string | null
          "face máxima do quarteirão": string | null
          "fator de conversão da taxa de permeabilidade": string | null
          final: string | null
          "indústria com interferência ambiental – restrição porte":
            | string
            | null
          "indústria inócua – restrição porte": string | null
          "módulo de fracionamento": string | null
          "nível de controle de polarização de entretenimento noturno":
            | string
            | null
          ocupacao: string | null
          "parcelamento do solo": string | null
          "recuo de jardim": string | null
          "serviço ia1 – restrição porte": string | null
          "serviço ia2 – restrição porte": string | null
          "serviço ia3 – restrição porte": string | null
          "serviço inócuo – restrição porte": string | null
          "taxa de permeabilidade acima de 1500 m2": string | null
          "taxa de permeabilidade até 1500 m2": string | null
          "testada mínima do lote": string | null
          zona: string | null
        }
        Insert: {
          "afastamentos - frente"?: string | null
          "afastamentos - fundos"?: string | null
          "afastamentos - laterais"?: string | null
          "altura máxima para edificação isolada"?: string | null
          "área de destinação pública – equipamentos fracionamento"?:
            | string
            | null
          "área de destinação pública – malha viária fracionamento"?:
            | string
            | null
          "área máxima do quarteirão"?: string | null
          "área mínima do lote"?: string | null
          "área mínima do quarteirão"?: string | null
          "área pública – equipamentos desmembramento tipo 1"?: string | null
          "área pública – equipamentos desmembramento tipo 2"?: string | null
          "área pública – equipamentos desmembramento tipo 3"?: string | null
          "área pública – equipamentos loteamento"?: string | null
          "área pública – malha viária desmembramento tipo 1"?: string | null
          "área pública – malha viária desmembramento tipo 2"?: string | null
          "área pública – malha viária desmembramento tipo 3"?: string | null
          "área pública – malha viária loteamento"?: string | null
          atividades?: string | null
          bairro?: string | null
          caracteristicas?: string | null
          categoria_risco?: string | null
          cod?: string | null
          "coeficiente de aproveitamento básico"?: string | null
          "coeficiente de aproveitamento básico 4d"?: string | null
          "coeficiente de aproveitamento máximo"?: string | null
          "coeficiente de aproveitamento máximo 4d"?: string | null
          "comércio atacadista ia1 – restrição porte"?: string | null
          "comércio atacadista ia2 – restrição porte"?: string | null
          "comércio atacadista ia3 – restrição porte"?: string | null
          "comércio varejista ia1 – restrição porte"?: string | null
          "comércio varejista ia2 – restrição porte"?: string | null
          "comércio varejista inócuo – restrição porte"?: string | null
          "comparativo entre planos"?: string | null
          edificações?: string | null
          "enquadramento desmembramento tipo 1"?: string | null
          "enquadramento desmembramento tipo 2"?: string | null
          "enquadramento desmembramento tipo 3"?: string | null
          "enquadramento fracionamento"?: string | null
          "enquadramento loteamento"?: string | null
          "face máxima do quarteirão"?: string | null
          "fator de conversão da taxa de permeabilidade"?: string | null
          final?: string | null
          "indústria com interferência ambiental – restrição porte"?:
            | string
            | null
          "indústria inócua – restrição porte"?: string | null
          "módulo de fracionamento"?: string | null
          "nível de controle de polarização de entretenimento noturno"?:
            | string
            | null
          ocupacao?: string | null
          "parcelamento do solo"?: string | null
          "recuo de jardim"?: string | null
          "serviço ia1 – restrição porte"?: string | null
          "serviço ia2 – restrição porte"?: string | null
          "serviço ia3 – restrição porte"?: string | null
          "serviço inócuo – restrição porte"?: string | null
          "taxa de permeabilidade acima de 1500 m2"?: string | null
          "taxa de permeabilidade até 1500 m2"?: string | null
          "testada mínima do lote"?: string | null
          zona?: string | null
        }
        Update: {
          "afastamentos - frente"?: string | null
          "afastamentos - fundos"?: string | null
          "afastamentos - laterais"?: string | null
          "altura máxima para edificação isolada"?: string | null
          "área de destinação pública – equipamentos fracionamento"?:
            | string
            | null
          "área de destinação pública – malha viária fracionamento"?:
            | string
            | null
          "área máxima do quarteirão"?: string | null
          "área mínima do lote"?: string | null
          "área mínima do quarteirão"?: string | null
          "área pública – equipamentos desmembramento tipo 1"?: string | null
          "área pública – equipamentos desmembramento tipo 2"?: string | null
          "área pública – equipamentos desmembramento tipo 3"?: string | null
          "área pública – equipamentos loteamento"?: string | null
          "área pública – malha viária desmembramento tipo 1"?: string | null
          "área pública – malha viária desmembramento tipo 2"?: string | null
          "área pública – malha viária desmembramento tipo 3"?: string | null
          "área pública – malha viária loteamento"?: string | null
          atividades?: string | null
          bairro?: string | null
          caracteristicas?: string | null
          categoria_risco?: string | null
          cod?: string | null
          "coeficiente de aproveitamento básico"?: string | null
          "coeficiente de aproveitamento básico 4d"?: string | null
          "coeficiente de aproveitamento máximo"?: string | null
          "coeficiente de aproveitamento máximo 4d"?: string | null
          "comércio atacadista ia1 – restrição porte"?: string | null
          "comércio atacadista ia2 – restrição porte"?: string | null
          "comércio atacadista ia3 – restrição porte"?: string | null
          "comércio varejista ia1 – restrição porte"?: string | null
          "comércio varejista ia2 – restrição porte"?: string | null
          "comércio varejista inócuo – restrição porte"?: string | null
          "comparativo entre planos"?: string | null
          edificações?: string | null
          "enquadramento desmembramento tipo 1"?: string | null
          "enquadramento desmembramento tipo 2"?: string | null
          "enquadramento desmembramento tipo 3"?: string | null
          "enquadramento fracionamento"?: string | null
          "enquadramento loteamento"?: string | null
          "face máxima do quarteirão"?: string | null
          "fator de conversão da taxa de permeabilidade"?: string | null
          final?: string | null
          "indústria com interferência ambiental – restrição porte"?:
            | string
            | null
          "indústria inócua – restrição porte"?: string | null
          "módulo de fracionamento"?: string | null
          "nível de controle de polarização de entretenimento noturno"?:
            | string
            | null
          ocupacao?: string | null
          "parcelamento do solo"?: string | null
          "recuo de jardim"?: string | null
          "serviço ia1 – restrição porte"?: string | null
          "serviço ia2 – restrição porte"?: string | null
          "serviço ia3 – restrição porte"?: string | null
          "serviço inócuo – restrição porte"?: string | null
          "taxa de permeabilidade acima de 1500 m2"?: string | null
          "taxa de permeabilidade até 1500 m2"?: string | null
          "testada mínima do lote"?: string | null
          zona?: string | null
        }
        Relationships: []
      }
      security_lessons_learned: {
        Row: {
          created_at: string | null
          discovered_date: string
          how_fixed: string
          id: string
          related_run_id: string | null
          severity: string
          takeaway: string
          test_number: number | null
          vulnerability_name: string
          what_happened: string
          why_it_worked: string
        }
        Insert: {
          created_at?: string | null
          discovered_date: string
          how_fixed: string
          id?: string
          related_run_id?: string | null
          severity: string
          takeaway: string
          test_number?: number | null
          vulnerability_name: string
          what_happened: string
          why_it_worked: string
        }
        Update: {
          created_at?: string | null
          discovered_date?: string
          how_fixed?: string
          id?: string
          related_run_id?: string | null
          severity?: string
          takeaway?: string
          test_number?: number | null
          vulnerability_name?: string
          what_happened?: string
          why_it_worked?: string
        }
        Relationships: [
          {
            foreignKeyName: "security_lessons_learned_related_run_id_fkey"
            columns: ["related_run_id"]
            isOneToOne: false
            referencedRelation: "security_validation_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      security_test_cases: {
        Row: {
          attack_vector: string | null
          category: string
          created_at: string | null
          expected_behavior: string
          id: number
          is_active: boolean | null
          objective: string
          severity: string
          test_input: string
          test_name: string
          test_number: number
          updated_at: string | null
          version_added: string | null
        }
        Insert: {
          attack_vector?: string | null
          category: string
          created_at?: string | null
          expected_behavior: string
          id: number
          is_active?: boolean | null
          objective: string
          severity: string
          test_input: string
          test_name: string
          test_number: number
          updated_at?: string | null
          version_added?: string | null
        }
        Update: {
          attack_vector?: string | null
          category?: string
          created_at?: string | null
          expected_behavior?: string
          id?: number
          is_active?: boolean | null
          objective?: string
          severity?: string
          test_input?: string
          test_name?: string
          test_number?: number
          updated_at?: string | null
          version_added?: string | null
        }
        Relationships: []
      }
      security_test_results: {
        Row: {
          actual_response: string | null
          blocked_by_filter: boolean | null
          category: string
          created_at: string | null
          expected_behavior: string
          filter_triggered: string[] | null
          id: string
          notes: string | null
          response_time_ms: number | null
          result: string
          run_id: string | null
          severity: string
          test_input: string
          test_name: string
          test_number: number
        }
        Insert: {
          actual_response?: string | null
          blocked_by_filter?: boolean | null
          category: string
          created_at?: string | null
          expected_behavior: string
          filter_triggered?: string[] | null
          id?: string
          notes?: string | null
          response_time_ms?: number | null
          result: string
          run_id?: string | null
          severity: string
          test_input: string
          test_name: string
          test_number: number
        }
        Update: {
          actual_response?: string | null
          blocked_by_filter?: boolean | null
          category?: string
          created_at?: string | null
          expected_behavior?: string
          filter_triggered?: string[] | null
          id?: string
          notes?: string | null
          response_time_ms?: number | null
          result?: string
          run_id?: string | null
          severity?: string
          test_input?: string
          test_name?: string
          test_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "security_test_results_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "security_validation_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      security_validation_runs: {
        Row: {
          agent_id: string | null
          completed_at: string | null
          created_at: string | null
          critical_failures: number
          error_message: string | null
          executed_by: string | null
          failed_tests: number
          high_severity_failures: number
          id: string
          medium_severity_failures: number
          overall_score: number | null
          partial_tests: number
          passed_tests: number
          started_at: string
          status: string
          system_version: string | null
          total_tests: number
        }
        Insert: {
          agent_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          critical_failures?: number
          error_message?: string | null
          executed_by?: string | null
          failed_tests?: number
          high_severity_failures?: number
          id?: string
          medium_severity_failures?: number
          overall_score?: number | null
          partial_tests?: number
          passed_tests?: number
          started_at?: string
          status?: string
          system_version?: string | null
          total_tests?: number
        }
        Update: {
          agent_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          critical_failures?: number
          error_message?: string | null
          executed_by?: string | null
          failed_tests?: number
          high_severity_failures?: number
          id?: string
          medium_severity_failures?: number
          overall_score?: number | null
          partial_tests?: number
          passed_tests?: number
          started_at?: string
          status?: string
          system_version?: string | null
          total_tests?: number
        }
        Relationships: [
          {
            foreignKeyName: "security_validation_runs_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "dify_agents"
            referencedColumns: ["id"]
          },
        ]
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
          auth_provider: string | null
          cookies_accepted_at: string | null
          created_at: string
          email: string
          email_verified: boolean | null
          full_name: string | null
          id: string
          is_active: boolean
          privacy_accepted_at: string | null
          terms_accepted_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          auth_provider?: string | null
          cookies_accepted_at?: string | null
          created_at?: string
          email: string
          email_verified?: boolean | null
          full_name?: string | null
          id?: string
          is_active?: boolean
          privacy_accepted_at?: string | null
          terms_accepted_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          auth_provider?: string | null
          cookies_accepted_at?: string | null
          created_at?: string
          email?: string
          email_verified?: boolean | null
          full_name?: string | null
          id?: string
          is_active?: boolean
          privacy_accepted_at?: string | null
          terms_accepted_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_announcement_views: {
        Row: {
          announcement_id: string
          id: string
          user_id: string
          viewed_at: string | null
        }
        Insert: {
          announcement_id: string
          id?: string
          user_id: string
          viewed_at?: string | null
        }
        Update: {
          announcement_id?: string
          id?: string
          user_id?: string
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_announcement_views_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "platform_announcements"
            referencedColumns: ["id"]
          },
        ]
      }
      user_consents: {
        Row: {
          consented_at: string | null
          document_id: string
          document_type: string
          document_version: string
          id: string
          ip_address: unknown
          metadata: Json | null
          revoked_at: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          consented_at?: string | null
          document_id: string
          document_type: string
          document_version: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          revoked_at?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          consented_at?: string | null
          document_id?: string
          document_type?: string
          document_version?: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          revoked_at?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_consents_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "legal_documents"
            referencedColumns: ["id"]
          },
        ]
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
    }
    Views: {
      agent_performance_stats: {
        Row: {
          agent_type: string | null
          avg_confidence: number | null
          avg_execution_time: number | null
          avg_records_processed: number | null
          execution_date: string | null
          success_rate: number | null
          total_executions: number | null
        }
        Relationships: []
      }
      anexos_summary: {
        Row: {
          anexo_type: string | null
          document_type: string | null
          pending: number | null
          percent_complete: number | null
          processed: number | null
          total: number | null
        }
        Relationships: []
      }
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
      llm_models_public: {
        Row: {
          average_latency: number | null
          created_at: string | null
          id: number | null
          is_active: boolean | null
          max_tokens: number | null
          model: string | null
          provider: string | null
          public_capabilities: Json | null
          updated_at: string | null
        }
        Insert: {
          average_latency?: number | null
          created_at?: string | null
          id?: number | null
          is_active?: boolean | null
          max_tokens?: number | null
          model?: string | null
          provider?: string | null
          public_capabilities?: never
          updated_at?: string | null
        }
        Update: {
          average_latency?: number | null
          created_at?: string | null
          id?: number | null
          is_active?: boolean | null
          max_tokens?: number | null
          model?: string | null
          provider?: string | null
          public_capabilities?: never
          updated_at?: string | null
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
      mv_daily_insights: {
        Row: {
          avg_sentiment: number | null
          date: string | null
          message_count: number | null
          sentiment: string | null
          unique_users: number | null
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
        Relationships: [
          {
            foreignKeyName: "qa_token_usage_validation_run_id_fkey"
            columns: ["validation_run_id"]
            isOneToOne: false
            referencedRelation: "qa_validation_runs"
            referencedColumns: ["id"]
          },
        ]
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
      cache_regime_query: {
        Args: { p_bairro?: string; p_zona?: string }
        Returns: Json
      }
      check_auth_rate_limit: {
        Args: { max_attempts: number; user_ip: unknown; window_minutes: number }
        Returns: boolean
      }
      check_quality_thresholds: {
        Args: never
        Returns: {
          current_value: number
          metric_name: string
          status: string
          threshold_value: number
        }[]
      }
      clean_expired_cache: { Args: never; Returns: number }
      cleanup_old_data: { Args: never; Returns: undefined }
      cleanup_stuck_qa_runs: { Args: never; Returns: number }
      convert_string_to_vector: { Args: never; Returns: undefined }
      delete_chat_session_atomic: {
        Args: { session_id_param: string }
        Returns: Json
      }
      execute_sql_query: { Args: { query_text: string }; Returns: Json }
      fix_content_duplications_v2: {
        Args: never
        Returns: {
          duplications_removed: number
          id: number
          new_length: number
          original_length: number
          patterns_found: string[]
        }[]
      }
      get_article_context: {
        Args: { art_num: number; doc_type: string }
        Returns: string
      }
      get_best_model_for_query: {
        Args: { priority?: string; query_type: string }
        Returns: {
          model: string
          provider: string
          score: number
        }[]
      }
      get_cached_response: {
        Args: { p_query_hash: string }
        Returns: {
          confidence: number
          final_response: string
          hit_count: number
          original_query: string
          sources: Json
        }[]
      }
      get_complete_hierarchy: {
        Args: { art_num: number; doc_type: string }
        Returns: string
      }
      get_current_user_role: { Args: never; Returns: string }
      get_from_cache: { Args: { p_query_text: string }; Returns: Json }
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
      get_top_topics: {
        Args: { end_date: string; limit_count?: number; start_date: string }
        Returns: {
          avg_sentiment_score: number
          count: number
          topic: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      hybrid_search:
        | {
            Args: {
              doc_type?: string
              embedding_vector?: string
              limit_results?: number
              search_query: string
            }
            Returns: {
              article_number: number
              article_text: string
              content: string
              document_type: string
              hierarchy: string
              relevance_score: number
              source: string
            }[]
          }
        | {
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
      is_admin: { Args: never; Returns: boolean }
      is_supervisor_or_admin: { Args: never; Returns: boolean }
      log_agent_performance: {
        Args: {
          p_agent_type: string
          p_confidence: number
          p_data_sources_used?: string[]
          p_error_message?: string
          p_execution_time: number
          p_query_context: Json
          p_records_processed?: number
          p_success: boolean
        }
        Returns: undefined
      }
      log_user_action: {
        Args: {
          action_name: string
          new_values: Json
          old_values: Json
          record_id: string
          table_name: string
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
      match_documents:
        | {
            Args: {
              match_count?: number
              match_threshold?: number
              query_embedding: string
            }
            Returns: {
              article_number: number
              article_text: string
              document_type: string
              full_content: string
              similarity: number
            }[]
          }
        | {
            Args: { match_count: number; query_embedding: string }
            Returns: {
              chunk_metadata: Json
              content_chunk: string
              document_id: number
              similarity: number
            }[]
          }
        | {
            Args: {
              filter?: Json
              match_count?: number
              query_embedding: string
            }
            Returns: {
              content: string
              id: number
              metadata: Json
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
      match_enhanced_documents: {
        Args: {
          article_filter?: number
          document_type_filter?: string
          hierarchy_filter?: number
          match_count?: number
          match_threshold?: number
          query_embedding: string
          tags_filter?: string[]
        }
        Returns: {
          article_number: number
          chunk_metadata: Json
          content_chunk: string
          document_type: string
          hierarchy_level: number
          id: string
          similarity: number
          tags: string[]
          title: string
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
      match_knowledgebase: {
        Args: {
          match_count?: number
          match_threshold?: number
          query_embedding: string
          tipo_documento_filter?: string
        }
        Returns: {
          capitulo: string
          id: string
          parte: string
          pergunta: string
          resposta: string
          secao: string
          similarity: number
          subsecao: string
          texto: string
          tipo_documento: string
          titulo: string
        }[]
      }
      match_legal_articles: {
        Args: {
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          article_number: number
          article_text: string
          document_type: string
          full_content: string
          id: number
          keywords: string[]
          similarity: number
        }[]
      }
      match_legal_articles_only: {
        Args: {
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          article_number: number
          article_text: string
          document_type: string
          full_content: string
          id: number
          keywords: string[]
          similarity: number
        }[]
      }
      match_legal_by_document: {
        Args: {
          doc_type: string
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          article_number: number
          article_text: string
          document_type: string
          full_content: string
          id: number
          keywords: string[]
          similarity: number
        }[]
      }
      match_legal_hierarchy: {
        Args: {
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          article_number: number
          article_text: string
          document_type: string
          full_content: string
          id: number
          keywords: string[]
          similarity: number
        }[]
      }
      refresh_daily_insights: { Args: never; Returns: undefined }
      remove_content_duplications: {
        Args: never
        Returns: {
          duplications_removed: number
          id: number
          new_length: number
          original_length: number
        }[]
      }
      run_comprehensive_qa_test: { Args: never; Returns: Json }
      save_to_cache: {
        Args: {
          p_agent_results: Json
          p_confidence: number
          p_execution_time: number
          p_final_response: string
          p_original_query: string
          p_query_context: Json
          p_query_hash: string
          p_sources: Json
        }
        Returns: undefined
      }
      search_articles_knowledgebase: {
        Args: { article_number_search: string; document_type_filter?: string }
        Returns: {
          article_number_extracted: number
          id: string
          texto: string
          tipo_documento: string
          titulo: string
        }[]
      }
      search_articles_simple: {
        Args: { doc_type?: string; search_term: string }
        Returns: {
          article_number: number
          article_text: string
          content: string
          document_type: string
          hierarchy: string
        }[]
      }
      search_content_by_similarity: {
        Args: { match_count?: number; search_query: string }
        Returns: {
          content: string
          document_id: number
          similarity: number
        }[]
      }
      search_knowledgebase_by_content: {
        Args: {
          match_count?: number
          search_text: string
          tipo_documento_filter?: string
        }
        Returns: {
          capitulo: string
          id: string
          parte: string
          pergunta: string
          relevance_score: number
          resposta: string
          secao: string
          subsecao: string
          texto: string
          tipo_documento: string
          titulo: string
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
      search_zots: {
        Args: { bairro_query?: string; zot_query?: string }
        Returns: {
          altura_max: number
          bairro: string
          ca_basico: string
          ca_max: string
          taxa_permeabilidade_ate: number
          zoneamento: string
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
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      update_chunk_metadata: { Args: never; Returns: undefined }
      update_document_embedding: {
        Args: { doc_id: string; new_embedding: number[] }
        Returns: undefined
      }
      user_owns_session: {
        Args: { session_id_param: string }
        Returns: boolean
      }
      validate_oauth_access: {
        Args: { user_email: string; user_id: string }
        Returns: Json
      }
      validate_qa_model: { Args: { model_name: string }; Returns: boolean }
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
