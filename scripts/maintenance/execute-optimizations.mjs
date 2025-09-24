import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

async function executeOptimizations() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ngrqwmvuhvjkeohesbxs.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  
  console.log('📊 Executing FASE 3 SQL optimizations...');
  
  try {
    const sql = readFileSync('./scripts/emergency-sql/16-optimize-indexes.sql', 'utf8');
    
    // Execute SQL in smaller chunks to avoid timeout
    const sqlStatements = sql.split(';').filter(stmt => stmt.trim().length > 0);
    
    console.log(`Executing ${sqlStatements.length} SQL statements...`);
    
    for (let i = 0; i < sqlStatements.length; i++) {
      const statement = sqlStatements[i].trim();
      if (statement) {
        console.log(`[${i + 1}/${sqlStatements.length}] Executing statement...`);
        
        try {
          const { error } = await supabase.rpc('exec_sql', { 
            sql_query: statement + ';' 
          });
          
          if (error) {
            console.error(`❌ Error in statement ${i + 1}:`, error.message);
          } else {
            console.log(`✅ Statement ${i + 1} completed`);
          }
        } catch (err) {
          console.error(`💥 Exception in statement ${i + 1}:`, err.message);
        }
      }
    }
    
    console.log('📈 All optimizations attempted');
    
    // Check final index status
    console.log('📊 Checking index performance...');
    const { data: indexes, error: indexError } = await supabase.rpc('exec_sql', {
      sql_query: `
        SELECT 
          i.indexrelname as index_name,
          t.relname as table_name,
          pg_size_pretty(pg_relation_size(i.indexrelid)) as index_size
        FROM pg_stat_user_indexes s
        JOIN pg_class i ON i.oid = s.indexrelid  
        JOIN pg_class t ON t.oid = s.relid
        WHERE s.schemaname = 'public' 
          AND i.indexrelname LIKE 'idx_%'
        ORDER BY pg_relation_size(i.indexrelid) DESC
        LIMIT 10;
      `
    });
    
    if (indexError) {
      console.error('❌ Index check error:', indexError.message);
    } else if (indexes) {
      console.log('📊 Top Indexes Created:');
      indexes.forEach(idx => {
        console.log(`  ${idx.index_name} on ${idx.table_name}: ${idx.index_size}`);
      });
    }
    
  } catch (err) {
    console.error('💥 Execution error:', err.message);
  }
}

executeOptimizations().then(() => {
  console.log('🎯 FASE 3 optimization execution completed');
  process.exit(0);
}).catch(err => {
  console.error('💥 Fatal error:', err);
  process.exit(1);
});