#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

// Configurações
const SUPABASE_URL = 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2MDkwMTcsImV4cCI6MjA2OTE4NTAxN30.K3uyyzjyAQ17ohQGCUFx_RiMufblLyQzvxEZHakqKrg';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzYwOTAxNywiZXhwIjoyMDY5MTg1MDE3fQ.7jVZP70RAjpfFPfehZt5Gr3vSxn8DZ3YyPJNjCwZXEo';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function checkDatabaseHealth() {
  console.log('\n📊 DATABASE HEALTH CHECK');
  console.log('========================');
  
  try {
    // Check documents
    const { data: docsData, error: docsError } = await supabase
      .from('documents')
      .select('count', { count: 'exact' });
    
    console.log(`✅ Documents table: ${docsData || 0} records`);
    
    // Check chunks
    const { data: chunksData, error: chunksError } = await supabase
      .from('document_chunks')
      .select('count', { count: 'exact' });
    
    console.log(`✅ Document chunks: ${chunksData || 0} records`);
    
    // Check regime urbanístico
    const { data: regimeData, error: regimeError } = await supabase
      .from('regime_urbanistico')
      .select('count', { count: 'exact' });
    
    console.log(`✅ Regime urbanístico: ${regimeData || 0} records`);
    
    // Check cache
    const { data: cacheData, error: cacheError } = await supabase
      .from('query_cache')
      .select('count', { count: 'exact' });
    
    console.log(`✅ Query cache: ${cacheData || 0} entries`);
    
    // Check recent activity
    const { data: recentQueries } = await supabase
      .from('user_queries')
      .select('created_at')
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (recentQueries && recentQueries.length > 0) {
      const lastQuery = new Date(recentQueries[0].created_at);
      const minutesAgo = Math.floor((Date.now() - lastQuery) / 1000 / 60);
      console.log(`✅ Last user query: ${minutesAgo} minutes ago`);
    }
    
  } catch (error) {
    console.error('❌ Database check failed:', error.message);
  }
}

async function checkEdgeFunctions() {
  console.log('\n🚀 EDGE FUNCTIONS HEALTH CHECK');
  console.log('==============================');
  
  const functions = [
    'query-analyzer',
    'agentic-rag',
    'enhanced-vector-search',
    'response-synthesizer',
    'sql-generator'
  ];
  
  for (const func of functions) {
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/${func}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ health: 'check' })
      });
      
      if (response.status === 200 || response.status === 400) {
        console.log(`✅ ${func}: Online`);
      } else {
        console.log(`⚠️  ${func}: Status ${response.status}`);
      }
    } catch (error) {
      console.log(`❌ ${func}: Offline`);
    }
  }
}

async function checkPerformance() {
  console.log('\n⚡ PERFORMANCE CHECK');
  console.log('===================');
  
  const testQuery = "O que é o Plano Diretor?";
  const startTime = Date.now();
  
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/agentic-rag`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        query: testQuery,
        sessionId: `perf-test-${Date.now()}`,
        stream: false
      })
    });
    
    const responseTime = Date.now() - startTime;
    
    if (response.ok) {
      console.log(`✅ Response time: ${responseTime}ms`);
      
      if (responseTime < 1000) {
        console.log('🚀 Performance: Excellent');
      } else if (responseTime < 3000) {
        console.log('✅ Performance: Good');
      } else if (responseTime < 5000) {
        console.log('⚠️  Performance: Needs optimization');
      } else {
        console.log('❌ Performance: Poor');
      }
    } else {
      console.log('❌ Performance test failed');
    }
  } catch (error) {
    console.log('❌ Performance test error:', error.message);
  }
}

async function checkSystemRecommendations() {
  console.log('\n💡 SYSTEM RECOMMENDATIONS');
  console.log('=========================');
  
  const recommendations = [];
  
  // Check if documents exist
  const { count: docCount } = await supabase
    .from('documents')
    .select('count', { count: 'exact' });
  
  if (!docCount || docCount === 0) {
    recommendations.push('📋 Import documents using process-docs-direct.mjs');
  }
  
  // Check if embeddings exist
  const { data: embeddingCheck } = await supabase
    .from('document_chunks')
    .select('embedding')
    .not('embedding', 'is', null)
    .limit(1);
  
  if (!embeddingCheck || embeddingCheck.length === 0) {
    recommendations.push('🔍 Generate embeddings for documents');
  }
  
  // Check cache age
  const { data: oldCache } = await supabase
    .from('query_cache')
    .select('created_at')
    .lt('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    .limit(1);
  
  if (oldCache && oldCache.length > 0) {
    recommendations.push('🧹 Clean old cache entries (> 7 days)');
  }
  
  if (recommendations.length > 0) {
    recommendations.forEach(rec => console.log(rec));
  } else {
    console.log('✅ System is optimized!');
  }
}

async function main() {
  console.log('🏥 CHAT PD POA - SYSTEM HEALTH MONITOR');
  console.log('======================================');
  console.log(`📅 ${new Date().toLocaleString()}`);
  
  await checkDatabaseHealth();
  await checkEdgeFunctions();
  await checkPerformance();
  await checkSystemRecommendations();
  
  console.log('\n✅ Health check complete!');
}

// Run monitor
main().catch(console.error);