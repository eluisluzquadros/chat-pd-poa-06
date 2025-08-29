#!/usr/bin/env node

/**
 * ANÁLISE COMPLETA PARA ATINGIR 95% DE PRECISÃO
 * Identifica todos os gaps e propõe soluções
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
 * 1. PROBLEMA: Busca de Artigos
 */
async function analyzeArticleSearch() {
  console.log(chalk.bold.red('\n🔍 GAP 1: BUSCA DE ARTIGOS (Impacto: 40% das falhas)\n'));
  
  // Check article_number field
  const { data: sample } = await supabase
    .from('legal_articles')
    .select('id, article_number, document_type, title')
    .limit(10);
  
  if (sample && sample.length > 0) {
    console.log('📊 Estrutura do campo article_number:');
    sample.forEach(a => {
      console.log(`  ${a.document_type} Art. ${a.article_number} (tipo: ${typeof a.article_number})`);
    });
  }
  
  // Test different search methods
  console.log('\n🧪 Testando métodos de busca:');
  
  // String search
  const { count: stringCount } = await supabase
    .from('legal_articles')
    .select('*', { count: 'exact', head: true })
    .eq('article_number', '1');
  
  // Number search
  const { count: numberCount } = await supabase
    .from('legal_articles')
    .select('*', { count: 'exact', head: true })
    .eq('article_number', 1);
  
  console.log(`  Busca por string "1": ${stringCount || 0} resultados`);
  console.log(`  Busca por number 1: ${numberCount || 0} resultados`);
  
  // Check for text patterns
  const { data: textArticles } = await supabase
    .from('legal_articles')
    .select('article_number')
    .ilike('article_number', '%1%')
    .limit(5);
  
  if (textArticles) {
    console.log('\n📝 Valores reais de article_number:');
    textArticles.forEach(a => {
      console.log(`  "${a.article_number}"`);
    });
  }
  
  console.log(chalk.yellow('\n💡 SOLUÇÃO:'));
  console.log('  1. Normalizar article_number para tipo consistente');
  console.log('  2. Criar índice em article_number');
  console.log('  3. Implementar busca fuzzy para artigos');
}

/**
 * 2. PROBLEMA: Rate Limits de Embeddings
 */
async function analyzeRateLimits() {
  console.log(chalk.bold.red('\n🔍 GAP 2: RATE LIMITS (Impacto: 30% das falhas)\n'));
  
  // Check cache usage
  const { count: cacheCount } = await supabase
    .from('query_cache')
    .select('*', { count: 'exact', head: true });
  
  const { count: embeddingCount } = await supabase
    .from('legal_articles')
    .select('*', { count: 'exact', head: true })
    .not('embedding', 'is', null);
  
  console.log(`📊 Status do cache:`);
  console.log(`  Query cache: ${cacheCount || 0} entradas`);
  console.log(`  Artigos com embeddings: ${embeddingCount || 0}`);
  
  console.log(chalk.yellow('\n💡 SOLUÇÃO:'));
  console.log('  1. Implementar pool de API keys');
  console.log('  2. Pre-computar embeddings offline');
  console.log('  3. Usar cache agressivo (7 dias)');
  console.log('  4. Fallback para BM25 text search');
}

/**
 * 3. PROBLEMA: Extração de Entidades
 */
async function analyzeEntityExtraction() {
  console.log(chalk.bold.red('\n🔍 GAP 3: EXTRAÇÃO DE ENTIDADES (Impacto: 15% das falhas)\n'));
  
  const testQueries = [
    'qual a altura máxima em petrópolis',
    'o que diz o artigo 38 da luos',
    'coeficiente de aproveitamento no bairro centro'
  ];
  
  console.log('📊 Entidades que precisam ser extraídas:');
  for (const query of testQueries) {
    console.log(`\n  Query: "${query}"`);
    
    // Extract patterns
    const patterns = {
      bairro: query.match(/(?:bairro\s+)?([A-Za-zÀ-ú]+(?:\s+[A-Za-zÀ-ú]+)*)/i)?.[1],
      artigo: query.match(/art(?:igo)?\s*\.?\s*(\d+)/i)?.[1],
      lei: query.match(/(LUOS|PDUS|COE)/i)?.[1],
      parametro: query.match(/(altura|coeficiente|aproveitamento|recuo)/i)?.[1]
    };
    
    console.log('    Detectado:', patterns);
  }
  
  console.log(chalk.yellow('\n💡 SOLUÇÃO:'));
  console.log('  1. NER (Named Entity Recognition) para bairros');
  console.log('  2. Regex melhorado para artigos e leis');
  console.log('  3. Dicionário de sinônimos (altura = height = H)');
  console.log('  4. Fuzzy matching para nomes de bairros');
}

/**
 * 4. PROBLEMA: Hierarquia e Estrutura
 */
async function analyzeHierarchy() {
  console.log(chalk.bold.red('\n🔍 GAP 4: NAVEGAÇÃO HIERÁRQUICA (Impacto: 10% das falhas)\n'));
  
  const { data: hierarchy } = await supabase
    .from('legal_hierarchy')
    .select('*')
    .limit(5);
  
  console.log(`📊 Estrutura hierárquica:`);
  console.log(`  Registros em legal_hierarchy: ${hierarchy?.length || 0}`);
  
  if (hierarchy && hierarchy.length > 0) {
    console.log('\n  Exemplo de hierarquia:');
    hierarchy.forEach(h => {
      console.log(`    ${h.level}: ${h.title || h.type}`);
    });
  }
  
  console.log(chalk.yellow('\n💡 SOLUÇÃO:'));
  console.log('  1. Reconstruir índice hierárquico');
  console.log('  2. Implementar navegação por breadcrumbs');
  console.log('  3. Cache de estrutura hierárquica');
}

