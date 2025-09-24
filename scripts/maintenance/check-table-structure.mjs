#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
try {
  const envContent = readFileSync(join(__dirname, '.env.local'), 'utf8');
  const envVars = {};
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      envVars[key.trim()] = value.trim();
    }
  });
  
  Object.assign(process.env, envVars);
} catch (error) {
  console.error('Error loading .env.local:', error.message);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkTableStructure() {
  console.log('🔍 Checking table structures...\n');

  try {
    // Check documents table
    const { data: docs, error: docsError } = await supabase
      .from('documents')
      .select('*')
      .limit(1);

    if (docsError) {
      console.error('Error checking documents table:', docsError);
    } else {
      console.log('📄 Documents table columns:');
      if (docs.length > 0) {
        Object.keys(docs[0]).forEach(col => console.log(`  - ${col}`));
      }
    }

    // Check document_embeddings table
    const { data: embeddings, error: embError } = await supabase
      .from('document_embeddings')
      .select('*')
      .limit(1);

    if (embError) {
      console.error('\n❌ Error checking document_embeddings table:', embError.message);
      console.log('This suggests the table structure needs to be updated or created.');
    } else {
      console.log('\n🧠 Document_embeddings table columns:');
      if (embeddings.length > 0) {
        Object.keys(embeddings[0]).forEach(col => console.log(`  - ${col}`));
      } else {
        console.log('  (Table exists but is empty)');
      }
    }

    // Try to check for any embeddings-related tables
    const { data: allEmbeddings, error: allEmbError } = await supabase
      .rpc('get_table_names');

    if (!allEmbError && allEmbeddings) {
      console.log('\n📊 Available tables containing "embedding":');
      allEmbeddings
        .filter(table => table.name.includes('embedding'))
        .forEach(table => console.log(`  - ${table.name}`));
    }

    // Check if there are any embeddings stored somewhere
    console.log('\n🔍 Searching for existing embeddings data...');

    // Try different possible table names
    const possibleTables = ['document_embeddings', 'embeddings', 'chunk_embeddings', 'vector_embeddings'];
    
    for (const tableName of possibleTables) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);
        
        if (!error && data) {
          console.log(`✅ Found table: ${tableName}`);
          if (data.length > 0) {
            console.log(`   Columns: ${Object.keys(data[0]).join(', ')}`);
          } else {
            console.log(`   (Empty table)`);
          }
        }
      } catch (e) {
        // Table doesn't exist, continue
      }
    }

  } catch (error) {
    console.error('Error checking table structure:', error);
  }
}

checkTableStructure().catch(console.error);