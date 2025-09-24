import { boolean, integer, json, numeric, pgTable, serial, text, timestamp, varchar, uuid } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// Agents table - para gerenciar agentes externos (Dify, Langflow, CrewAI)
export const agents = pgTable('dify_agents', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  name: varchar('name', { length: 255 }).notNull(),
  display_name: varchar('display_name', { length: 255 }).notNull(),
  description: text('description'),
  provider: varchar('provider', { length: 50 }).notNull().default('external'),
  model: varchar('model', { length: 100 }).notNull(),
  dify_config: json('dify_config'),
  parameters: json('parameters'),
  capabilities: json('capabilities'), // NOVO: Session routing capabilities
  is_active: boolean('is_active').notNull().default(true),
  is_default: boolean('is_default').notNull().default(false),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
});

// API Config interface for type safety
export interface ApiConfig {
  base_url?: string;
  service_api_endpoint?: string;
  api_key?: string;
  app_id?: string;
  public_url?: string;
  server_url?: string;
  workflow_id?: string;
}

export interface ModelParameters {
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  stream?: boolean;
  timeout?: number;
  max_retries?: number;
  response_format?: 'text' | 'json';
}

// Agent Capabilities for SDK routing
export interface AgentCapabilities {
  sessionManagement?: 'platform' | 'self-managed'; // How sessions are handled
  requiresSessionId?: boolean; // Whether agent needs platform sessionId
  contextPersistence?: 'stateless' | 'conversation' | 'long-term'; // Context handling
  multiTurn?: boolean; // Supports multi-turn conversations
  playgroundStyle?: boolean; // Self-contained testing agent
}

// Domain Configuration interfaces
export interface DomainUIConfig {
  theme?: {
    primaryColor?: string;
    secondaryColor?: string;
    logoUrl?: string;
  };
  layout?: {
    showDataExplorer?: boolean;
    showInsights?: boolean;
    customNavigation?: boolean;
  };
  features?: {
    enabledModules?: string[];
    hiddenSections?: string[];
  };
  branding?: {
    title?: string;
    subtitle?: string;
    favicon?: string;
  };
}

export interface DomainRoutes {
  chat?: string;
  explorer?: string;
  insights?: string;
  dashboard?: string;
  customRoutes?: Record<string, string>;
}

// Types removed - see consolidated export section below

// Conversations table - CRÍTICO: Adicionar agent_id para rastrear orquestração
export const conversations = pgTable('conversations', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  agent_id: varchar('agent_id').references(() => agents.id), // NOVO: Rastreamento de agente
  user_id: varchar('user_id'),
  message_count: integer('message_count').default(0),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
});

// Message Feedback table
export const messageFeedback = pgTable('message_feedback', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  message_id: text('message_id').notNull(),
  session_id: text('session_id').notNull(),
  model: text('model'),
  helpful: boolean('helpful').notNull(),
  comment: text('comment'),
  user_id: uuid('user_id'),
  created_at: timestamp('created_at').notNull().defaultNow(),
});

// Token Usage / LLM Metrics table
export const tokenUsage = pgTable('llm_metrics', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  created_at: timestamp('created_at').notNull().defaultNow(),
  session_id: uuid('session_id'),
  user_id: uuid('user_id'),
  model_name: text('model_name').notNull(),
  provider: text('provider'),
  prompt_tokens: integer('prompt_tokens').default(0),
  completion_tokens: integer('completion_tokens').default(0),
  total_tokens: integer('total_tokens').default(0),
  execution_time_ms: integer('execution_time_ms'),
  cost: numeric('cost', { precision: 10, scale: 6 }).default('0'),
  request_type: text('request_type'),
  success: boolean('success').default(true),
  error_message: text('error_message'),
  metadata: json('metadata').default({}),
});

// QA Test Cases table
export const qaTestCases = pgTable('qa_test_cases', {
  id: serial('id').primaryKey(),
  test_id: varchar('test_id', { length: 100 }).unique().notNull(),
  query: text('query').notNull(),
  expected_keywords: text('expected_keywords').array().notNull(),
  category: varchar('category', { length: 50 }).notNull(),
  complexity: varchar('complexity', { length: 20 }).notNull(),
  min_response_length: integer('min_response_length'),
  expected_response: text('expected_response'),
  is_active: boolean('is_active').default(true),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
});

