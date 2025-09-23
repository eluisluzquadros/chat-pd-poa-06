#!/usr/bin/env node

/**
 * Verify completeness of knowledge base import
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import chalk from 'chalk';

dotenv.config({ path: '.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ngrqwmvuhvjkeohesbxs.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function verifyCompleteness() {
  console.log(chalk.bold.cyan('\n🔍 VERIFICAÇÃO COMPLETA DA BASE DE CONHECIMENTO\n'));
  console.log(chalk.gray('=' .repeat(70)));
  
  // 1. Contar arquivos físicos
  console.log(chalk.bold.blue('\n📁 ARQUIVOS NA PASTA knowledge_base_complete:'));
  console.log('  chunks_juridicos: 807 arquivos');
  console.log('  chunks_qa: 141 arquivos');
  console.log('  chunks_regime_urbanistico_consolidado: 959 arquivos');
  console.log(chalk.bold('  TOTAL: 1.907 arquivos'));
  
  // 2. Contar registros no banco
  const { count: totalArticles } = await supabase
    .from('legal_articles')
    .select('*', { count: 'exact', head: true });
  
  const { count: totalQA } = await supabase
    .from('qa_test_cases')
    .select('*', { count: 'exact', head: true });
  
  console.log(chalk.bold.blue('\n💾 REGISTROS NO BANCO DE DADOS:'));
  console.log(`  legal_articles: ${totalArticles}`);
  console.log(`  qa_test_cases: ${totalQA}`);
  console.log(chalk.bold(`  TOTAL: ${totalArticles + totalQA}`));
  
  // 3. Análise por tipo
  console.log(chalk.bold.blue('\n📊 DISTRIBUIÇÃO POR TIPO:'));
  
  const types = ['LUOS', 'PDUS', 'REGIME_FALLBACK', 'QA_CATEGORY'];
  for (const type of types) {
    const { count } = await supabase
      .from('legal_articles')
      .select('*', { count: 'exact', head: true })
      .eq('document_type', type);
    
    console.log(`  ${type}: ${count || 0}`);
  }
  
  // 4. Verificar hierarquia
  console.log(chalk.bold.blue('\n📚 ELEMENTOS HIERÁRQUICOS:'));
  
  // LUOS
  const { count: luosArticles } = await supabase
    .from('legal_articles')
    .select('*', { count: 'exact', head: true })
    .eq('document_type', 'LUOS')
    .lt('article_number', 10000);
  
  const { count: luosHierarchy } = await supabase
    .from('legal_articles')
    .select('*', { count: 'exact', head: true })
    .eq('document_type', 'LUOS')
    .gte('article_number', 10000);
  
  console.log(`  LUOS:`);
  console.log(`    - Artigos (1-9999): ${luosArticles}`);
  console.log(`    - Hierárquicos (10000+): ${luosHierarchy}`);
  
  // PDUS
  const { count: pdusArticles } = await supabase
    .from('legal_articles')
    .select('*', { count: 'exact', head: true })
    .eq('document_type', 'PDUS')
    .lt('article_number', 9000);
  
  const { count: pdusHierarchy } = await supabase
    .from('legal_articles')
    .select('*', { count: 'exact', head: true })
    .eq('document_type', 'PDUS')
    .gte('article_number', 9000);
  
  console.log(`  PDUS:`);
  console.log(`    - Artigos (1-8999): ${pdusArticles}`);
  console.log(`    - Hierárquicos (9000+): ${pdusHierarchy}`);
  
  // 5. Verificar bairros e zonas
  console.log(chalk.bold.blue('\n🏗️ REGIME URBANÍSTICO:'));
  
  const { data: regimeData } = await supabase
    .from('legal_articles')
    .select('keywords')
    .eq('document_type', 'REGIME_FALLBACK');
  
  const bairros = new Set();
  const zonas = new Set();
  
  regimeData?.forEach(r => {
    r.keywords?.forEach(k => {
      if (k.startsWith('BAIRRO_')) bairros.add(k);
      if (k.startsWith('ZONA_') || k.startsWith('ZOT_')) zonas.add(k);
    });
  });
  
  console.log(`  Bairros únicos: ${bairros.size}`);
  console.log(`  Zonas únicas: ${zonas.size}`);
  
  // Lista esperada de bairros (94 bairros de Porto Alegre)
  const bairrosEsperados = 94;
  const zonasEsperadas = 16; // ZOT 01 a 16
  
  console.log(`  Taxa de cobertura bairros: ${((bairros.size / bairrosEsperados) * 100).toFixed(1)}%`);
  console.log(`  Taxa de cobertura zonas: ${((zonas.size / zonasEsperadas) * 100).toFixed(1)}%`);
  
  // 6. Verificar embeddings
  console.log(chalk.bold.blue('\n🤖 STATUS DOS EMBEDDINGS:'));
  
  const { count: withEmbeddings } = await supabase
    .from('legal_articles')
    .select('*', { count: 'exact', head: true })
    .not('embedding', 'is', null);
  
  const { count: withoutEmbeddings } = await supabase
    .from('legal_articles')
    .select('*', { count: 'exact', head: true })
    .is('embedding', null);
  
  const embeddingRate = (withEmbeddings / totalArticles) * 100;
  
  console.log(`  Com embeddings: ${withEmbeddings} (${embeddingRate.toFixed(1)}%)`);
  console.log(`  Sem embeddings: ${withoutEmbeddings}`);
  
  // 7. Verificar keywords
  console.log(chalk.bold.blue('\n🔑 STATUS DAS KEYWORDS:'));
  
  const { count: withKeywords } = await supabase
    .from('legal_articles')
    .select('*', { count: 'exact', head: true })
    .not('keywords', 'is', null);
  
  const keywordRate = (withKeywords / totalArticles) * 100;
  
  console.log(`  Com keywords: ${withKeywords} (${keywordRate.toFixed(1)}%)`);
  
  // 8. Análise final
  console.log(chalk.gray('\n' + '=' .repeat(70)));
  console.log(chalk.bold.cyan('📈 ANÁLISE DE COMPLETUDE:\n'));
  
  const totalExpected = 1907;
  const totalImported = totalArticles + totalQA;
  const completenessRate = (totalImported / totalExpected) * 100;
  
  console.log(`  📁 Arquivos esperados: ${totalExpected}`);
  console.log(`  💾 Registros importados: ${totalImported}`);
  console.log(`  📊 Taxa de completude: ${completenessRate.toFixed(1)}%`);
  
  // Progress bar
  const barLength = 50;
  const filled = Math.round((completenessRate / 100) * barLength);
  const bar = '█'.repeat(Math.min(filled, barLength)) + '░'.repeat(Math.max(0, barLength - filled));
  console.log(`\n  [${bar}] ${completenessRate.toFixed(1)}%`);
  
  // Status
  if (completenessRate >= 100) {
    console.log(chalk.bold.green('\n✅ IMPORTAÇÃO COMPLETA COM SUCESSO!'));
    console.log(chalk.green('   Todos os dados foram importados e estão disponíveis.'));
  } else if (completenessRate >= 95) {
    console.log(chalk.bold.yellow('\n⚠️ IMPORTAÇÃO QUASE COMPLETA'));
    console.log(chalk.yellow('   Mais de 95% dos dados foram importados.'));
  } else {
    console.log(chalk.bold.red('\n❌ IMPORTAÇÃO INCOMPLETA'));
    console.log(chalk.red('   Alguns dados importantes podem estar faltando.'));
  }
  
  // Funcionalidades
  console.log(chalk.bold.cyan('\n🚀 FUNCIONALIDADES DISPONÍVEIS:'));
  
  const features = [
    { name: 'Busca por keywords', available: keywordRate >= 99, rate: keywordRate },
    { name: 'Busca semântica (embeddings)', available: embeddingRate >= 99, rate: embeddingRate },
    { name: 'Busca hierárquica', available: luosHierarchy > 0 && pdusHierarchy > 0 },
    { name: 'Busca por bairro/zona', available: bairros.size >= 90 },
    { name: 'Base QA', available: totalQA >= 100 }
  ];
  
  features.forEach(f => {
    const status = f.available ? chalk.green('✅') : chalk.red('❌');
    const rateStr = f.rate ? ` (${f.rate.toFixed(1)}%)` : '';
    console.log(`  ${status} ${f.name}${rateStr}`);
  });
  
  // Recomendações
  if (completenessRate < 100 || embeddingRate < 99) {
    console.log(chalk.bold.yellow('\n⚠️ RECOMENDAÇÕES:'));
    
    if (completenessRate < 100) {
      const missing = totalExpected - totalImported;
      console.log(chalk.yellow(`  • Verificar ${missing} arquivos não importados`));
    }
    
    if (embeddingRate < 99) {
      console.log(chalk.yellow(`  • Gerar embeddings para ${withoutEmbeddings} registros`));
      console.log(chalk.gray('    Execute: npm run kb:embeddings'));
    }
  }
  
  console.log(chalk.gray('\n' + '=' .repeat(70) + '\n'));
}

// Execute verification
verifyCompleteness().catch(error => {
  console.error(chalk.red('❌ Erro:', error));
  process.exit(1);
});