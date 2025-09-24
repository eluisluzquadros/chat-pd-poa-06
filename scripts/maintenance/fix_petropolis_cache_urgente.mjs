// Script URGENTE para limpar cache de queries genéricas com Petrópolis
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzYwOTAxNywiZXhwIjoyMDY5MTg1MDE3fQ.7jVZP70RAjpfFPfehZt5Gr3vSxn8DZ3YyPJNjCwZXEo';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixPetropolisCache() {
  console.log('🚨 FIX URGENTE - LIMPEZA DE CACHE COM PETRÓPOLIS INCORRETO\n');
  
  // 1. Buscar todas as queries que mencionam Petrópolis mas NÃO deveriam
  console.log('1️⃣ Buscando entradas incorretas no cache...');
  
  const { data: cacheEntries, error: searchError } = await supabase
    .from('query_cache')
    .select('key, query, response, created_at')
    .ilike('response', '%petrópolis%')
    .not('query', 'ilike', '%petrópolis%')
    .not('query', 'ilike', '%petropolis%');
  
  if (searchError) {
    console.error('Erro ao buscar cache:', searchError);
    return;
  }
  
  console.log(`\n📊 Encontradas ${cacheEntries?.length || 0} entradas suspeitas:`);
  
  const problematicQueries = [];
  cacheEntries?.forEach(entry => {
    // Verificar se a query não menciona Petrópolis mas a resposta sim
    const queryLower = entry.query.toLowerCase();
    const responseLower = entry.response.toLowerCase();
    
    if (!queryLower.includes('petrópolis') && 
        !queryLower.includes('petropolis') &&
        responseLower.includes('petrópolis')) {
      console.log(`\n❌ PROBLEMA: "${entry.query}"`);
      console.log(`   Criado em: ${entry.created_at}`);
      problematicQueries.push(entry.key);
      
      // Mostrar trecho da resposta com Petrópolis
      const start = responseLower.indexOf('petrópolis');
      if (start !== -1) {
        console.log(`   Resposta: "...${entry.response.substring(Math.max(0, start - 30), start + 50)}..."`);
      }
    }
  });
  
  // 2. Deletar entradas problemáticas
  if (problematicQueries.length > 0) {
    console.log(`\n🗑️  Deletando ${problematicQueries.length} entradas problemáticas...`);
    
    const { error: deleteError } = await supabase
      .from('query_cache')
      .delete()
      .in('key', problematicQueries);
    
    if (deleteError) {
      console.error('❌ Erro ao deletar:', deleteError);
    } else {
      console.log('✅ Cache limpo com sucesso!');
    }
  }
  
  // 3. Deletar também queries genéricas específicas
  console.log('\n2️⃣ Limpando queries genéricas conhecidas...');
  
  const genericQueries = [
    'altura máxima da construção dos prédios em porto alegre',
    'como poderá ser feito a flexibilizaçao de recuo de jardim?',
    'qual a altura máxima permitida?',
    'coeficiente de aproveitamento em porto alegre',
    'qual é o coeficiente máximo de aproveitamento?',
    'quais são os coeficientes de aproveitamento básico e máximo no plano diretor?'
  ];
  
  for (const query of genericQueries) {
    const { error } = await supabase
      .from('query_cache')
      .delete()
      .ilike('query', query);
    
    if (!error) {
      console.log(`✅ Limpo: "${query}"`);
    }
  }
  
  // 4. Testar uma query problemática
  console.log('\n\n3️⃣ Testando query após limpeza...');
  console.log('Query: "Altura máxima da construção dos prédios em porto alegre"\n');
  
  const response = await fetch(`${supabaseUrl}/functions/v1/agentic-rag`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2MDkwMTcsImV4cCI6MjA2OTE4NTAxN30.K3uyyzjyAQ17ohQGCUFx_RiMufblLyQzvxEZHakqKrg`,
      'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2MDkwMTcsImV4cCI6MjA2OTE4NTAxN30.K3uyyzjyAQ17ohQGCUFx_RiMufblLyQzvxEZHakqKrg'
    },
    body: JSON.stringify({
      message: 'Altura máxima da construção dos prédios em porto alegre',
      sessionId: `fix-test-${Date.now()}`,
      bypassCache: true
    })
  });
  
  const result = await response.json();
  const hasPetropolis = result.response?.toLowerCase().includes('petrópolis');
  
  console.log(`Contém Petrópolis: ${hasPetropolis ? '❌ SIM (AINDA COM PROBLEMA)' : '✅ NÃO (CORRIGIDO)'}`);
  
  if (!hasPetropolis) {
    console.log('\n✅ SUCESSO! A query não está mais retornando dados de Petrópolis.');
  } else {
    console.log('\n⚠️  ATENÇÃO: O problema persiste. Necessário investigar mais profundamente.');
  }
  
  console.log('\n📋 Recomendação: O problema principal é que "porto alegre" está sendo detectado como nome de bairro.');
  console.log('   Solução: Modificar o query-analyzer para NÃO tratar "porto alegre" como bairro.');
}

fixPetropolisCache().catch(console.error);