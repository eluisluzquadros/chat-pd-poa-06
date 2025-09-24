#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkCache() {
  const { data, count } = await supabase
    .from('query_cache')
    .select('query_text, query_type, hit_count, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .limit(15);
  
  console.log('\n📊 CACHE STATUS:');
  console.log('=====================================');
  console.log(`Total entries: ${count}`);
  
  if (data && data.length > 0) {
    console.log('\nÚltimas queries em cache:');
    data.forEach((entry, idx) => {
      const query = entry.query_text.substring(0, 50);
      console.log(`  ${idx + 1}. [${entry.query_type}] ${query}... (hits: ${entry.hit_count})`);
    });
    
    // Estatísticas
    const qaCount = data.filter(e => e.query_type === 'qa').length;
    const regimeCount = data.filter(e => e.query_type === 'regime').length;
    const generalCount = data.filter(e => e.query_type === 'general').length;
    const totalHits = data.reduce((sum, e) => sum + (e.hit_count || 0), 0);
    
    console.log('\n📈 Estatísticas:');
    console.log(`  Q&A: ${qaCount}`);
    console.log(`  Regime: ${regimeCount}`);
    console.log(`  General: ${generalCount}`);
    console.log(`  Total hits: ${totalHits}`);
  } else {
    console.log('❌ Cache vazio!');
  }
}

checkCache().catch(console.error);