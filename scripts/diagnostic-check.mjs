#!/usr/bin/env node

/**
 * DIAGNOSTIC CHECK - VERIFICAÇÃO RÁPIDA DO SISTEMA
 * Identifica problemas específicos na base de dados
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import chalk from 'chalk';

dotenv.config({ path: '.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ngrqwmvuhvjkeohesbxs.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Check if specific articles exist
 */
async function checkArticles() {
  console.log(chalk.bold.blue('\n📚 VERIFICANDO ARTIGOS ESPECÍFICOS\n'));
  
  const articlesToCheck = [
    { number: 1, law: 'LUOS', description: 'Instituição da LUOS' },
    { number: 5, law: 'LUOS', description: 'Zoneamento' },
    { number: 38, law: 'LUOS', description: 'Artigo problemático no teste' },
    { number: 119, law: 'LUOS', description: 'Disposições' },
    { number: 1, law: 'PDUS', description: 'Instituição do PDUS' },
    { number: 3, law: 'PDUS', description: 'Princípios' },
    { number: 5, law: 'PDUS', description: 'Objetivos' }
  ];
  
  for (const article of articlesToCheck) {
    const { data, error } = await supabase
      .from('legal_articles')
      .select('id, article_number, document_type, title')
      .eq('article_number', article.number)
      .eq('document_type', article.law)
      .single();
    
    if (data) {
      console.log(chalk.green(`✅ ${article.law} Art. ${article.number}: FOUND`));
      console.log(chalk.gray(`   Title: ${data.title || 'N/A'}`));
    } else {
      console.log(chalk.red(`❌ ${article.law} Art. ${article.number}: NOT FOUND`));
      console.log(chalk.gray(`   Expected: ${article.description}`));
    }
  }
}

/**
 * Check hierarchy structure
 */
async function checkHierarchy() {
  console.log(chalk.bold.blue('\n🏗️ VERIFICANDO ESTRUTURA HIERÁRQUICA\n'));
  
  // Check for TÍTULO, CAPÍTULO, SEÇÃO
  const hierarchyPatterns = [
    { pattern: '%TÍTULO I%', type: 'Título I' },
    { pattern: '%CAPÍTULO I%', type: 'Capítulo I' },
    { pattern: '%SEÇÃO I%', type: 'Seção I' },
    { pattern: '%PARTE I%', type: 'Parte I' }
  ];
  
  for (const hier of hierarchyPatterns) {
    const { data, count } = await supabase
      .from('legal_articles')
      .select('*', { count: 'exact', head: true })
      .or(`full_content.ilike.${hier.pattern},title.ilike.${hier.pattern}`);
    
    if (count > 0) {
      console.log(chalk.green(`✅ ${hier.type}: ${count} occurrences`));
    } else {
      console.log(chalk.red(`❌ ${hier.type}: NOT FOUND`));
    }
  }
  
  // Check legal_hierarchy table
  const { data: hierarchyTable, error } = await supabase
    .from('legal_hierarchy')
    .select('*')
    .limit(5);
  
  if (error) {
    console.log(chalk.red('\n❌ Table legal_hierarchy: NOT ACCESSIBLE'));
    console.log(chalk.gray(`   Error: ${error.message}`));
  } else if (hierarchyTable && hierarchyTable.length > 0) {
    console.log(chalk.green(`\n✅ Table legal_hierarchy: ${hierarchyTable.length} records`));
  } else {
    console.log(chalk.yellow('\n⚠️ Table legal_hierarchy: EMPTY'));
  }
}

/**
 * Check for certification and volumetric content
 */
async function checkSpecificConcepts() {
  console.log(chalk.bold.blue('\n🔍 VERIFICANDO CONCEITOS ESPECÍFICOS\n'));
  
  const concepts = [
    { term: 'certificação', context: 'sustentabilidade ambiental' },
    { term: 'regime volumétrico', context: 'LUOS' },
    { term: 'altura máxima', context: 'metros' },
    { term: 'coeficiente de aproveitamento', context: 'básico máximo' }
  ];
  
  for (const concept of concepts) {
    const { data, count } = await supabase
      .from('legal_articles')
      .select('*', { count: 'exact', head: true })
      .ilike('full_content', `%${concept.term}%`);
    
    if (count > 0) {
      console.log(chalk.green(`✅ "${concept.term}": ${count} occurrences`));
      
      // Check if context is also present
      const { count: contextCount } = await supabase
        .from('legal_articles')
        .select('*', { count: 'exact', head: true })
        .ilike('full_content', `%${concept.term}%`)
        .ilike('full_content', `%${concept.context}%`);
      
      if (contextCount > 0) {
        console.log(chalk.gray(`   With context "${concept.context}": ${contextCount}`));
      }
    } else {
      console.log(chalk.red(`❌ "${concept.term}": NOT FOUND`));
    }
  }
}

