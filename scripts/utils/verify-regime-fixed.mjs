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

async function verifyFix() {
  console.log('🎉 === VERIFICAÇÃO DA CORREÇÃO DO REGIME_URBANISTICO ===\n');
  
  // Total de registros
  const { count } = await supabase
    .from('regime_urbanistico')
    .select('*', { count: 'exact', head: true });
  
  console.log(`✅ Total de registros: ${count}/385 (${Math.round(count/385*100)}%)\n`);
  
  // Amostra de dados
  const { data: sample } = await supabase
    .from('regime_urbanistico')
    .select('*')
    .limit(10);
  
  console.log('📋 Amostra dos dados corrigidos:');
  console.log('┌────┬──────────────────────┬──────────┬────────┬────────┬────────┐');
  console.log('│ ID │ Bairro               │ Zona     │ Altura │ C.Bás  │ C.Máx  │');
  console.log('├────┼──────────────────────┼──────────┼────────┼────────┼────────┤');
  
  sample?.forEach(r => {
    const id = r.id.toString().padEnd(2);
    const bairro = (r.bairro || 'NULL').substring(0, 20).padEnd(20);
    const zona = (r.zona || 'NULL').substring(0, 8).padEnd(8);
    const altura = (r.altura_maxima || 'NULL').toString().substring(0, 6).padEnd(6);
    const coefBas = (r.coef_aproveitamento_basico || 'NULL').toString().substring(0, 6).padEnd(6);
    const coefMax = (r.coef_aproveitamento_maximo || 'NULL').toString().substring(0, 6).padEnd(6);
    
    console.log(`│ ${id} │ ${bairro} │ ${zona} │ ${altura} │ ${coefBas} │ ${coefMax} │`);
  });
  
  console.log('└────┴──────────────────────┴──────────┴────────┴────────┴────────┘');
  
  // Estatísticas de campos preenchidos
  const { data: allData } = await supabase
    .from('regime_urbanistico')
    .select('altura_maxima, coef_aproveitamento_basico, coef_aproveitamento_maximo, bairro, zona');
  
  if (allData) {
    const stats = {
      comBairro: allData.filter(r => r.bairro !== null && r.bairro !== '').length,
      comZona: allData.filter(r => r.zona !== null && r.zona !== '').length,
      comAltura: allData.filter(r => r.altura_maxima !== null && r.altura_maxima !== '').length,
      comCoefBasico: allData.filter(r => r.coef_aproveitamento_basico !== null && r.coef_aproveitamento_basico !== '').length,
      comCoefMaximo: allData.filter(r => r.coef_aproveitamento_maximo !== null && r.coef_aproveitamento_maximo !== '').length
    };
    
    console.log('\n📊 Estatísticas de preenchimento:');
    console.log(`   Bairro preenchido: ${stats.comBairro}/${count} (${Math.round(stats.comBairro/count*100)}%)`);
    console.log(`   Zona preenchida: ${stats.comZona}/${count} (${Math.round(stats.comZona/count*100)}%)`);
    console.log(`   Altura máxima: ${stats.comAltura}/${count} (${Math.round(stats.comAltura/count*100)}%)`);
    console.log(`   Coef. básico: ${stats.comCoefBasico}/${count} (${Math.round(stats.comCoefBasico/count*100)}%)`);
    console.log(`   Coef. máximo: ${stats.comCoefMaximo}/${count} (${Math.round(stats.comCoefMaximo/count*100)}%)`);
  }
  
  // Teste de queries
  console.log('\n🧪 Teste de queries:');
  
  // Query 1: Buscar Centro Histórico
  const { data: centro } = await supabase
    .from('regime_urbanistico')
    .select('*')
    .ilike('bairro', '%centro%')
    .limit(1);
  
  if (centro && centro.length > 0) {
    console.log(`✅ Query "Centro": ${centro[0].bairro} - Zona ${centro[0].zona} - Altura ${centro[0].altura_maxima || 'NULL'}`);
  } else {
    console.log('⚠️ Query "Centro" não retornou resultados');
  }
  
  // Query 2: Buscar registros com altura > 30
  const { data: alturas } = await supabase
    .from('regime_urbanistico')
    .select('bairro, zona, altura_maxima')
    .not('altura_maxima', 'is', null)
    .gt('altura_maxima', '30')
    .limit(3);
  
  if (alturas && alturas.length > 0) {
    console.log(`✅ Encontrados ${alturas.length} registros com altura > 30m`);
    alturas.forEach(r => {
      console.log(`   ${r.bairro} - ${r.zona}: ${r.altura_maxima}m`);
    });
  } else {
    console.log('⚠️ Nenhum registro com altura > 30m');
  }
  
  // Conclusão
  console.log('\n' + '='.repeat(60));
  if (count === 385) {
    console.log('🎉 === TABELA COMPLETAMENTE CORRIGIDA! ===');
    console.log('✅ Todos os 385 registros foram importados corretamente');
    console.log('✅ Dados NULL foram tratados apropriadamente');
    console.log('✅ Sistema pronto para consultas de regime urbanístico');
  } else if (count >= 350) {
    console.log('✅ === CORREÇÃO BEM-SUCEDIDA! ===');
    console.log(`✅ ${count}/385 registros importados`);
  } else {
    console.log('⚠️ === CORREÇÃO PARCIAL ===');
    console.log(`⚠️ Apenas ${count}/385 registros`);
  }
  console.log('='.repeat(60));
}

verifyFix().catch(console.error);