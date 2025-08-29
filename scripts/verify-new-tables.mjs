#!/usr/bin/env node
// Verificar as novas tabelas estruturadas

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzYwOTAxNywiZXhwIjoyMDY5MTg1MDE3fQ.7jVZP70RAjpfFPfehZt5Gr3vSxn8DZ3YyPJNjCwZXEo';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkNewTables() {
  console.log('🔍 Verificando novas tabelas estruturadas...\n');

  // 1. Verificar regime_urbanistico
  console.log('📊 Tabela: regime_urbanistico');
  const { data: regime, error: regimeError } = await supabase
    .from('regime_urbanistico')
    .select('*')
    .order('altura_maxima', { ascending: false })
    .limit(10);

  if (regimeError) {
    console.log('   ❌ Erro:', regimeError.message);
  } else {
    console.log(`   ✅ ${regime?.length || 0} registros encontrados`);
    if (regime && regime.length > 0) {
      console.log('   📏 Top 5 alturas máximas:');
      regime.slice(0, 5).forEach(r => {
        console.log(`      ${r.zona || r.zot}: ${r.altura_maxima}m`);
      });
    }
  }

  // 2. Verificar zots_bairros
  console.log('\n📊 Tabela: zots_bairros');
  const { data: zots, error: zotsError } = await supabase
    .from('zots_bairros')
    .select('*')
    .limit(5);

  if (zotsError) {
    console.log('   ❌ Erro:', zotsError.message);
  } else {
    console.log(`   ✅ ${zots?.length || 0} registros encontrados`);
    if (zots && zots.length > 0) {
      console.log('   🏘️ Primeiros registros:');
      zots.forEach(z => {
        console.log(`      Bairro: ${z.bairro}, ZOT: ${z.zot}`);
      });
    }
  }

  // 3. Verificar bairros_risco_desastre
  console.log('\n📊 Tabela: bairros_risco_desastre');
  const { data: riscos, error: riscosError } = await supabase
    .from('bairros_risco_desastre')
    .select('*')
    .limit(5);

  if (riscosError) {
    console.log('   ❌ Erro:', riscosError.message);
  } else {
    console.log(`   ✅ ${riscos?.length || 0} registros encontrados`);
    if (riscos && riscos.length > 0) {
      console.log('   ⚠️ Primeiros registros:');
      riscos.forEach(r => {
        console.log(`      Bairro: ${r.bairro}, Risco: ${r.tipo_risco || 'N/A'}`);
      });
    }
  }

  // 4. Testar query para altura máxima
  console.log('\n🎯 Teste de Query - Altura Máxima da ZOT 8:');
  const { data: zot8, error: zot8Error } = await supabase
    .from('regime_urbanistico')
    .select('zona, zot, altura_maxima')
    .or('zona.ilike.%ZOT 08%,zot.ilike.%ZOT 08%,zona.ilike.%ZOT 8%,zot.ilike.%ZOT 8%')
    .order('altura_maxima', { ascending: false });

  if (zot8Error) {
    console.log('   ❌ Erro:', zot8Error.message);
  } else {
    console.log(`   ✅ ${zot8?.length || 0} variações da ZOT 8 encontradas`);
    zot8?.forEach(z => {
      console.log(`      ${z.zona || z.zot}: ${z.altura_maxima}m`);
    });
  }
}

checkNewTables().catch(console.error);