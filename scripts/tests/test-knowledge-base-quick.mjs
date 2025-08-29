#!/usr/bin/env node

/**
 * Teste rápido da base de conhecimento com timeout reduzido
 * Executa queries em paralelo para melhor performance
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Timeout mais curto para evitar travamento
const EDGE_FUNCTION_TIMEOUT = 15000; // 15 segundos

// Casos de teste priorizados
const criticalTests = [
  {
    id: 1,
    question: "qual é a altura máxima do aberta dos morros",
    mustContain: ['33 metros', '52 metros', 'ZOT'],
    dataType: 'REGIME_FALLBACK'
  },
  {
    id: 2,
    question: "o que posso construir no bairro Petrópolis",
    mustContain: ['60 metros', '90 metros', 'coeficiente'],
    dataType: 'REGIME_FALLBACK'
  },
  {
    id: 3,
    question: "o que afirma literalmente o Art 1º da LUOS?",
    mustContain: ['Art. 1', 'LUOS', 'Lei de Uso e Ocupação'],
    dataType: 'LUOS'
  },
  {
    id: 4,
    question: "o que diz o artigo 1 do pdus",
    mustContain: ['artigo 1', 'PDUS', 'Plano Diretor'],
    dataType: 'PDUS'
  },
  {
    id: 5,
    question: "qual a altura máxima da construção dos prédios em Porto Alegre?",
    mustContain: ['altura máxima', 'varia', 'zona'],
    dataType: 'QA_CATEGORY'
  }
];

// Função para testar edge function com timeout
async function testEdgeFunction(test) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), EDGE_FUNCTION_TIMEOUT);
  
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/agentic-rag`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_KEY}`
      },
      body: JSON.stringify({
        query: test.question,
        sessionId: `quick-test-${test.id}`
      }),
      signal: controller.signal
    });
    
    clearTimeout(timeout);
    
    if (!response.ok) {
      return { error: `HTTP ${response.status}` };
    }
    
    const result = await response.json();
    return { response: result.response || '' };
  } catch (error) {
    clearTimeout(timeout);
    if (error.name === 'AbortError') {
      return { error: 'Timeout' };
    }
    return { error: error.message };
  }
}

// Verificar dados no banco
async function verifyDataExists() {
  console.log('\n📊 Verificando dados na base...\n');
  
  const types = ['LUOS', 'PDUS', 'REGIME_FALLBACK', 'QA_CATEGORY'];
  const verification = {};
  
  for (const type of types) {
    const { count } = await supabase
      .from('legal_articles')
      .select('*', { count: 'exact', head: true })
      .eq('document_type', type);
    
    verification[type] = count || 0;
    const status = count > 0 ? '✅' : '❌';
    console.log(`${status} ${type}: ${count || 0} registros`);
  }
  
  return verification;
}

// Teste rápido direto no banco
async function quickDatabaseTest() {
  console.log('\n🔍 Teste Rápido de Busca no Banco...\n');
  
  // Teste 1: Buscar Petrópolis em REGIME_FALLBACK
  const { data: petropolis } = await supabase
    .from('legal_articles')
    .select('full_content')
    .eq('document_type', 'REGIME_FALLBACK')
    .ilike('full_content', '%petrópolis%')
    .limit(1);
  
  if (petropolis && petropolis[0]) {
    const content = petropolis[0].full_content;
    const hasHeight = /\d+\s*metros/i.test(content);
    const hasCoef = /coeficiente.*\d+[,\.]\d+/i.test(content);
    console.log(`✅ Petrópolis: ${hasHeight ? '✓ altura' : '✗ altura'}, ${hasCoef ? '✓ coef' : '✗ coef'}`);
  } else {
    console.log('❌ Petrópolis: não encontrado em REGIME_FALLBACK');
  }
  
  // Teste 2: Buscar Aberta dos Morros
  const { data: aberta } = await supabase
    .from('legal_articles')
    .select('full_content')
    .eq('document_type', 'REGIME_FALLBACK')
    .or('full_content.ilike.%aberta dos morros%,full_content.ilike.%aberta_dos_morros%')
    .limit(1);
  
  if (aberta && aberta[0]) {
    const content = aberta[0].full_content;
    const heights = content.match(/\d+\s*metros/gi);
    console.log(`✅ Aberta dos Morros: ${heights ? heights.slice(0, 2).join(', ') : 'sem alturas'}`);
  } else {
    console.log('❌ Aberta dos Morros: não encontrado');
  }
  
  // Teste 3: Buscar Art. 1 LUOS
  const { data: art1 } = await supabase
    .from('legal_articles')
    .select('article_text')
    .eq('document_type', 'LUOS')
    .eq('article_number', 1)
    .single();
  
  if (art1) {
    console.log(`✅ Art. 1 LUOS: ${art1.article_text ? 'encontrado' : 'sem conteúdo'}`);
  } else {
    console.log('❌ Art. 1 LUOS: não encontrado');
  }
}

// Executar testes principais
async function runCriticalTests() {
  console.log('\n🎯 Testando Queries Críticas...\n');
  
  // Executar testes em paralelo com Promise.allSettled
  const testPromises = criticalTests.map(async (test) => {
    const startTime = Date.now();
    const result = await testEdgeFunction(test);
    const duration = Date.now() - startTime;
    
    return { test, result, duration };
  });
  
  const results = await Promise.allSettled(testPromises);
  
  // Processar resultados
  let passed = 0;
  let failed = 0;
  
  for (const settledResult of results) {
    if (settledResult.status === 'rejected') {
      console.log(`❌ Teste falhou com erro: ${settledResult.reason}`);
      failed++;
      continue;
    }
    
    const { test, result, duration } = settledResult.value;
    
    console.log(`\nTeste #${test.id}: "${test.question.substring(0, 50)}..."`);
    console.log(`  ⏱️ Tempo: ${duration}ms`);
    
    if (result.error) {
      console.log(`  ❌ Erro: ${result.error}`);
      failed++;
    } else {
      const response = result.response.toLowerCase();
      const foundItems = test.mustContain.filter(item => 
        response.includes(item.toLowerCase())
      );
      
      const passRate = (foundItems.length / test.mustContain.length) * 100;
      
      if (passRate >= 60) {
        console.log(`  ✅ PASSOU (${passRate.toFixed(0)}% dos itens encontrados)`);
        console.log(`  📝 Encontrou: ${foundItems.join(', ')}`);
        passed++;
      } else {
        console.log(`  ❌ FALHOU (apenas ${passRate.toFixed(0)}% dos itens)`);
        console.log(`  📝 Faltou: ${test.mustContain.filter(item => 
          !foundItems.includes(item)).join(', ')}`);
        failed++;
      }
      
      // Preview da resposta
      const preview = result.response.substring(0, 120);
      console.log(`  💬 "${preview}..."`);
    }
  }
  
  return { passed, failed };
}

// Main
async function main() {
  console.log('='.repeat(60));
  console.log('    TESTE RÁPIDO DA BASE DE CONHECIMENTO');
  console.log('='.repeat(60));
  
  // Verificar dados
  const dataVerification = await verifyDataExists();
  
  // Teste rápido no banco
  await quickDatabaseTest();
  
  // Executar testes críticos
  const { passed, failed } = await runCriticalTests();
  
  // Resumo
  console.log('\n' + '='.repeat(60));
  console.log('    RESUMO');
  console.log('='.repeat(60));
  
  const total = passed + failed;
  const successRate = (passed / total) * 100;
  
  console.log(`\n📈 Taxa de Sucesso: ${successRate.toFixed(0)}%`);
  console.log(`✅ Passou: ${passed}/${total}`);
  console.log(`❌ Falhou: ${failed}/${total}`);
  
  // Análise dos problemas
  if (dataVerification.REGIME_FALLBACK === 0) {
    console.log('\n⚠️ PROBLEMA CRÍTICO: REGIME_FALLBACK não está sendo consultado!');
  }
  if (dataVerification.QA_CATEGORY === 0) {
    console.log('⚠️ PROBLEMA: QA_CATEGORY não está sendo consultado!');
  }
  
  if (successRate < 60) {
    console.log('\n❌ Sistema precisa de correções urgentes');
    console.log('   Verifique se o fix do agentic-rag foi aplicado corretamente');
  } else if (successRate < 80) {
    console.log('\n⚠️ Sistema funciona parcialmente mas precisa melhorias');
  } else {
    console.log('\n✅ Sistema está funcionando adequadamente!');
  }
  
  console.log('\n' + '='.repeat(60));
}

main().catch(console.error);