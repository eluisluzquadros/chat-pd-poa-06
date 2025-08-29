#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2MDkwMTcsImV4cCI6MjA2OTE4NTAxN30.K3uyyzjyAQ17ohQGCUFx_RiMufblLyQzvxEZHakqKrg';

const supabase = createClient(SUPABASE_URL, ANON_KEY);

async function debugQATestCases() {
  console.log('🔍 Verificando casos de teste QA no banco de dados...\n');
  
  try {
    // Contar total de casos
    const { count: totalCount, error: countError } = await supabase
      .from('qa_test_cases')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.error('❌ Erro ao contar casos:', countError);
      return;
    }
    
    console.log(`📊 Total de casos de teste: ${totalCount}`);
    
    // Buscar TODOS os casos para debug
    const { data: allCases, error: allError } = await supabase
      .from('qa_test_cases')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (allError) {
      console.error('❌ Erro ao buscar todos os casos:', allError);
    } else {
      console.log('\n🔍 Analisando estrutura dos casos:');
      if (allCases && allCases.length > 0) {
        const firstCase = allCases[0];
        console.log('Campos disponíveis:', Object.keys(firstCase).join(', '));
        console.log('\nPrimeiro caso completo:', JSON.stringify(firstCase, null, 2));
      }
    }
    
    // Buscar casos ativos
    const { data: activeCases, error: activeError } = await supabase
      .from('qa_test_cases')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    
    if (activeError) {
      console.error('❌ Erro ao buscar casos ativos:', activeError);
      return;
    }
    
    console.log(`✅ Casos ativos: ${activeCases?.length || 0}`);
    
    // Agrupar por categoria
    if (activeCases && activeCases.length > 0) {
      const byCategory = activeCases.reduce((acc, tc) => {
        acc[tc.category] = (acc[tc.category] || 0) + 1;
        return acc;
      }, {});
      
      console.log('\n📂 Casos por categoria:');
      Object.entries(byCategory).forEach(([cat, count]) => {
        console.log(`  - ${cat}: ${count}`);
      });
      
      // Agrupar por dificuldade
      const byDifficulty = activeCases.reduce((acc, tc) => {
        acc[tc.difficulty] = (acc[tc.difficulty] || 0) + 1;
        return acc;
      }, {});
      
      console.log('\n📈 Casos por dificuldade:');
      Object.entries(byDifficulty).forEach(([diff, count]) => {
        console.log(`  - ${diff}: ${count}`);
      });
      
      // Mostrar alguns exemplos
      console.log('\n📝 Primeiros 5 casos:');
      activeCases.slice(0, 5).forEach((tc, idx) => {
        console.log(`\n${idx + 1}. ${tc.question}`);
        console.log(`   Categoria: ${tc.category} | Dificuldade: ${tc.difficulty}`);
        console.log(`   ID: ${tc.id}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

debugQATestCases();