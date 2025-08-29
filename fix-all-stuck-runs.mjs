#!/usr/bin/env node

import fetch from 'node-fetch';

const SUPABASE_URL = 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2MDkwMTcsImV4cCI6MjA2OTE4NTAxN30.K3uyyzjyAQ17ohQGCUFx_RiMufblLyQzvxEZHakqKrg';

console.log('🔧 Corrigindo todas as runs travadas no banco de dados\n');
console.log('=' .repeat(60));

async function fixAllStuckRuns() {
  try {
    // First, fix stuck runs
    console.log('📊 Corrigindo runs com status "running"...\n');
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/qa-fix-stuck-runs`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Correção concluída!\n');
      console.log(`   Runs travadas encontradas: ${result.stuckRuns}`);
      console.log(`   Runs corrigidas: ${result.fixedRuns.length}`);
      console.log(`   Runs incompletas encontradas: ${result.incompleteRuns}`);
      console.log(`   Runs incompletas corrigidas: ${result.fixedIncompleteRuns.length}`);
      
      if (result.fixedRuns.length > 0) {
        console.log('\n📝 IDs das runs corrigidas:');
        result.fixedRuns.forEach(id => console.log(`   - ${id}`));
      }
    } else {
      console.log('❌ Erro na correção:', result.error);
    }
    
    // Now check current status
    console.log('\n📊 Verificando status atual do banco...\n');
    
    const statusResponse = await fetch(`${SUPABASE_URL}/rest/v1/qa_validation_runs?select=id,model,status,started_at&order=started_at.desc&limit=10`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY
      }
    });
    
    const runs = await statusResponse.json();
    
    console.log('Últimas 10 runs:');
    runs.forEach(run => {
      const statusEmoji = run.status === 'completed' ? '✅' : 
                         run.status === 'running' ? '⚠️' : '❌';
      console.log(`   ${statusEmoji} ${run.model} - ${run.status} - ${new Date(run.started_at).toLocaleString('pt-BR')}`);
    });
    
  } catch (error) {
    console.error('❌ Erro ao corrigir runs:', error.message);
  }
}

// Executar correção
fixAllStuckRuns().then(() => {
  console.log('\n' + '=' .repeat(60));
  console.log('✨ Correção finalizada!');
}).catch(console.error);