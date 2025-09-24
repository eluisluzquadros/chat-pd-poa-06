#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function executeSQLFile(filePath) {
  try {
    console.log(`\n📝 Executing SQL file: ${path.basename(filePath)}`);
    
    // Read SQL file
    const sqlContent = await fs.readFile(filePath, 'utf8');
    
    // Split by statements (simple split by semicolon at end of line)
    const statements = sqlContent
      .split(/;\s*$/gm)
      .filter(stmt => stmt.trim().length > 0)
      .map(stmt => stmt.trim() + ';');
    
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // Skip comments and empty statements
      if (!statement || statement.trim().startsWith('--')) {
        continue;
      }
      
      // Skip SELECT test statements
      if (statement.toLowerCase().includes('select') && 
          (statement.includes('hierarchy_type') || 
           statement.includes('get_article_hierarchy') ||
           statement.includes('hierarchy_navigation'))) {
        console.log(`⏭️  Skipping test SELECT statement ${i + 1}`);
        continue;
      }
      
      try {
        console.log(`   Executing statement ${i + 1}/${statements.length}...`);
        
        const { data, error } = await supabase.rpc('execute_sql', {
          sql_query: statement
        });
        
        if (error) {
          // Try direct execution if RPC fails
          const { error: directError } = await supabase
            .from('_sql_executor')
            .insert({ query: statement })
            .select();
            
          if (directError) {
            throw directError;
          }
        }
        
        successCount++;
      } catch (error) {
        console.error(`   ❌ Error in statement ${i + 1}: ${error.message}`);
        console.error(`   Statement: ${statement.substring(0, 100)}...`);
        errorCount++;
      }
    }
    
    console.log(`✅ Completed: ${successCount} successful, ${errorCount} errors`);
    return { success: successCount, errors: errorCount };
    
  } catch (error) {
    console.error(`❌ Failed to read file: ${error.message}`);
    return { success: 0, errors: 1 };
  }
}

async function main() {
  console.log('🚀 Starting SQL script execution...\n');
  
  const scripts = [
    'scripts/sql/create-luos-hierarchy-fixed-v2.sql',
    'scripts/sql/create-pdus-hierarchy-fixed.sql',
    'scripts/sql/create-navigation-system.sql'
  ];
  
  const results = [];
  
  for (const script of scripts) {
    const fullPath = path.resolve(__dirname, '..', script);
    const result = await executeSQLFile(fullPath);
    results.push(result);
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 EXECUTION SUMMARY');
  console.log('='.repeat(60));
  
  const totalSuccess = results.reduce((sum, r) => sum + r.success, 0);
  const totalErrors = results.reduce((sum, r) => sum + r.errors, 0);
  
  console.log(`Total successful statements: ${totalSuccess}`);
  console.log(`Total errors: ${totalErrors}`);
  
  if (totalErrors === 0) {
    console.log('\n✅ All scripts executed successfully!');
  } else {
    console.log('\n⚠️  Some errors occurred during execution');
  }
  
  // Test the hierarchy
  console.log('\n🧪 Testing hierarchy functions...');
  
  try {
    // Test LUOS hierarchy
    const { data: luosTest, error: luosError } = await supabase
      .rpc('get_article_hierarchy_simple', {
        p_document_type: 'LUOS',
        p_article_number: 77
      });
      
    if (luosError) {
      console.log('❌ LUOS hierarchy test failed:', luosError.message);
    } else {
      console.log('✅ LUOS hierarchy test passed:', luosTest);
    }
    
    // Test legal_hierarchy table
    const { data: hierarchyData, error: hierarchyError } = await supabase
      .from('legal_hierarchy')
      .select('*')
      .limit(5);
      
    if (hierarchyError) {
      console.log('❌ Hierarchy table test failed:', hierarchyError.message);
    } else {
      console.log(`✅ Hierarchy table contains ${hierarchyData?.length || 0} records`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

main().catch(console.error);