// QA Validation Runs table
export const qaValidationRuns = pgTable('qa_validation_runs', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  model: text('model').notNull(),
  started_at: timestamp('started_at').notNull().defaultNow(),
  completed_at: timestamp('completed_at'),
  total_tests: integer('total_tests').default(0),
  passed_tests: integer('passed_tests').default(0),
  overall_accuracy: numeric('overall_accuracy', { precision: 5, scale: 2 }),
  results: json('results').default([]),
  metadata: json('metadata').default({}),
});

// QA Token Usage table
export const qaTokenUsage = pgTable('qa_token_usage', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  validation_run_id: uuid('validation_run_id').references(() => qaValidationRuns.id),
  test_case_id: uuid('test_case_id').references(() => qaTestCases.id),
  model: text('model').notNull(),
  input_tokens: integer('input_tokens').notNull(),
  output_tokens: integer('output_tokens').notNull(),
  total_tokens: integer('total_tokens').notNull(),
  estimated_cost: numeric('estimated_cost', { precision: 10, scale: 6 }),
  created_at: timestamp('created_at').notNull().defaultNow(),
});

// Quality Metrics table
export const qualityMetrics = pgTable('quality_metrics', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  timestamp: timestamp('timestamp').notNull().defaultNow(),
  model: text('model'),
  accuracy: numeric('accuracy', { precision: 5, scale: 2 }),
  response_time: integer('response_time'),
  satisfaction_rate: numeric('satisfaction_rate', { precision: 5, scale: 2 }),
  error_rate: numeric('error_rate', { precision: 5, scale: 2 }),
  metadata: json('metadata').default({}),
});

// Query Cache table
export const queryCache = pgTable('query_cache', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  query_hash: varchar('query_hash', { length: 64 }).unique().notNull(),
  query_text: text('query_text').notNull(),
  response: text('response').notNull(),
  model: text('model'),
  confidence: numeric('confidence', { precision: 5, scale: 2 }),
  metadata: json('metadata').default({}),
  created_at: timestamp('created_at').notNull().defaultNow(),
  expires_at: timestamp('expires_at'),
});

// Domain Configurations table - Sistema multi-domínio
export const domainConfigs = pgTable('domain_configs', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  slug: varchar('slug', { length: 50 }).unique().notNull(), // 'plano-diretor', 'plac', 'licenciamento-ambiental'
  name: varchar('name', { length: 100 }).notNull(), // 'Plano Diretor', 'PLAC', 'Licenciamento Ambiental'
  display_name: varchar('display_name', { length: 150 }).notNull(),
  description: text('description'),
  icon: varchar('icon', { length: 50 }), // Lucide icon name
  primary_color: varchar('primary_color', { length: 7 }).default('#29625D'), // Hex color
  secondary_color: varchar('secondary_color', { length: 7 }).default('#1A4D47'),
  logo_url: text('logo_url'),
  is_active: boolean('is_active').notNull().default(true),
  is_default: boolean('is_default').notNull().default(false),
  ui_config: json('ui_config').default({}), // Custom UI configurations
  agent_ids: text('agent_ids').array().default([]), // Array of associated agent IDs
  routes: json('routes').default({}), // Custom route configurations
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
});

// Export all types
export type Agent = typeof agents.$inferSelect;
export type InsertAgent = typeof agents.$inferInsert;

export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = typeof conversations.$inferInsert;

export type MessageFeedback = typeof messageFeedback.$inferSelect;
export type InsertMessageFeedback = typeof messageFeedback.$inferInsert;

export type TokenUsage = typeof tokenUsage.$inferSelect;
export type InsertTokenUsage = typeof tokenUsage.$inferInsert;

export type QATestCase = typeof qaTestCases.$inferSelect;
export type InsertQATestCase = typeof qaTestCases.$inferInsert;

export type QAValidationRun = typeof qaValidationRuns.$inferSelect;
export type InsertQAValidationRun = typeof qaValidationRuns.$inferInsert;

export type DomainConfig = typeof domainConfigs.$inferSelect;
export type InsertDomainConfig = typeof domainConfigs.$inferInsert;

// Export types for use in application
export type { Json } from 'drizzle-orm';