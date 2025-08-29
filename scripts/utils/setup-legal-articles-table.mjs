#!/usr/bin/env node
/**
 * Setup legal_articles table in Supabase
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupTable() {
  console.log('🔧 Setting up legal_articles table...');
  
  try {
    // Check if table exists
    const { data: tables } = await supabase
      .from('legal_articles')
      .select('id')
      .limit(1);
    
    if (tables !== null) {
      console.log('✅ Table legal_articles already exists');
      return true;
    }
  } catch (error) {
    console.log('📦 Table does not exist, will create it');
  }
  
  // Create table using SQL
  const createTableSQL = `
    -- Create legal_articles table if not exists
    CREATE TABLE IF NOT EXISTS legal_articles (
      id TEXT PRIMARY KEY,
      content TEXT NOT NULL,
      embedding vector(1536),
      metadata JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    
    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_legal_articles_metadata 
      ON legal_articles USING GIN (metadata);
    
    CREATE INDEX IF NOT EXISTS idx_legal_articles_created_at 
      ON legal_articles (created_at DESC);
  `;
  
  console.log('📝 Executing SQL to create table...');
  
  // Note: Direct SQL execution via Supabase client is not supported
  // You need to run this SQL directly in Supabase dashboard
  
  console.log('\n⚠️  Please run the following SQL in your Supabase dashboard:');
  console.log('📍 Go to: SQL Editor in Supabase Dashboard');
  console.log('📋 Copy and paste this SQL:\n');
  console.log('```sql');
  console.log(createTableSQL);
  console.log('```\n');
  
  console.log('After creating the table, run the knowledge base processor again.');
  
  return false;
}

async function main() {
  console.log('🚀 Legal Articles Table Setup');
  console.log('================================\n');
  
  const success = await setupTable();
  
  if (success) {
    console.log('\n✅ Setup complete! You can now process documents.');
  } else {
    console.log('\n⏳ Please complete the manual step above first.');
  }
}

main().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});