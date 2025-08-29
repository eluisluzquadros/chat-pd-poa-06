#!/usr/bin/env node

import fetch from 'node-fetch';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

console.log('🔍 TESTANDO PIPELINE SQL\n');

async function testSQLGenerator() {
  console.log('1. Testando SQL Generator...');
  
  const response = await fetch(`${SUPABASE_URL}/functions/v1/sql-generator`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: 'Qual a altura máxima no Centro Histórico?',
      schema: {
        tables: ['regime_urbanistico'],
        columns: {
          regime_urbanistico: ['bairro', 'zona', 'altura_maxima', 'coef_aproveitamento_basico', 'coef_aproveitamento_maximo']
        }
      }
    })
  });
  
  const result = await response.json();
  console.log('SQL Gerado:', result.sql);
  console.log('Resultados:', result.executionResults?.length || 0, 'registros');
  
  if (result.executionResults && result.executionResults.length > 0) {
    console.log('Primeiro resultado:', result.executionResults[0]);
  }
  
  return result;
}

async function testQueryAnalyzer() {
  console.log('\n2. Testando Query Analyzer...');
  
  const response = await fetch(`${SUPABASE_URL}/functions/v1/query-analyzer`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: 'Qual a altura máxima no Centro Histórico?'
    })
  });
  
  const result = await response.json();
  console.log('Estratégia:', result.strategy);
  console.log('Entidades:', result.entities);
  console.log('Tipo:', result.queryType);
  
  return result;
}

async function testFullPipeline() {
  console.log('\n3. Testando Pipeline Completo (agentic-rag)...');
  
  const response = await fetch(`${SUPABASE_URL}/functions/v1/agentic-rag`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: 'Qual a altura máxima no Centro Histórico?',
      query: 'Qual a altura máxima no Centro Histórico?',
      bypassCache: true
    })
  });
  
  const result = await response.json();
  console.log('Resposta:', result.response?.substring(0, 200));
  console.log('Confiança:', result.confidence);
  console.log('Estratégia usada:', result.agentTrace?.find(t => t.step === 'query_analysis_complete')?.result?.strategy);
  
  // Verificar se está retornando tabela vazia
  if (result.response?.includes('| Campo | Valor |') && 
      result.response?.includes('|-------|-------|') &&
      !result.response?.includes('75')) {
    console.log('\n❌ PROBLEMA IDENTIFICADO: Tabela vazia sendo retornada!');
    console.log('Trace completo:', JSON.stringify(result.agentTrace, null, 2));
  }
  
  return result;
}

async function runTests() {
  try {
    const sqlResult = await testSQLGenerator();
    const analyzerResult = await testQueryAnalyzer();
    const fullResult = await testFullPipeline();
    
    console.log('\n📊 DIAGNÓSTICO:');
    console.log('================');
    
    if (sqlResult.executionResults?.length === 0) {
      console.log('❌ SQL Generator não está retornando dados');
      console.log('   SQL gerado:', sqlResult.sql);
    } else if (sqlResult.executionResults?.length > 0) {
      console.log('✅ SQL Generator funcionando');
    }
    
    if (analyzerResult.strategy === 'structured_only') {
      console.log('✅ Query Analyzer identificou como structured_only');
    } else {
      console.log('⚠️ Query Analyzer usou estratégia:', analyzerResult.strategy);
    }
    
    if (fullResult.response?.includes('75')) {
      console.log('✅ Pipeline completo retornou altura correta (75m)');
    } else {
      console.log('❌ Pipeline não retornou altura esperada');
    }
    
  } catch (error) {
    console.error('Erro:', error);
  }
}

runTests();