/**
 * Check data completeness
 */
async function checkDataCompleteness() {
  console.log(chalk.bold.blue('\n📊 VERIFICANDO COMPLETUDE DOS DADOS\n'));
  
  // Count articles by law
  const laws = ['PDUS', 'LUOS', 'COE'];
  
  for (const law of laws) {
    const { count } = await supabase
      .from('legal_articles')
      .select('*', { count: 'exact', head: true })
      .eq('document_type', law);
    
    console.log(`${law}: ${count || 0} articles`);
    
    // Check for gaps in article numbers
    if (count > 0) {
      const { data: articles } = await supabase
        .from('legal_articles')
        .select('article_number')
        .eq('document_type', law)
        .lt('article_number', 1000) // Exclude hierarchy elements
        .order('article_number');
      
      if (articles && articles.length > 0) {
        const numbers = articles.map(a => parseInt(a.article_number)).filter(n => !isNaN(n));
        const min = Math.min(...numbers);
        const max = Math.max(...numbers);
        const expected = max - min + 1;
        const missing = expected - numbers.length;
        
        if (missing > 0) {
          console.log(chalk.yellow(`   ⚠️ Missing ${missing} articles (${min}-${max})`));
          
          // Find specific gaps
          const gaps = [];
          for (let i = min; i <= max; i++) {
            if (!numbers.includes(i)) {
              gaps.push(i);
            }
          }
          if (gaps.length > 0 && gaps.length <= 10) {
            console.log(chalk.gray(`   Missing: ${gaps.join(', ')}`));
          }
        } else {
          console.log(chalk.green(`   ✅ Complete sequence (${min}-${max})`));
        }
      }
    }
  }
  
  // Check other tables
  console.log(chalk.bold.white('\n📋 OTHER TABLES:'));
  
  const tables = [
    'document_sections',
    'regime_urbanistico_consolidado',
    'legal_hierarchy',
    'query_cache',
    'qa_test_cases'
  ];
  
  for (const table of tables) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.log(chalk.red(`${table}: ERROR - ${error.message}`));
    } else {
      const status = count > 0 ? chalk.green(`${count} records`) : chalk.yellow('EMPTY');
      console.log(`${table}: ${status}`);
    }
  }
}

/**
 * Check embeddings
 */
async function checkEmbeddings() {
  console.log(chalk.bold.blue('\n🧮 VERIFICANDO EMBEDDINGS\n'));
  
  // Check if articles have embeddings
  const { data: withEmbedding } = await supabase
    .from('legal_articles')
    .select('id')
    .not('embedding', 'is', null)
    .limit(1);
  
  const { data: withoutEmbedding } = await supabase
    .from('legal_articles')
    .select('id')
    .is('embedding', null)
    .limit(1);
  
  if (withEmbedding && withEmbedding.length > 0) {
    console.log(chalk.green('✅ legal_articles: HAS embeddings'));
  } else {
    console.log(chalk.red('❌ legal_articles: NO embeddings'));
  }
  
  // Check document_sections
  const { data: sectionsWithEmbedding } = await supabase
    .from('document_sections')
    .select('id')
    .not('embedding', 'is', null)
    .limit(1);
  
  if (sectionsWithEmbedding && sectionsWithEmbedding.length > 0) {
    console.log(chalk.green('✅ document_sections: HAS embeddings'));
  } else {
    console.log(chalk.yellow('⚠️ document_sections: NO embeddings or empty'));
  }
}

/**
 * Run all diagnostics
 */
async function runDiagnostics() {
  console.log(chalk.bold.cyan('\n' + '=' .repeat(70)));
  console.log(chalk.bold.cyan('🔬 DIAGNÓSTICO COMPLETO DO SISTEMA'));
  console.log(chalk.bold.cyan('=' .repeat(70)));
  
  await checkArticles();
  await checkHierarchy();
  await checkSpecificConcepts();
  await checkDataCompleteness();
  await checkEmbeddings();
  
  console.log(chalk.bold.cyan('\n' + '=' .repeat(70)));
  console.log(chalk.bold.cyan('🏁 DIAGNÓSTICO CONCLUÍDO'));
  console.log(chalk.bold.cyan('=' .repeat(70)));
  
  console.log(chalk.yellow('\n📝 RESUMO:'));
  console.log('1. Verifique artigos faltantes (especialmente Art. 38 LUOS)');
  console.log('2. Estrutura hierárquica pode estar mal indexada');
  console.log('3. Conceitos específicos podem não estar na base');
  console.log('4. Embeddings podem precisar ser regenerados');
}

// Execute
runDiagnostics().catch(error => {
  console.error(chalk.red('❌ Erro fatal:', error));
  process.exit(1);
});