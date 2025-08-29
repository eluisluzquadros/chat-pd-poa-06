#!/usr/bin/env node

/**
 * Script para testar se o sistema está realmente recuperando dados ou usando respostas genéricas
 * Vamos fazer queries diretas no Supabase e comparar com as respostas do agentic-rag
 */

import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import chalk from 'chalk';

// Load environment variables
dotenv.config({ path: '.env' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Create Supabase client
const supabase = createClient(SUPABASE_URL, SERVICE_KEY || ANON_KEY);

async function checkRealData() {
  console.log(chalk.cyan.bold('\n🔍 VERIFICANDO SE O SISTEMA USA DADOS REAIS OU RESPOSTAS GENÉRICAS\n'));
  
  // Test 1: Check if legal_articles table has real data
  console.log(chalk.blue('═'.repeat(70)));
  console.log(chalk.cyan('1. VERIFICANDO TABELA legal_articles'));
  console.log(chalk.blue('─'.repeat(70)));
  
  const { data: articles, error: articlesError } = await supabase
    .from('legal_articles')
    .select('article_number, document_type, title, content')
    .or('article_number.eq.1,article_number.eq.3,article_number.eq.5,article_number.eq.38,article_number.eq.75,article_number.eq.119')
    .limit(10);
  
  if (articlesError) {
    console.log(chalk.red('❌ Erro ao buscar artigos:', articlesError.message));
  } else {
    console.log(chalk.green(`✅ Encontrados ${articles?.length || 0} artigos na base`));
    articles?.forEach(a => {
      console.log(chalk.white(`  • Art. ${a.article_number} (${a.document_type}): ${(a.content || a.title || '').substring(0, 50)}...`));
    });
  }
  
  // Test 2: Check regime_urbanistico_consolidado for Petrópolis
  console.log(chalk.blue('\n═'.repeat(70)));
  console.log(chalk.cyan('2. VERIFICANDO DADOS DO BAIRRO PETRÓPOLIS'));
  console.log(chalk.blue('─'.repeat(70)));
  
  const { data: petropolis, error: petropolisError } = await supabase
    .from('regime_urbanistico_consolidado')
    .select('*')
    .or('Bairro.ilike.%PETRÓPOLIS%,Bairro.ilike.%PETROPOLIS%')
    .limit(5);
  
  if (petropolisError) {
    console.log(chalk.red('❌ Erro ao buscar Petrópolis:', petropolisError.message));
  } else if (!petropolis || petropolis.length === 0) {
    console.log(chalk.yellow('⚠️ Nenhum dado encontrado para Petrópolis'));
    
    // Try to find what neighborhoods exist
    const { data: bairros } = await supabase
      .from('regime_urbanistico_consolidado')
      .select('Bairro')
      .limit(10);
    
    console.log(chalk.yellow('Bairros disponíveis na base:'));
    const uniqueBairros = [...new Set(bairros?.map(b => b.Bairro))];
    uniqueBairros.forEach(b => console.log(`  • ${b}`));
  } else {
    console.log(chalk.green(`✅ Encontrados ${petropolis.length} registros para Petrópolis`));
    petropolis.forEach(p => {
      console.log(chalk.white(`  • Zona: ${p.Zona || p.zona}`));
      console.log(chalk.white(`    Altura: ${p.Altura_Maxima___Edificacao_Isolada || p.altura_maxima || 'N/A'}`));
      console.log(chalk.white(`    Coef. Básico: ${p.Coeficiente_de_Aproveitamento___Basico || p.coef_basico || 'N/A'}`));
    });
  }
  
  // Test 3: Check hierarchy data
  console.log(chalk.blue('\n═'.repeat(70)));
  console.log(chalk.cyan('3. VERIFICANDO DADOS HIERÁRQUICOS (TÍTULOS, CAPÍTULOS)'));
  console.log(chalk.blue('─'.repeat(70)));
  
  const { data: hierarchy, error: hierarchyError } = await supabase
    .from('legal_articles')
    .select('article_number, title, content')
    .gt('article_number', 9000)  // Hierarchy elements usually have high numbers
    .limit(5);
  
  if (hierarchyError) {
    console.log(chalk.red('❌ Erro ao buscar hierarquia:', hierarchyError.message));
  } else {
    console.log(chalk.green(`✅ Encontrados ${hierarchy?.length || 0} elementos hierárquicos`));
    hierarchy?.forEach(h => {
      console.log(chalk.white(`  • ${h.title || h.content?.substring(0, 50)}...`));
    });
  }
  
  // Test 4: Try RPC function
  console.log(chalk.blue('\n═'.repeat(70)));
  console.log(chalk.cyan('4. TESTANDO FUNÇÃO RPC match_legal_articles'));
  console.log(chalk.blue('─'.repeat(70)));
  
  // Generate embedding for test query
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    try {
      const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'text-embedding-ada-002',
          input: 'artigo 75 da LUOS'
        })
      });
      
      const embeddingData = await embeddingResponse.json();
      const embedding = embeddingData.data[0].embedding;
      
      const { data: rpcResult, error: rpcError } = await supabase.rpc('match_legal_articles', {
        query_embedding: embedding,
        match_threshold: 0.6,
        match_count: 5
      });
      
      if (rpcError) {
        console.log(chalk.red('❌ Erro na RPC:', rpcError.message));
      } else {
        console.log(chalk.green(`✅ RPC retornou ${rpcResult?.length || 0} resultados`));
        rpcResult?.slice(0, 3).forEach(r => {
          console.log(chalk.white(`  • Similarity: ${r.similarity?.toFixed(3)} - ${(r.content || '').substring(0, 50)}...`));
        });
      }
    } catch (error) {
      console.log(chalk.red('❌ Erro ao testar RPC:', error.message));
    }
  } else {
    console.log(chalk.yellow('⚠️ OPENAI_API_KEY não configurada, pulando teste de RPC'));
  }
  
  // Test 5: Compare with agentic-rag response
  console.log(chalk.blue('\n═'.repeat(70)));
  console.log(chalk.cyan('5. COMPARANDO COM RESPOSTA DO AGENTIC-RAG'));
  console.log(chalk.blue('─'.repeat(70)));
  
  const testQuery = "o que diz o artigo 75 da LUOS?";
  console.log(chalk.yellow(`Query: "${testQuery}"`));
  
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/agentic-rag`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ANON_KEY}`
      },
      body: JSON.stringify({
        query: testQuery,
        sessionId: 'test-real-data',
        bypassCache: true
      })
    });
    
    const data = await response.json();
    
    console.log(chalk.green('\n✅ Resposta do agentic-rag:'));
    console.log(chalk.white(data.response?.substring(0, 200) + '...'));
    console.log(chalk.yellow(`\nFontes: ${JSON.stringify(data.sources)}`));
    
    // Check if response contains real article content
    if (data.response?.includes('regime volumétrico') || 
        data.response?.includes('parâmetros que definem')) {
      console.log(chalk.green('✅ RESPOSTA CONTÉM DADOS REAIS DO ARTIGO 75!'));
    } else if (data.response?.includes('não encontrei') || 
               data.response?.includes('não há informações')) {
      console.log(chalk.red('❌ RESPOSTA GENÉRICA - NÃO ENCONTROU DADOS!'));
    } else {
      console.log(chalk.yellow('⚠️ RESPOSTA INCONCLUSIVA'));
    }
    
  } catch (error) {
    console.log(chalk.red('❌ Erro ao chamar agentic-rag:', error.message));
  }
  
  // Final Analysis
  console.log(chalk.blue('\n═'.repeat(70)));
  console.log(chalk.cyan.bold('📊 ANÁLISE FINAL'));
  console.log(chalk.blue('═'.repeat(70)));
  
  // Check if we found real data
  const hasArticles = articles && articles.length > 0;
  const hasRegime = petropolis && petropolis.length > 0;
  const hasHierarchy = hierarchy && hierarchy.length > 0;
  
  if (hasArticles || hasRegime || hasHierarchy) {
    console.log(chalk.green.bold('\n✅ BASE DE DADOS CONTÉM DADOS REAIS:'));
    if (hasArticles) console.log(chalk.green(`  • ${articles.length} artigos legais`));
    if (hasRegime) console.log(chalk.green(`  • Dados de regime urbanístico`));
    if (hasHierarchy) console.log(chalk.green(`  • Elementos hierárquicos`));
    
    console.log(chalk.yellow.bold('\n⚠️ MAS O SISTEMA PODE ESTAR:'));
    console.log(chalk.yellow('  1. Com problemas de embedding/similaridade'));
    console.log(chalk.yellow('  2. Com threshold muito alto (0.60)'));
    console.log(chalk.yellow('  3. Com problemas na normalização de queries'));
    console.log(chalk.yellow('  4. Retornando respostas genéricas quando não encontra'));
  } else {
    console.log(chalk.red.bold('\n❌ BASE DE DADOS PARECE VAZIA OU INACESSÍVEL!'));
    console.log(chalk.red('  • Verificar se as tabelas foram populadas'));
    console.log(chalk.red('  • Verificar permissões RLS'));
    console.log(chalk.red('  • Verificar se os scripts de importação rodaram'));
  }
  
  // Specific issues found
  console.log(chalk.cyan.bold('\n🔍 PROBLEMAS ESPECÍFICOS DETECTADOS:'));
  
  if (!hasRegime) {
    console.log(chalk.red('❌ Dados de Petrópolis não encontrados - verificar importação de regime_urbanistico'));
  }
  
  console.log(chalk.yellow('⚠️ Sistema retorna respostas genéricas quando não encontra dados (linha 792 do agentic-rag)'));
  console.log(chalk.yellow('⚠️ Threshold de similaridade pode estar muito alto (0.60)'));
  console.log(chalk.yellow('⚠️ Algumas queries específicas não estão encontrando dados que existem'));
}

// Run the check
checkRealData().catch(error => {
  console.error(chalk.red('❌ Erro fatal:', error));
  process.exit(1);
});