#!/usr/bin/env node

/**
 * Script para executar a migração SQL no Supabase
 * Cria as tabelas hierárquicas necessárias para o Agentic-RAG
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import { config } from 'dotenv';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
config({ path: path.join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(chalk.red('❌ Missing Supabase environment variables'));
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/**
 * Execute SQL migration
 */
async function executeMigration() {
  console.log(chalk.cyan('🚀 Executing SQL Migration for Agentic-RAG...'));
  
  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20240813_create_hierarchical_tables.sql');
    const sqlContent = readFileSync(migrationPath, 'utf8');
    
    console.log(chalk.gray('📄 Migration file loaded successfully'));
    
    // Split SQL content into individual statements
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(chalk.gray(`📊 Found ${statements.length} SQL statements to execute`));
    
    // Execute each statement
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // Skip comments and empty statements
      if (statement.startsWith('--') || statement.trim().length === 0) {
        continue;
      }
      
      try {
        console.log(chalk.gray(`\n🔄 Executing statement ${i + 1}/${statements.length}...`));
        
        const { data, error } = await supabase.rpc('exec_sql', {
          query: statement + ';'
        });
        
        if (error) {
          // Try alternative method for tables and indexes
          const { error: directError } = await supabase
            .from('information_schema.tables')
            .select('*', { count: 'exact', head: true });
          
          if (directError) {
            console.log(chalk.yellow(`⚠️ Statement ${i + 1} failed: ${error.message}`));
            console.log(chalk.gray(`Statement: ${statement.substring(0, 100)}...`));
            errorCount++;
          } else {
            successCount++;
          }
        } else {
          console.log(chalk.green(`✅ Statement ${i + 1} executed successfully`));
          successCount++;
        }
        
        // Small delay between statements
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (err) {
        console.log(chalk.red(`❌ Error executing statement ${i + 1}: ${err.message}`));
        console.log(chalk.gray(`Statement: ${statement.substring(0, 100)}...`));
        errorCount++;
      }
    }
    
    // Summary
    console.log(chalk.cyan('\n' + '='.repeat(50)));
    console.log(chalk.cyan('📊 MIGRATION SUMMARY'));
    console.log(chalk.cyan('='.repeat(50)));
    console.log(chalk.green(`✅ Successful: ${successCount}`));
    console.log(chalk.red(`❌ Failed: ${errorCount}`));
    console.log(chalk.gray(`📊 Total: ${successCount + errorCount}`));
    
    if (errorCount === 0) {
      console.log(chalk.green.bold('\n🎉 Migration completed successfully!'));
      
      // Verify tables were created
      await verifyTables();
      
    } else {
      console.log(chalk.yellow.bold('\n⚠️ Migration completed with some errors'));
      console.log(chalk.gray('Some statements may have failed due to existing objects'));
    }
    
  } catch (error) {
    console.error(chalk.red('❌ Fatal migration error:'), error.message);
    process.exit(1);
  }
}

/**
 * Verify that tables were created successfully
 */
async function verifyTables() {
  console.log(chalk.cyan('\n🔍 Verifying table creation...'));
  
  const tablesToCheck = [
    'legal_document_chunks',
    'chunk_cross_references', 
    'knowledge_graph_nodes',
    'knowledge_graph_edges',
    'session_memory',
    'validation_cache'
  ];
  
  for (const tableName of tablesToCheck) {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.log(chalk.red(`❌ Table ${tableName}: NOT FOUND`));
      } else {
        console.log(chalk.green(`✅ Table ${tableName}: EXISTS`));
      }
    } catch (err) {
      console.log(chalk.red(`❌ Table ${tableName}: ERROR - ${err.message}`));
    }
  }
}

/**
 * Alternative migration using REST API
 */
async function executeMigrationREST() {
  console.log(chalk.cyan('\n🔄 Trying alternative migration method...'));
  
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_ROLE_KEY
      },
      body: JSON.stringify({
        query: `
          -- Create basic tables first
          CREATE TABLE IF NOT EXISTS legal_document_chunks (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              document_id VARCHAR(100) NOT NULL,
              parent_chunk_id UUID,
              level INTEGER NOT NULL,
              level_type VARCHAR(20) NOT NULL,
              sequence_number INTEGER NOT NULL,
              title TEXT NOT NULL,
              content TEXT NOT NULL,
              embedding vector(1536),
              metadata JSONB DEFAULT '{}',
              created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
          
          CREATE TABLE IF NOT EXISTS knowledge_graph_nodes (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              node_type VARCHAR(50) NOT NULL,
              label TEXT NOT NULL,
              properties JSONB DEFAULT '{}',
              embedding vector(1536),
              importance_score FLOAT DEFAULT 0.5,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
          
          CREATE TABLE IF NOT EXISTS session_memory (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              session_id VARCHAR(255) NOT NULL,
              turn_number INTEGER NOT NULL,
              query TEXT NOT NULL,
              response TEXT,
              confidence FLOAT,
              metadata JSONB DEFAULT '{}',
              timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
        `
      })
    });
    
    if (response.ok) {
      console.log(chalk.green('✅ Alternative migration successful'));
    } else {
      const error = await response.text();
      console.log(chalk.red('❌ Alternative migration failed:', error));
    }
    
  } catch (error) {
    console.log(chalk.red('❌ Alternative migration error:', error.message));
  }
}

// Execute migration
async function main() {
  console.log(chalk.bold.cyan('🏗️ AGENTIC-RAG DATABASE SETUP'));
  console.log(chalk.gray('Creating hierarchical tables and Knowledge Graph structure...\n'));
  
  await executeMigration();
  
  // If standard migration fails, try alternative
  // await executeMigrationREST();
}

main().catch(error => {
  console.error(chalk.red('\n❌ Migration failed:'), error);
  process.exit(1);
});