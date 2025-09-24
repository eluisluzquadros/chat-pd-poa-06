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

async function checkStatus() {
  console.log('📊 === STATUS ATUAL DA BASE DE CONHECIMENTO ===');
  console.log(`📅 ${new Date().toLocaleString('pt-BR')}\n`);
  
  // 1. Total de document_sections
  const { count: totalSections } = await supabase
    .from('document_sections')
    .select('*', { count: 'exact', head: true });
  
  console.log(`📚 Total document_sections: ${totalSections || 0}`);
  
  // 2. Buscar metadados para contar por fonte
  const { data: sections } = await supabase
    .from('document_sections')
    .select('metadata')
    .not('metadata', 'is', null);
  
  const sourceCounts = {};
  if (sections) {
    sections.forEach(row => {
      const source = row.metadata?.source_file || 'unknown';
      sourceCounts[source] = (sourceCounts[source] || 0) + 1;
    });
  }
  
  console.log('\n📋 Document sections por fonte:');
  Object.entries(sourceCounts).forEach(([source, count]) => {
    console.log(`   ${source}: ${count}`);
  });
  
  // 3. Verificar regime urbanístico
  const { count: regimeCount } = await supabase
    .from('regime_urbanistico')
    .select('*', { count: 'exact', head: true });
  
  console.log(`\n🏗️ Total regime_urbanistico: ${regimeCount || 0}`);
  
  // 4. Calcular completude
  const expectedValues = {
    qa: 1400,
    regime: 385,
    luos: 162,
    plano: 341,
    objetivos: 25
  };
  
  const actualQA = sourceCounts['PDPOA2025-QA.docx'] || 0;
  const actualLUOS = sourceCounts['PDPOA2025-Minuta_Preliminar_LUOS.docx'] || 0;
  const actualPlano = sourceCounts['PDPOA2025-Minuta_Preliminar_PLANO_DIRETOR.docx'] || 0;
  const actualObjetivos = sourceCounts['PDPOA2025-Objetivos_Previstos.docx'] || 0;
  
  console.log('\n📈 === ANÁLISE DE COMPLETUDE ===\n');
  console.log('┌────────────────────┬──────────┬──────────┬────────────┐');
  console.log('│ Componente         │ Esperado │ Atual    │ Completo   │');
  console.log('├────────────────────┼──────────┼──────────┼────────────┤');
  console.log(`│ Q&A                │ ${expectedValues.qa.toString().padEnd(8)} │ ${actualQA.toString().padEnd(8)} │ ${Math.round(actualQA/expectedValues.qa*100).toString().padStart(3)}%       │`);
  console.log(`│ Regime Urbanístico │ ${expectedValues.regime.toString().padEnd(8)} │ ${(regimeCount || 0).toString().padEnd(8)} │ ${Math.round((regimeCount || 0)/expectedValues.regime*100).toString().padStart(3)}%       │`);
  console.log(`│ LUOS               │ ${expectedValues.luos.toString().padEnd(8)} │ ${actualLUOS.toString().padEnd(8)} │ ${Math.round(actualLUOS/expectedValues.luos*100).toString().padStart(3)}%       │`);
  console.log(`│ Plano Diretor      │ ${expectedValues.plano.toString().padEnd(8)} │ ${actualPlano.toString().padEnd(8)} │ ${Math.round(actualPlano/expectedValues.plano*100).toString().padStart(3)}%       │`);
  console.log(`│ Objetivos          │ ${expectedValues.objetivos.toString().padEnd(8)} │ ${actualObjetivos.toString().padEnd(8)} │ ${Math.round(actualObjetivos/expectedValues.objetivos*100).toString().padStart(3)}%       │`);
  console.log('└────────────────────┴──────────┴──────────┴────────────┘');
  
  // 5. Completude geral
  const totalExpected = Object.values(expectedValues).reduce((a, b) => a + b, 0);
  const totalActual = actualQA + actualLUOS + actualPlano + actualObjetivos + (regimeCount || 0);
  const overallCompleteness = Math.round(totalActual / totalExpected * 100);
  
  console.log(`\n📊 COMPLETUDE GERAL: ${overallCompleteness}%`);
  
  if (overallCompleteness >= 90) {
    console.log('🎉 Base de conhecimento está COMPLETA!');
  } else if (overallCompleteness >= 70) {
    console.log('✅ Base de conhecimento está BOA!');
  } else if (overallCompleteness >= 50) {
    console.log('⚠️ Base de conhecimento está PARCIAL');
  } else {
    console.log('❌ Base de conhecimento precisa de mais processamento');
  }
  
  // 6. Recomendações
  console.log('\n💡 === RECOMENDAÇÕES ===\n');
  
  if (actualQA < expectedValues.qa * 0.8) {
    console.log('• Processar mais pares Q&A do documento PDPOA2025-QA.docx');
  }
  if ((regimeCount || 0) < expectedValues.regime * 0.8) {
    console.log('• Completar importação do regime urbanístico');
  }
  if (actualLUOS < expectedValues.luos * 0.8) {
    console.log('• Reprocessar documento LUOS');
  }
  if (actualPlano < expectedValues.plano * 0.8) {
    console.log('• Reprocessar documento Plano Diretor');
  }
  
  console.log('\n✅ Verificação concluída!');
}

checkStatus().catch(console.error);