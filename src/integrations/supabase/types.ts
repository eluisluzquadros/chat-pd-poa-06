export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      assistant_config: {
        Row: {
          active_assistant: string
          created_at: string | null
          default_llm: string
          forced_provider: string | null
          id: string
          routing_mode: string | null
          updated_at: string | null
        }
        Insert: {
          active_assistant?: string
          created_at?: string | null
          default_llm?: string
          forced_provider?: string | null
          id?: string
          routing_mode?: string | null
          updated_at?: string | null
        }
        Update: {
          active_assistant?: string
          created_at?: string | null
          default_llm?: string
          forced_provider?: string | null
          id?: string
          routing_mode?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      chat_history: {
        Row: {
          collection_id: string | null
          created_at: string
          id: string
          message: string
          model: string | null
          role: string
          session_id: string | null
          user_id: string
        }
        Insert: {
          collection_id?: string | null
          created_at?: string
          id?: string
          message: string
          model?: string | null
          role: string
          session_id?: string | null
          user_id: string
        }
        Update: {
          collection_id?: string | null
          created_at?: string
          id?: string
          message?: string
          model?: string | null
          role?: string
          session_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_history_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
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
          openai_thread_id: string | null
          searchable_text: unknown | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message?: string | null
          model?: string | null
          openai_thread_id?: string | null
          searchable_text?: unknown | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message?: string | null
          model?: string | null
          openai_thread_id?: string | null
          searchable_text?: unknown | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      collection_documents: {
        Row: {
          collection_id: string
          created_at: string
          document_id: string
        }
        Insert: {
          collection_id: string
          created_at?: string
          document_id: string
        }
        Update: {
          collection_id?: string
          created_at?: string
          document_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collection_documents_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_documents_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents_test"
            referencedColumns: ["id"]
          },
        ]
      }
      collections: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_default: boolean | null
          owner_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean | null
          owner_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean | null
          owner_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          content: string | null
          embedding: string | null
          id: number
          metadata: Json | null
        }
        Insert: {
          content?: string | null
          embedding?: string | null
          id?: number
          metadata?: Json | null
        }
        Update: {
          content?: string | null
          embedding?: string | null
          id?: number
          metadata?: Json | null
        }
        Relationships: []
      }
      documents_collections: {
        Row: {
          added_at: string
          collection_id: string
          document_id: string
        }
        Insert: {
          added_at?: string
          collection_id: string
          document_id: string
        }
        Update: {
          added_at?: string
          collection_id?: string
          document_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_collections_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_collections_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents_test"
            referencedColumns: ["id"]
          },
        ]
      }
      documents_test: {
        Row: {
          content: string | null
          created_at: string
          description: string | null
          domain: string
          file_path: string | null
          file_url: string | null
          id: string
          is_default: boolean | null
          owner_id: string
          size: number | null
          tags: string[] | null
          title: string
          type: string | null
          updated_at: string
          url: string | null
          url_content: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string
          description?: string | null
          domain?: string
          file_path?: string | null
          file_url?: string | null
          id?: string
          is_default?: boolean | null
          owner_id: string
          size?: number | null
          tags?: string[] | null
          title: string
          type?: string | null
          updated_at?: string
          url?: string | null
          url_content?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string
          description?: string | null
          domain?: string
          file_path?: string | null
          file_url?: string | null
          id?: string
          is_default?: boolean | null
          owner_id?: string
          size?: number | null
          tags?: string[] | null
          title?: string
          type?: string | null
          updated_at?: string
          url?: string | null
          url_content?: string | null
        }
        Relationships: []
      }
      insights: {
        Row: {
          created_at: string
          description: string
          document_id: string | null
          id: string
          owner_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          document_id?: string | null
          id?: string
          owner_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          document_id?: string | null
          id?: string
          owner_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "insights_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents_test"
            referencedColumns: ["id"]
          },
        ]
      }
      interest_manifestations: {
        Row: {
          account_created: boolean | null
          city: string | null
          cpf: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          newsletter_opt_in: boolean | null
          organization: string | null
          organization_size:
            | Database["public"]["Enums"]["organization_size"]
            | null
          status: string | null
          updated_at: string
        }
        Insert: {
          account_created?: boolean | null
          city?: string | null
          cpf?: string | null
          created_at?: string
          email: string
          full_name: string
          id?: string
          newsletter_opt_in?: boolean | null
          organization?: string | null
          organization_size?:
            | Database["public"]["Enums"]["organization_size"]
            | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          account_created?: boolean | null
          city?: string | null
          cpf?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          newsletter_opt_in?: boolean | null
          organization?: string | null
          organization_size?:
            | Database["public"]["Enums"]["organization_size"]
            | null
          status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      metrics: {
        Row: {
          created_at: string
          document_id: string | null
          id: string
          metric_type: string
          owner_id: string
          updated_at: string
          value: Json
        }
        Insert: {
          created_at?: string
          document_id?: string | null
          id?: string
          metric_type: string
          owner_id: string
          updated_at?: string
          value: Json
        }
        Update: {
          created_at?: string
          document_id?: string | null
          id?: string
          metric_type?: string
          owner_id?: string
          updated_at?: string
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "metrics_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents_test"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          first_name: string | null
          full_name: string | null
          id: string
          last_name: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          first_name?: string | null
          full_name?: string | null
          id: string
          last_name?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          first_name?: string | null
          full_name?: string | null
          id?: string
          last_name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      recommendations: {
        Row: {
          created_at: string
          description: string
          document_id: string | null
          id: string
          owner_id: string
          priority: Database["public"]["Enums"]["recommendation_priority"]
          tags: string[]
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          document_id?: string | null
          id?: string
          owner_id: string
          priority?: Database["public"]["Enums"]["recommendation_priority"]
          tags?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          document_id?: string | null
          id?: string
          owner_id?: string
          priority?: Database["public"]["Enums"]["recommendation_priority"]
          tags?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recommendations_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents_test"
            referencedColumns: ["id"]
          },
        ]
      }
      secrets: {
        Row: {
          created_at: string | null
          id: string
          name: string
          secret_value: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          secret_value: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          secret_value?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      user_accounts: {
        Row: {
          active: boolean | null
          city: string | null
          cpf: string | null
          created_at: string | null
          email: string
          full_name: string
          id: string
          newsletter: boolean | null
          organization: string | null
          organization_size:
            | Database["public"]["Enums"]["organization_size"]
            | null
          profile_id: string | null
          role: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          active?: boolean | null
          city?: string | null
          cpf?: string | null
          created_at?: string | null
          email: string
          full_name: string
          id?: string
          newsletter?: boolean | null
          organization?: string | null
          organization_size?:
            | Database["public"]["Enums"]["organization_size"]
            | null
          profile_id?: string | null
          role?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          active?: boolean | null
          city?: string | null
          cpf?: string | null
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          newsletter?: boolean | null
          organization?: string | null
          organization_size?:
            | Database["public"]["Enums"]["organization_size"]
            | null
          profile_id?: string | null
          role?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_accounts_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      binary_quantize: {
        Args: { "": string } | { "": unknown }
        Returns: unknown
      }
      convert_interest_to_user: {
        Args: {
          interest_id: string
          password: string
          role_name?: Database["public"]["Enums"]["app_role"]
        }
        Returns: string
      }
      delete_chat_session: {
        Args: { session_id_param: string }
        Returns: undefined
      }
      get_user_role: {
        Args: { user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
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
      has_role: {
        Args: { _role: Database["public"]["Enums"]["app_role"] }
        Returns: boolean
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
      match_documents: {
        Args:
          | {
              query_embedding: string
              match_count: number
              document_ids: string[]
            }
          | { query_embedding: string; match_count?: number; filter?: Json }
        Returns: {
          id: number
          content: string
          metadata: Json
          similarity: number
        }[]
      }
      set_user_role: {
        Args: {
          target_user_id: string
          new_role: Database["public"]["Enums"]["app_role"]
        }
        Returns: undefined
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
      user_has_platform_access: {
        Args: { user_email: string }
        Returns: boolean
      }
      validate_oauth_access: {
        Args: { user_email: string; user_id: string }
        Returns: Json
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
      app_role: "admin" | "supervisor" | "analyst" | "citizen"
      organization_size:
        | "ate_10"
        | "ate_50"
        | "ate_100"
        | "ate_500"
        | "mais_500"
      recommendation_priority: "alta" | "media" | "baixa"
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
      app_role: ["admin", "supervisor", "analyst", "citizen"],
      organization_size: ["ate_10", "ate_50", "ate_100", "ate_500", "mais_500"],
      recommendation_priority: ["alta", "media", "baixa"],
    },
  },
} as const
