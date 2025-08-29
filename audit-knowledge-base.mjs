#!/usr/bin/env node
/**
 * Auditoria completa da base de conhecimento
 * Verifica se todos os elementos da LUOS e PDUS estão presentes
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function auditKnowledgeBase() {
  console.log('🔍 AUDITORIA COMPLETA DA BASE DE CONHECIMENTO');
  console.log('=' .repeat(60));
  
  // 1. Contar total de documentos
  console.log('\n📊 ESTATÍSTICAS GERAIS:');
  
  const { count: totalDocs } = await supabase
    .from('legal_articles')
    .select('*', { count: 'exact', head: true });
  
  const { count: luosDocs } = await supabase
    .from('legal_articles')
    .select('*', { count: 'exact', head: true })
    .eq('document_type', 'LUOS');
  
  const { count: pdusDocs } = await supabase
    .from('legal_articles')
    .select('*', { count: 'exact', head: true })
    .eq('document_type', 'PDUS');
  
  console.log(`  Total de documentos: ${totalDocs}`);
  console.log(`  Documentos LUOS: ${luosDocs}`);
  console.log(`  Documentos PDUS: ${pdusDocs}`);
  
  // 2. Verificar artigos da LUOS
  console.log('\n📖 ARTIGOS DA LUOS:');
  
  const { data: luosArticles } = await supabase
    .from('legal_articles')
    .select('article_number')
    .eq('document_type', 'LUOS')
    .lt('article_number', 9000)
    .order('article_number');
  
  if (luosArticles) {
    const numbers = luosArticles.map(a => a.article_number);
    const min = Math.min(...numbers);
    const max = Math.max(...numbers);
    console.log(`  Artigos regulares: ${min} a ${max} (${numbers.length} artigos)`);
    
    // Verificar gaps
    const gaps = [];
    for (let i = min; i <= max; i++) {
      if (!numbers.includes(i)) {
        gaps.push(i);
      }
    }
    if (gaps.length > 0) {
      console.log(`  ⚠️ Artigos faltando: ${gaps.slice(0, 10).join(', ')}${gaps.length > 10 ? '...' : ''}`);
    }
  }
  
  // 3. Verificar hierarquia da LUOS
  console.log('\n📚 HIERARQUIA DA LUOS:');
  
  const { data: luosHierarchy } = await supabase
    .from('legal_articles')
    .select('article_number, full_content')
    .eq('document_type', 'LUOS')
    .gte('article_number', 9000)
    .order('article_number');
  
  if (luosHierarchy) {
    const titles = [];
    const chapters = [];
    const sections = [];
    
    luosHierarchy.forEach(h => {
      const content = h.full_content || '';
      if (content.includes('TÍTULO')) {
        const match = content.match(/TÍTULO\s+([IVX]+|[0-9]+)/);
        if (match) titles.push(match[0]);
      }
      if (content.includes('CAPÍTULO')) {
        const match = content.match(/CAPÍTULO\s+([IVX]+|[0-9]+)/);
        if (match) chapters.push(match[0]);
      }
      if (content.includes('SEÇÃO') || content.includes('SECAO')) {
        const match = content.match(/SE[ÇC]ÃO\s+([IVX]+|[0-9]+)/);
        if (match) sections.push(match[0]);
      }
    });
    
    console.log(`  Títulos encontrados: ${titles.length}`);
    titles.forEach(t => console.log(`    - ${t}`));
    
    console.log(`  Capítulos encontrados: ${chapters.length}`);
    console.log(`  Seções encontradas: ${sections.length}`);
  }
  
  // 4. Verificar Título X especificamente
  console.log('\n🔎 VERIFICAÇÃO DO TÍTULO X:');
  
  // Buscar por "Disposições Finais"
  const { data: disposicoesFinais } = await supabase
    .from('legal_articles')
    .select('article_number, full_content')
    .eq('document_type', 'LUOS')
    .or('full_content.ilike.%disposições finais%,full_content.ilike.%título x%')
    .limit(5);
  
  if (disposicoesFinais && disposicoesFinais.length > 0) {
    console.log('  ✅ Encontradas referências a Disposições Finais:');
    disposicoesFinais.forEach(d => {
      console.log(`    Art#${d.article_number}: ${d.full_content?.substring(0, 100)}...`);
    });
  } else {
    console.log('  ❌ TÍTULO X NÃO ENCONTRADO!');
    console.log('     O Título X deveria conter "Das Disposições Finais e Transitórias"');
  }
  
  // Verificar artigos 119-121
  const { data: arts119121 } = await supabase
    .from('legal_articles')
    .select('article_number, full_content')
    .eq('document_type', 'LUOS')
    .in('article_number', [119, 120, 121]);
  
  if (arts119121 && arts119121.length > 0) {
    console.log(`  ✅ Artigos 119-121 encontrados (${arts119121.length}/3)`);
    arts119121.forEach(a => {
      console.log(`    - Art. ${a.article_number}º presente`);
    });
  } else {
    console.log('  ⚠️ Artigos 119-121 não encontrados');
  }
  
  // 5. Verificar estrutura do PDUS
  console.log('\n📘 ESTRUTURA DO PDUS:');
  
  const { data: pdusHierarchy } = await supabase
    .from('legal_articles')
    .select('article_number, full_content')
    .eq('document_type', 'PDUS')
    .gte('article_number', 9000)
    .limit(20)
    .order('article_number');
  
  if (pdusHierarchy) {
    const pdusTitles = [];
    pdusHierarchy.forEach(h => {
      const content = h.full_content || '';
      if (content.includes('TÍTULO')) {
        const match = content.match(/TÍTULO\s+([IVX]+|[0-9]+)/);
        if (match) pdusTitles.push(match[0]);
      }
    });
    console.log(`  Títulos do PDUS: ${pdusTitles.length}`);
    pdusTitles.forEach(t => console.log(`    - ${t}`));
  }
  
  // 6. Verificar completude da base
  console.log('\n📋 ANÁLISE DE COMPLETUDE:');
  
  const issues = [];
  
  // Verificar se tem Título X
  const { count: tituloXCount } = await supabase
    .from('legal_articles')
    .select('*', { count: 'exact', head: true })
    .or('full_content.ilike.%título x%,article_number.eq.9350');
  
  if (!tituloXCount || tituloXCount === 0) {
    issues.push('❌ TÍTULO X da LUOS está FALTANDO na base');
  }
  
  // Verificar se tem artigos de transição
  if (!arts119121 || arts119121.length < 3) {
    issues.push('⚠️ Artigos de Disposições Transitórias incompletos');
  }
  
  // Verificar embeddings
  const { count: noEmbedding } = await supabase
    .from('legal_articles')
    .select('*', { count: 'exact', head: true })
    .is('embedding', null);
  
  if (noEmbedding > 0) {
    issues.push(`⚠️ ${noEmbedding} documentos sem embeddings`);
  }
  
  if (issues.length > 0) {
    console.log('\n🚨 PROBLEMAS ENCONTRADOS:');
    issues.forEach(i => console.log(`  ${i}`));
  } else {
    console.log('  ✅ Base de conhecimento aparenta estar completa');
  }
  
  // 7. Recomendações
  console.log('\n💡 RECOMENDAÇÕES:');
  if (!tituloXCount || tituloXCount === 0) {
    console.log('  1. ADICIONAR TÍTULO X - Das Disposições Finais e Transitórias');
    console.log('     Este título deve conter os artigos 119, 120 e 121');
    console.log('     É essencial para completude da LUOS');
  }
  
  if (noEmbedding > 0) {
    console.log('  2. Gerar embeddings para todos os documentos');
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log('AUDITORIA CONCLUÍDA');
}

auditKnowledgeBase().catch(console.error);