#!/usr/bin/env node
/**
 * Validação COMPLETA e RIGOROSA da base de conhecimento
 * Este script verifica se TODOS os elementos esperados estão presentes
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ESTRUTURA COMPLETA DA LUOS DE PORTO ALEGRE
// Atualizada: documento original contém 10 títulos (I-X)
const EXPECTED_LUOS_STRUCTURE = {
  titles: [
    { number: 'I', name: 'Das Disposições Gerais' },
    { number: 'II', name: 'Do Zoneamento' },
    { number: 'III', name: 'Das Atividades' },
    { number: 'IV', name: 'Da Edificação' },
    { number: 'V', name: 'Do Parcelamento do Solo' },
    { number: 'VI', name: 'Dos Instrumentos de Gestão' },
    { number: 'VII', name: 'Das Penalidades' },
    { number: 'VIII', name: 'Do Licenciamento' },
    { number: 'IX', name: 'Das Disposições Gerais e Complementares' },
    { number: 'X', name: 'Das Disposições Finais e Transitórias' }
  ],
  articleRanges: {
    'Título I': { start: 1, end: 8 },
    'Título II': { start: 9, end: 30 },
    'Título III': { start: 31, end: 45 },
    'Título IV': { start: 46, end: 70 },
    'Título V': { start: 71, end: 85 },
    'Título VI': { start: 86, end: 100 },
    'Título VII': { start: 101, end: 110 },
    'Título VIII': { start: 111, end: 118 },
    'Título IX': { start: 119, end: 121 },
    'Título X': { start: 119, end: 121 }  // Disposições Finais
  }
};

async function validateKnowledgeBase() {
  console.log('🔍 VALIDAÇÃO RIGOROSA DA BASE DE CONHECIMENTO');
  console.log('=' .repeat(70));
  
  const errors = [];
  const warnings = [];
  const success = [];
  
  // 1. Verificar TODOS os títulos esperados da LUOS
  console.log('\n📚 VALIDANDO TÍTULOS DA LUOS:');
  
  for (const expectedTitle of EXPECTED_LUOS_STRUCTURE.titles) {
    const searchTerms = [
      `TÍTULO ${expectedTitle.number}`,
      `Título ${expectedTitle.number}`,
      expectedTitle.name
    ];
    
    let found = false;
    
    for (const term of searchTerms) {
      const { count } = await supabase
        .from('legal_articles')
        .select('*', { count: 'exact', head: true })
        .eq('document_type', 'LUOS')
        .ilike('full_content', `%${term}%`);
      
      if (count > 0) {
        found = true;
        break;
      }
    }
    
    if (found) {
      success.push(`✅ Título ${expectedTitle.number} - ${expectedTitle.name}`);
      console.log(`  ✅ Título ${expectedTitle.number} - ${expectedTitle.name}`);
    } else {
      errors.push(`❌ FALTANDO: Título ${expectedTitle.number} - ${expectedTitle.name}`);
      console.log(`  ❌ FALTANDO: Título ${expectedTitle.number} - ${expectedTitle.name}`);
    }
  }
  
  // 2. Verificar artigos esperados
  console.log('\n📖 VALIDANDO ARTIGOS DA LUOS:');
  
  const { data: luosArticles } = await supabase
    .from('legal_articles')
    .select('article_number')
    .eq('document_type', 'LUOS')
    .lt('article_number', 9000)
    .order('article_number');
  
  const articleNumbers = luosArticles?.map(a => a.article_number) || [];
  
  // Verificar artigos críticos (disposições finais)
  const criticalArticles = [119, 120, 121];
  for (const art of criticalArticles) {
    if (articleNumbers.includes(art)) {
      console.log(`  ✅ Art. ${art}º (Disposições Finais) presente`);
    } else {
      errors.push(`❌ FALTANDO: Art. ${art}º (Disposições Finais)`);
      console.log(`  ❌ FALTANDO: Art. ${art}º (Disposições Finais)`);
    }
  }
  
  // 3. Verificar gaps nos artigos
  const minArt = Math.min(...articleNumbers);
  const maxArt = Math.max(...articleNumbers);
  const missingArticles = [];
  
  for (let i = minArt; i <= maxArt; i++) {
    if (!articleNumbers.includes(i)) {
      missingArticles.push(i);
    }
  }
  
  if (missingArticles.length > 0) {
    warnings.push(`⚠️ ${missingArticles.length} artigos faltando entre ${minArt} e ${maxArt}`);
    console.log(`  ⚠️ Artigos faltando: ${missingArticles.slice(0, 10).join(', ')}${missingArticles.length > 10 ? '...' : ''}`);
  }
  
  // 4. Verificar embeddings
  console.log('\n🔮 VALIDANDO EMBEDDINGS:');
  
  const { count: totalDocs } = await supabase
    .from('legal_articles')
    .select('*', { count: 'exact', head: true });
  
  const { count: docsWithEmbedding } = await supabase
    .from('legal_articles')
    .select('*', { count: 'exact', head: true })
    .not('embedding', 'is', null);
  
  const { count: docsWithoutEmbedding } = await supabase
    .from('legal_articles')
    .select('*', { count: 'exact', head: true })
    .is('embedding', null);
  
  console.log(`  Total de documentos: ${totalDocs}`);
  console.log(`  Com embeddings: ${docsWithEmbedding}`);
  console.log(`  Sem embeddings: ${docsWithoutEmbedding}`);
  
  if (docsWithoutEmbedding > 0) {
    warnings.push(`⚠️ ${docsWithoutEmbedding} documentos sem embeddings`);
  }
  
  // 5. Verificar keywords
  console.log('\n🏷️ VALIDANDO KEYWORDS:');
  
  const { data: titleX } = await supabase
    .from('legal_articles')
    .select('keywords')
    .eq('document_type', 'LUOS')
    .eq('article_number', 9350)
    .single();
  
  if (titleX?.keywords?.includes('Título X')) {
    console.log('  ✅ Título X tem keywords corretas');
  } else {
    warnings.push('⚠️ Título X sem keywords adequadas');
    console.log('  ⚠️ Título X sem keywords adequadas');
  }
  
  // 6. Verificar estrutura do PDUS
  console.log('\n📘 VALIDANDO PDUS:');
  
  const { count: pdusCount } = await supabase
    .from('legal_articles')
    .select('*', { count: 'exact', head: true })
    .eq('document_type', 'PDUS');
  
  console.log(`  Total de elementos do PDUS: ${pdusCount}`);
  
  // 7. Relatório Final
  console.log('\n' + '=' .repeat(70));
  console.log('📊 RELATÓRIO DE VALIDAÇÃO:');
  console.log('=' .repeat(70));
  
  if (errors.length === 0) {
    console.log('\n✅ NENHUM ERRO CRÍTICO ENCONTRADO');
  } else {
    console.log('\n🚨 ERROS CRÍTICOS ENCONTRADOS:');
    errors.forEach(e => console.log(`  ${e}`));
  }
  
  if (warnings.length > 0) {
    console.log('\n⚠️ AVISOS:');
    warnings.forEach(w => console.log(`  ${w}`));
  }
  
  // 8. Status Final
  console.log('\n📈 STATUS FINAL:');
  const completeness = ((success.length / EXPECTED_LUOS_STRUCTURE.titles.length) * 100).toFixed(1);
  console.log(`  Completude dos Títulos: ${completeness}%`);
  console.log(`  Erros Críticos: ${errors.length}`);
  console.log(`  Avisos: ${warnings.length}`);
  
  if (errors.length === 0 && warnings.length === 0) {
    console.log('\n✅ BASE DE CONHECIMENTO ESTÁ COMPLETA E VALIDADA!');
  } else {
    console.log('\n❌ BASE DE CONHECIMENTO PRECISA DE CORREÇÕES!');
    console.log('   Execute as correções necessárias antes de afirmar que está completa.');
  }
  
  return {
    isComplete: errors.length === 0,
    errors,
    warnings,
    completeness
  };
}

// Executar validação
validateKnowledgeBase()
  .then(result => {
    if (!result.isComplete) {
      process.exit(1);  // Exit with error code if not complete
    }
  })
  .catch(console.error);