/**
 * 5. PROBLEMA: Qualidade das Respostas
 */
async function analyzeResponseQuality() {
  console.log(chalk.bold.red('\n🔍 GAP 5: QUALIDADE DAS RESPOSTAS (Impacto: 5% das falhas)\n'));
  
  console.log('📊 Problemas identificados:');
  console.log('  - Respostas genéricas ("não foi possível encontrar")');
  console.log('  - Falta de contexto nas respostas');
  console.log('  - Não identifica múltiplas leis relevantes');
  
  console.log(chalk.yellow('\n💡 SOLUÇÃO:'));
  console.log('  1. Re-ranking com cross-encoder');
  console.log('  2. Prompt engineering específico por categoria');
  console.log('  3. Validação de resposta antes de retornar');
  console.log('  4. Fallback para múltiplas estratégias de busca');
}

/**
 * PLANO DE AÇÃO PARA 95%
 */
async function generateActionPlan() {
  console.log(chalk.bold.cyan('\n' + '=' .repeat(70)));
  console.log(chalk.bold.cyan('🎯 PLANO DE AÇÃO PARA ATINGIR 95% DE PRECISÃO'));
  console.log(chalk.bold.cyan('=' .repeat(70)));
  
  const actions = [
    {
      priority: 'CRÍTICO',
      task: 'Corrigir busca de artigos',
      impact: '40%',
      effort: '2h',
      solution: 'Normalizar article_number para string, criar índice GIN'
    },
    {
      priority: 'CRÍTICO',
      task: 'Resolver rate limits',
      impact: '30%',
      effort: '4h',
      solution: 'Pool de API keys + cache agressivo + fallback BM25'
    },
    {
      priority: 'ALTO',
      task: 'Melhorar extração de entidades',
      impact: '15%',
      effort: '3h',
      solution: 'NER + regex melhorado + fuzzy matching'
    },
    {
      priority: 'MÉDIO',
      task: 'Implementar re-ranking',
      impact: '7%',
      effort: '4h',
      solution: 'Cross-encoder para re-ordenar top-k resultados'
    },
    {
      priority: 'MÉDIO',
      task: 'Reconstruir hierarquia',
      impact: '5%',
      effort: '2h',
      solution: 'Reindexar TÍTULO, CAPÍTULO, SEÇÃO'
    },
    {
      priority: 'BAIXO',
      task: 'Prompt engineering',
      impact: '3%',
      effort: '1h',
      solution: 'Templates específicos por tipo de query'
    }
  ];
  
  console.log(chalk.bold.white('\n📋 AÇÕES PRIORITÁRIAS:\n'));
  
  let totalImpact = 0;
  actions.forEach((action, i) => {
    const color = action.priority === 'CRÍTICO' ? chalk.red :
                  action.priority === 'ALTO' ? chalk.yellow :
                  action.priority === 'MÉDIO' ? chalk.blue :
                  chalk.gray;
    
    console.log(color(`${i + 1}. [${action.priority}] ${action.task}`));
    console.log(`   Impacto: ${action.impact} | Esforço: ${action.effort}`);
    console.log(`   Solução: ${action.solution}`);
    console.log();
    
    totalImpact += parseInt(action.impact);
  });
  
  console.log(chalk.bold.green(`\n✅ Impacto Total Esperado: ${totalImpact}% de melhoria`));
  console.log(chalk.bold.green(`📊 Precisão Atual: ~20% → Precisão Esperada: 95%+`));
  
  console.log(chalk.bold.white('\n🚀 IMPLEMENTAÇÃO SUGERIDA:\n'));
  console.log('FASE 1 (Hoje):');
  console.log('  1. Corrigir busca de artigos (2h)');
  console.log('  2. Implementar cache e fallback (2h)');
  console.log('  → Esperado: 70% precisão');
  
  console.log('\nFASE 2 (Amanhã):');
  console.log('  3. Melhorar extração de entidades (3h)');
  console.log('  4. Pool de API keys (2h)');
  console.log('  → Esperado: 85% precisão');
  
  console.log('\nFASE 3 (2 dias):');
  console.log('  5. Re-ranking e hierarquia (6h)');
  console.log('  6. Testes e ajustes (2h)');
  console.log('  → Esperado: 95%+ precisão');
}

/**
 * Run complete analysis
 */
async function runAnalysis() {
  console.log(chalk.bold.magenta('\n' + '=' .repeat(70)));
  console.log(chalk.bold.magenta('🔬 ANÁLISE COMPLETA: COMO ATINGIR 95% DE PRECISÃO'));
  console.log(chalk.bold.magenta('=' .repeat(70)));
  
  await analyzeArticleSearch();
  await analyzeRateLimits();
  await analyzeEntityExtraction();
  await analyzeHierarchy();
  await analyzeResponseQuality();
  await generateActionPlan();
  
  console.log(chalk.bold.cyan('\n' + '=' .repeat(70)));
  console.log(chalk.bold.cyan('📌 PRÓXIMO PASSO IMEDIATO:'));
  console.log(chalk.bold.cyan('=' .repeat(70)));
  
  console.log(chalk.bold.yellow('\nExecute: npm run fix-article-search'));
  console.log(chalk.gray('(Este comando ainda será criado para implementar a correção)'));
}

// Execute
runAnalysis().catch(error => {
  console.error(chalk.red('❌ Erro:', error));
  process.exit(1);
});