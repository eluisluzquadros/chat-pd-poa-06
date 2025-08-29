#!/usr/bin/env node

/**
 * Test script to validate hierarchical search in all imported data levels
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import chalk from 'chalk';

// Load environment variables
dotenv.config({ path: '.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ngrqwmvuhvjkeohesbxs.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Test cases for different hierarchy levels
const testCases = [
  {
    name: 'Busca por Artigo específico',
    search: async () => {
      const { data } = await supabase
        .from('legal_articles')
        .select('*')
        .eq('document_type', 'PDUS')
        .eq('article_number', 1)
        .single();
      return data;
    }
  },
  {
    name: 'Busca por Título hierárquico',
    search: async () => {
      const { data } = await supabase
        .from('legal_articles')
        .select('*')
        .contains('keywords', ['TÍTULO'])
        .limit(3);
      return data;
    }
  },
  {
    name: 'Busca por Capítulo',
    search: async () => {
      const { data } = await supabase
        .from('legal_articles')
        .select('*')
        .contains('keywords', ['CAPÍTULO'])
        .limit(3);
      return data;
    }
  },
  {
    name: 'Busca por Seção',
    search: async () => {
      const { data } = await supabase
        .from('legal_articles')
        .select('*')
        .contains('keywords', ['SEÇÃO'])
        .limit(3);
      return data;
    }
  },
  {
    name: 'Busca por Parte',
    search: async () => {
      const { data } = await supabase
        .from('legal_articles')
        .select('*')
        .contains('keywords', ['PARTE'])
        .limit(3);
      return data;
    }
  },
  {
    name: 'Busca por Bairro (Regime Fallback)',
    search: async () => {
      const { data } = await supabase
        .from('legal_articles')
        .select('*')
        .eq('document_type', 'REGIME_FALLBACK')
        .contains('keywords', ['BAIRRO_PETRÓPOLIS'])
        .limit(3);
      return data;
    }
  },
  {
    name: 'Busca por Zona',
    search: async () => {
      const { data } = await supabase
        .from('legal_articles')
        .select('*')
        .eq('document_type', 'REGIME_FALLBACK')
        .contains('keywords', ['ZONA_02'])
        .limit(3);
      return data;
    }
  },
  {
    name: 'Busca por Categoria QA',
    search: async () => {
      const { data } = await supabase
        .from('legal_articles')
        .select('*')
        .eq('document_type', 'QA_CATEGORY')
        .limit(3);
      return data;
    }
  },
  {
    name: 'Busca hierárquica complexa (PDUS Parte II, Título I)',
    search: async () => {
      const { data } = await supabase
        .from('legal_articles')
        .select('*')
        .eq('document_type', 'PDUS')
        .contains('keywords', ['PARTE_HIERÁRQUICA', 'TÍTULO_HIERÁRQUICO'])
        .limit(3);
      return data;
    }
  },
  {
    name: 'Busca por conteúdo específico (altura máxima)',
    search: async () => {
      const { data } = await supabase
        .from('legal_articles')
        .select('*')
        .or('full_content.ilike.%altura máxima%,article_text.ilike.%altura máxima%')
        .limit(5);
      return data;
    }
  }
];

/**
 * Run all tests
 */
async function runTests() {
  console.log(chalk.bold.cyan('\n🧪 TESTE DE BUSCA HIERÁRQUICA COMPLETA\n'));
  console.log(chalk.gray('Validando busca em todos os níveis importados...\n'));
  
  let passedTests = 0;
  let failedTests = 0;
  
  for (const testCase of testCases) {
    console.log(chalk.blue(`\n📍 ${testCase.name}`));
    
    try {
      const result = await testCase.search();
      
      if (result) {
        if (Array.isArray(result)) {
          console.log(chalk.green(`   ✅ Encontrados ${result.length} resultados`));
          
          // Show sample
          if (result.length > 0) {
            const sample = result[0];
            console.log(chalk.gray(`   Exemplo: ${sample.document_type} #${sample.article_number}`));
            
            // Show keywords if available
            if (sample.keywords && sample.keywords.length > 0) {
              console.log(chalk.gray(`   Keywords: ${sample.keywords.slice(0, 3).join(', ')}`));
            }
            
            // Show content preview
            const content = sample.full_content || sample.article_text || '';
            if (content) {
              const preview = content.substring(0, 100).replace(/\n/g, ' ');
              console.log(chalk.gray(`   Conteúdo: "${preview}..."`));
            }
          }
        } else {
          console.log(chalk.green(`   ✅ Encontrado: ${result.document_type} #${result.article_number}`));
        }
        passedTests++;
      } else {
        console.log(chalk.yellow('   ⚠️ Nenhum resultado encontrado'));
        failedTests++;
      }
    } catch (error) {
      console.log(chalk.red(`   ❌ Erro: ${error.message}`));
      failedTests++;
    }
  }
  
  // Summary
  console.log(chalk.bold.cyan('\n' + '='.repeat(60)));
  console.log(chalk.bold.cyan('📊 RESUMO DOS TESTES'));
  console.log(chalk.bold.cyan('='.repeat(60)));
  
  console.log(chalk.green(`✅ Testes aprovados: ${passedTests}/${testCases.length}`));
  if (failedTests > 0) {
    console.log(chalk.red(`❌ Testes falhados: ${failedTests}/${testCases.length}`));
  }
  
  const successRate = ((passedTests / testCases.length) * 100).toFixed(1);
  console.log(chalk.bold(`\n📈 Taxa de sucesso: ${successRate}%`));
  
  if (passedTests === testCases.length) {
    console.log(chalk.bold.green('\n🎉 PERFEITO! Todos os níveis hierárquicos estão funcionando!'));
  } else if (passedTests > testCases.length * 0.8) {
    console.log(chalk.bold.yellow('\n⚠️ A maioria dos testes passou, mas alguns níveis precisam de ajustes.'));
  } else {
    console.log(chalk.bold.red('\n❌ Muitos testes falharam. Verifique a importação dos dados.'));
  }
  
  // Test specific queries
  console.log(chalk.bold.cyan('\n\n🔍 TESTES DE QUERIES ESPECÍFICAS\n'));
  
  const queries = [
    'Qual é o Título II da LUOS?',
    'O que diz o Capítulo III do PDUS?',
    'Quais são as regras para o bairro Petrópolis?',
    'Qual a altura máxima na ZOT 02?',
    'O que é coeficiente de aproveitamento?'
  ];
  
  for (const query of queries) {
    console.log(chalk.blue(`\n❓ Query: "${query}"`));
    
    // Extract keywords from query
    const keywords = query.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    
    // Search
    const { data, error } = await supabase
      .from('legal_articles')
      .select('document_type, article_number, keywords')
      .or(keywords.map(k => `full_content.ilike.%${k}%`).join(','))
      .limit(3);
    
    if (data && data.length > 0) {
      console.log(chalk.green(`   ✅ ${data.length} resultados encontrados`));
      data.forEach(d => {
        console.log(chalk.gray(`      - ${d.document_type} #${d.article_number}`));
      });
    } else {
      console.log(chalk.yellow('   ⚠️ Nenhum resultado direto'));
    }
  }
  
  console.log(chalk.bold.cyan('\n' + '='.repeat(60)));
  console.log(chalk.bold.green('✨ Teste concluído!\n'));
}

// Execute tests
runTests().catch(error => {
  console.error(chalk.red('❌ Erro fatal:', error));
  process.exit(1);
});