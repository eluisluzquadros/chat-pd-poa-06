#!/usr/bin/env node

/**
 * TESTE DO FIX HIERÁRQUICO
 * Valida se o problema de "resuma o título 1 do pdus" foi resolvido
 */

import fetch from 'node-fetch';
import dotenv from 'dotenv';
import chalk from 'chalk';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Testa query hierárquica específica
 */
async function testHierarchicalQuery(query) {
  console.log(chalk.yellow(`\n📝 Testando: "${query}"`));
  
  const startTime = Date.now();
  
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/agentic-rag`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        model: 'openai/gpt-4-turbo-preview',
        bypassCache: true,
        session_id: `test-hierarchical-${Date.now()}`
      })
    });
    
    const elapsed = Date.now() - startTime;
    
    if (!response.ok) {
      console.log(chalk.red(`❌ HTTP ${response.status} (${elapsed}ms)`));
      return false;
    }
    
    const data = await response.json();
    
    // Validar resposta
    const hasContent = 
      data.response && 
      data.response.length > 100 &&
      !data.response.toLowerCase().includes('não foi possível');
    
    const hasStructure = 
      data.response.includes('Art.') || 
      data.response.includes('Artigo') ||
      data.response.includes('objetivo') ||
      data.response.includes('princípio') ||
      data.response.includes('Título');
    
    if (hasContent && hasStructure) {
      console.log(chalk.green(`✅ Sucesso! (${(elapsed/1000).toFixed(1)}s)`));
      console.log(chalk.gray('Preview:'), data.response.substring(0, 150) + '...');
      return true;
    } else if (hasContent) {
      console.log(chalk.yellow(`⚠️ Resposta sem estrutura adequada (${(elapsed/1000).toFixed(1)}s)`));
      console.log(chalk.gray('Preview:'), data.response.substring(0, 150) + '...');
      return false;
    } else {
      console.log(chalk.red(`❌ Resposta genérica (${(elapsed/1000).toFixed(1)}s)`));
      return false;
    }
  } catch (error) {
    console.log(chalk.red(`❌ Erro: ${error.message}`));
    return false;
  }
}

/**
 * Testa fallback local para Título 1
 */
async function testLocalFallback() {
  console.log(chalk.cyan('\n🔧 Testando fallback local para Título I:\n'));
  
  // Buscar artigos 1-10 do PDUS (geralmente Título I)
  const { data: articles } = await supabase
    .from('legal_articles')
    .select('article_number, title, full_content')
    .eq('document_type', 'PDUS')
    .gte('article_number', 1)
    .lte('article_number', 10)
    .order('article_number');
  
  if (articles && articles.length > 0) {
    console.log(chalk.green(`✅ Encontrados ${articles.length} artigos do início do PDUS`));
    
    console.log('\nConteúdo que deveria estar no Título I:');
    articles.slice(0, 3).forEach(a => {
      console.log(`  Art. ${a.article_number}: ${a.title || a.full_content?.substring(0, 50)}...`);
    });
    
    return true;
  } else {
    console.log(chalk.red('❌ Não foi possível encontrar artigos iniciais do PDUS'));
    return false;
  }
}

/**
 * Executa teste completo
 */
async function runTest() {
  console.log(chalk.bold.cyan('\n' + '=' .repeat(70)));
  console.log(chalk.bold.cyan('🧪 TESTE DO FIX HIERÁRQUICO - META 95%'));
  console.log(chalk.bold.cyan('=' .repeat(70)));
  
  // Primeiro testar se temos os dados localmente
  await testLocalFallback();
  
  // Testar queries hierárquicas problemáticas
  const hierarchicalQueries = [
    "resuma o título 1 do pdus",
    "resuma o título I do PDUS",
    "qual o conteúdo do título primeiro do plano diretor",
    "o que trata a parte I do PDUS",
    "resuma os primeiros 10 artigos do PDUS"
  ];
  
  console.log(chalk.white('\n📋 Testando queries hierárquicas:\n'));
  
  let successCount = 0;
  for (const query of hierarchicalQueries) {
    const success = await testHierarchicalQuery(query);
    if (success) successCount++;
    
    // Delay entre testes
    await new Promise(r => setTimeout(r, 2000));
  }
  
  const successRate = (successCount / hierarchicalQueries.length) * 100;
  
  console.log(chalk.bold.cyan('\n' + '=' .repeat(70)));
  console.log(chalk.bold.cyan('📊 RESULTADO'));
  console.log(chalk.bold.cyan('=' .repeat(70)));
  
  console.log(chalk.white(`\n✅ Sucessos: ${successCount}/${hierarchicalQueries.length}`));
  console.log(chalk.white(`📊 Taxa: ${successRate.toFixed(1)}%`));
  
  if (successRate === 100) {
    console.log(chalk.bold.green('\n🎉 PERFEITO! Fix hierárquico funcionando 100%!'));
    console.log(chalk.green('Sistema deve agora atingir 95% de precisão total.'));
  } else if (successRate >= 80) {
    console.log(chalk.yellow('\n⚠️ Fix parcialmente efetivo.'));
  } else {
    console.log(chalk.red('\n❌ Fix não está funcionando adequadamente.'));
  }
  
  // Teste final com as 15 queries críticas
  console.log(chalk.white('\n💡 Para validar 95% de precisão total:'));
  console.log(chalk.gray('  node scripts/test-final-precision.mjs'));
}

// Executar
runTest().catch(error => {
  console.error(chalk.red('❌ Erro:', error));
  process.exit(1);
});