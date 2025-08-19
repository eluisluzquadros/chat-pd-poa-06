#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function verifyCompleteHierarchy() {
  console.log('🔍 VERIFICAÇÃO COMPLETA DA HIERARQUIA\n');
  console.log('=' .repeat(60));
  
  // 1. Check hierarchy counts
  console.log('\n📊 CONTAGEM DE ELEMENTOS:');
  console.log('-'.repeat(40));
  
  const { data: counts, error: countError } = await supabase
    .from('legal_hierarchy')
    .select('document_type, hierarchy_type')
    .order('document_type');
    
  if (countError) {
    console.error('❌ Erro:', countError.message);
    return;
  }
  
  // Group counts
  const summary = {};
  counts.forEach(item => {
    const key = `${item.document_type} - ${item.hierarchy_type}`;
    summary[key] = (summary[key] || 0) + 1;
  });
  
  Object.entries(summary).forEach(([key, count]) => {
    console.log(`  ${key}: ${count}`);
  });
  
  // 2. Test get_complete_hierarchy function
  console.log('\n🧪 TESTE DA FUNÇÃO get_complete_hierarchy:');
  console.log('-'.repeat(40));
  
  const testCases = [
    { doc: 'LUOS', art: 119, desc: 'Art. 119 LUOS (Disposições Transitórias)' },
    { doc: 'LUOS', art: 77, desc: 'Art. 77 LUOS (Taxa de Permeabilidade)' },
    { doc: 'LUOS', art: 4, desc: 'Art. 4 LUOS (Zoneamento)' },
    { doc: 'PDUS', art: 1, desc: 'Art. 1 PDUS (Disposições Gerais)' },
    { doc: 'PDUS', art: 60, desc: 'Art. 60 PDUS (Macrozona 1)' }
  ];
  
  for (const test of testCases) {
    const { data, error } = await supabase.rpc('get_complete_hierarchy', {
      doc_type: test.doc,
      art_num: test.art
    });
    
    if (error) {
      console.log(`❌ ${test.desc}: Erro - ${error.message}`);
    } else {
      console.log(`✅ ${test.desc}:`);
      console.log(`   ${data || 'Não encontrado'}`);
    }
  }
  
  // 3. Check PDUS data
  console.log('\n📚 ESTRUTURA DO PDUS:');
  console.log('-'.repeat(40));
  
  const { data: pdusPartes } = await supabase
    .from('legal_hierarchy')
    .select('hierarchy_number, hierarchy_name, article_start, article_end')
    .eq('document_type', 'PDUS')
    .eq('hierarchy_type', 'parte')
    .order('order_index');
    
  if (pdusPartes && pdusPartes.length > 0) {
    console.log('PARTES:');
    pdusPartes.forEach(parte => {
      console.log(`  PARTE ${parte.hierarchy_number}: ${parte.hierarchy_name}`);
      console.log(`    Arts. ${parte.article_start} a ${parte.article_end}`);
    });
  } else {
    console.log('❌ Nenhuma parte do PDUS encontrada');
  }
  
  // 4. Check LUOS complete structure
  console.log('\n📚 ESTRUTURA COMPLETA DA LUOS:');
  console.log('-'.repeat(40));
  
  const { data: luosCapitulos } = await supabase
    .from('legal_hierarchy')
    .select('hierarchy_number, hierarchy_name, parent_id')
    .eq('document_type', 'LUOS')
    .eq('hierarchy_type', 'capitulo')
    .order('order_index');
    
  if (luosCapitulos && luosCapitulos.length > 0) {
    console.log(`CAPÍTULOS: ${luosCapitulos.length} encontrados`);
    luosCapitulos.slice(0, 3).forEach(cap => {
      console.log(`  CAP ${cap.hierarchy_number}: ${cap.hierarchy_name}`);
    });
  } else {
    console.log('❌ Nenhum capítulo da LUOS encontrado');
  }
  
  const { data: luosSecoes } = await supabase
    .from('legal_hierarchy')
    .select('hierarchy_number, hierarchy_name')
    .eq('document_type', 'LUOS')
    .eq('hierarchy_type', 'secao')
    .order('order_index');
    
  if (luosSecoes && luosSecoes.length > 0) {
    console.log(`SEÇÕES: ${luosSecoes.length} encontradas`);
    luosSecoes.forEach(sec => {
      console.log(`  SEÇÃO ${sec.hierarchy_number}: ${sec.hierarchy_name}`);
    });
  } else {
    console.log('❌ Nenhuma seção da LUOS encontrada');
  }
  
  // 5. Check article_metadata table
  console.log('\n📋 TABELA article_metadata:');
  console.log('-'.repeat(40));
  
  const { data: metadataCheck, error: metadataError } = await supabase
    .from('article_metadata')
    .select('count')
    .limit(1);
    
  if (metadataError) {
    if (metadataError.message.includes('does not exist')) {
      console.log('⚠️  Tabela article_metadata não existe');
    } else {
      console.log('❌ Erro:', metadataError.message);
    }
  } else {
    console.log('✅ Tabela article_metadata existe');
  }
  
  // 6. Final summary
  console.log('\n' + '=' .repeat(60));
  console.log('📊 RESUMO FINAL:');
  console.log('=' .repeat(60));
  
  const totalElements = Object.values(summary).reduce((sum, count) => sum + count, 0);
  const hasLUOS = Object.keys(summary).some(k => k.includes('LUOS'));
  const hasPDUS = Object.keys(summary).some(k => k.includes('PDUS'));
  
  console.log(`Total de elementos: ${totalElements}`);
  console.log(`LUOS configurada: ${hasLUOS ? '✅' : '❌'}`);
  console.log(`PDUS configurado: ${hasPDUS ? '✅' : '❌'}`);
  
  if (totalElements > 20) {
    console.log('\n✅ HIERARQUIA COMPLETA INSTALADA COM SUCESSO!');
  } else {
    console.log('\n⚠️  Hierarquia parcialmente instalada');
  }
}

verifyCompleteHierarchy().catch(console.error);