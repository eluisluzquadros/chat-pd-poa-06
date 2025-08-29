#!/usr/bin/env node

/**
 * TESTE DE CASO ÚNICO - Para debug rápido
 */

import fetch from 'node-fetch';
import chalk from 'chalk';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

config({ path: path.join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function testSingleQuery(query) {
  console.log(chalk.cyan.bold('\n🧪 TESTE DE CASO ÚNICO\n'));
  console.log(`Query: "${query}"`);
  console.log(chalk.gray('=' .repeat(60)));
  
  const startTime = Date.now();
  
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/agentic-rag`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        query: query,
        sessionId: 'test-' + Date.now(),
        bypassCache: true,
        model: 'gpt-3.5-turbo'
      })
    });

    const result = await response.json();
    const executionTime = Date.now() - startTime;
    
    console.log(chalk.green(`\n✅ Resposta recebida em ${executionTime}ms\n`));
    console.log(chalk.white('Resposta completa:'));
    console.log(chalk.gray('─' .repeat(60)));
    console.log(result.response || 'Sem resposta');
    console.log(chalk.gray('─' .repeat(60)));
    
    if (result.confidence) {
      console.log(`\nConfiança: ${(result.confidence * 100).toFixed(0)}%`);
    }
    
    if (result.sources) {
      console.log(`Fontes: ${result.sources.tabular || 0} tabulares, ${result.sources.conceptual || 0} conceituais`);
    }
    
  } catch (error) {
    console.log(chalk.red('\n❌ Erro:'), error.message);
  }
}

// Testar queries específicas
const queries = [
  "Qual artigo da LUOS define o Estudo de Impacto de Vizinhança?",
  "O que são ZEIS segundo o PDUS?",
  "Qual a altura máxima permitida no bairro Boa Vista?",
  "Qual a altura máxima do bairro Centro Histórico?"
];

async function main() {
  for (const query of queries) {
    await testSingleQuery(query);
    console.log('\n' + '=' .repeat(70) + '\n');
  }
}

main().catch(console.error);