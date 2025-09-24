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

console.log('🔍 TESTANDO FORMAT-TABLE-RESPONSE DIRETAMENTE\n');

// Dados reais do SQL Generator
const sqlGeneratorResponse = {
  query: "SELECT bairro, zona, altura_maxima FROM regime_urbanistico WHERE bairro = 'CENTRO HISTÓRICO'",
  table: 'regime_urbanistico',
  purpose: 'Obter a altura máxima no bairro Centro Histórico',
  data: [
    { zona: 'ZOT 08.1 - B', bairro: 'CENTRO HISTÓRICO', altura_maxima: 75 },
    { zona: 'ZOT 08.1 - A', bairro: 'CENTRO HISTÓRICO', altura_maxima: 60 },
    { zona: 'ZOT 08.1 - F', bairro: 'CENTRO HISTÓRICO', altura_maxima: 6.7 },
    { zona: 'ESPECIAL', bairro: 'CENTRO HISTÓRICO', altura_maxima: 0 },
    { zona: 'ZOT 08.1 - G', bairro: 'CENTRO HISTÓRICO', altura_maxima: 0 },
    { zona: 'ZOT 08.1 - C', bairro: 'CENTRO HISTÓRICO', altura_maxima: 90 },
    { zona: 'ZOT 08.1 - E', bairro: 'CENTRO HISTÓRICO', altura_maxima: 130 },
    { zona: 'ZOT 08.1 - D', bairro: 'CENTRO HISTÓRICO', altura_maxima: 100 }
  ]
};

async function testFormat(data, description) {
  console.log(`\n📝 ${description}`);
  console.log('Enviando:', JSON.stringify(data, null, 2).substring(0, 200) + '...\n');
  
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/format-table-response`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    });
    
    const result = await response.json();
    console.log('Resposta:');
    console.log(result.formatted || result.error);
    console.log('\nTem tabela?', result.has_table);
    
    return result;
  } catch (error) {
    console.error('Erro:', error.message);
    return null;
  }
}

async function runTests() {
  // Teste 1: Enviando o objeto completo (formato errado)
  await testFormat({
    query: 'Qual a altura máxima no Centro Histórico?',
    response: sqlGeneratorResponse,
    type: 'regime'
  }, 'Teste 1: Formato atual (objeto completo)');
  
  // Teste 2: Enviando apenas os dados (formato correto)
  await testFormat({
    query: 'Qual a altura máxima no Centro Histórico?',
    response: sqlGeneratorResponse.data,
    type: 'regime'
  }, 'Teste 2: Apenas array de dados');
  
  // Teste 3: Enviando executionResults (formato que deveria ser usado)
  await testFormat({
    query: 'Qual a altura máxima no Centro Histórico?',
    response: sqlGeneratorResponse.data,
    type: 'comparison'
  }, 'Teste 3: Como comparação (múltiplos registros)');
  
  console.log('\n\n📊 DIAGNÓSTICO:');
  console.log('================');
  console.log('O problema é que o agentic-rag está enviando o objeto SQL completo');
  console.log('mas format-table-response espera apenas o array de dados.');
  console.log('\nSOLUÇÃO: Corrigir agentic-rag linha 244 para enviar:');
  console.log('response: sqlResults.executionResults[0].data');
  console.log('em vez de:');
  console.log('response: sqlResults.executionResults');
}

runTests();