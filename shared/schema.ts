import { boolean, json, pgTable, serial, text, timestamp, varchar } from 'drizzle-orm/pg-core';
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

// Types
export type Agent = typeof agents.$inferSelect;
export type InsertAgent = typeof agents.$inferInsert;

// Export types for use in application
export type { Json } from 'drizzle-orm';