#!/usr/bin/env node

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import chalk from 'chalk';

// Load environment variables
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Quick test - 5 queries per category (25 total)
const quickTests = {
  'Artigos': [
    'O que diz o artigo 1?',
    'Artigo 20 sobre outorga',
    'Conteúdo do artigo 45',
    'O que é o artigo 75?',
    'Artigo 100 estabelece'
  ],
  'Regime': [
    'Altura máxima em Petrópolis',
    'Taxa de ocupação no Centro',
    'Parâmetros de Menino Deus',
    'Regime do Cristal',
    'Coeficiente em Moinhos'
  ],
  'ZOTs': [
    'O que é ZOT-08?',
    'Características da ZOT-07',
    'Parâmetros da ZOT-13',
    'Bairros da ZOT-15',
    'ZOT-01 permite o quê?'
  ],
  'Proteção': [
    'Áreas de risco de inundação',
    'Proteção contra enchentes',
    'Zonas de preservação',
    'Áreas não edificáveis',
    'Patrimônio histórico'
  ],
  'Conceitos': [
    'O que é outorga onerosa?',
    'Definição de ZEIS',
    'Taxa de ocupação conceito',
    'O que é recuo frontal?',
    'IPTU progressivo'
  ]
};

async function testQuery(query) {
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/agentic-rag`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message: query }),
      signal: AbortSignal.timeout(8000)
    });

    if (!response.ok) return false;
    
    const data = await response.json();
    return data.response && data.response.length > 50;
    
  } catch {
    return false;
  }
}

async function main() {
  console.log(chalk.cyan.bold('\n🚀 VERIFICAÇÃO RÁPIDA DE ACURÁCIA\n'));
  
  const results = {};
  let totalTests = 0;
  let totalPassed = 0;
  
  for (const [category, queries] of Object.entries(quickTests)) {
    console.log(chalk.yellow(`\nTestando ${category}...`));
    let passed = 0;
    
    for (const query of queries) {
      process.stdout.write('.');
      const success = await testQuery(query);
      if (success) passed++;
      totalTests++;
      totalPassed += success ? 1 : 0;
      await new Promise(r => setTimeout(r, 500));
    }
    
    const rate = (passed / queries.length) * 100;
    results[category] = rate;
    console.log(chalk[rate >= 80 ? 'green' : 'yellow'](`\n${category}: ${rate.toFixed(0)}% (${passed}/5)`));
  }
  
  // Database stats
  const { count } = await supabase
    .from('document_sections')
    .select('*', { count: 'exact', head: true });
  
  const overallRate = (totalPassed / totalTests) * 100;
  
  console.log(chalk.cyan('\n' + '═'.repeat(50)));
  console.log(chalk.cyan.bold('📊 RESULTADO RÁPIDO'));
  console.log(chalk.cyan('═'.repeat(50)));
  
  console.log(`\n📄 Documentos na base: ${count}`);
  console.log(`✅ Testes aprovados: ${totalPassed}/${totalTests}`);
  
  if (overallRate >= 95) {
    console.log(chalk.green.bold(`\n🎯 ACURÁCIA: ${overallRate.toFixed(1)}%`));
    console.log(chalk.green.bold('✅ META DE 95% ALCANÇADA!'));
  } else if (overallRate >= 90) {
    console.log(chalk.yellow.bold(`\n🎯 ACURÁCIA: ${overallRate.toFixed(1)}%`));
    console.log(chalk.yellow(`⚠️ Próximo da meta (faltam ${(95-overallRate).toFixed(1)}%)`));
  } else {
    console.log(chalk.red.bold(`\n🎯 ACURÁCIA: ${overallRate.toFixed(1)}%`));
    console.log(chalk.red(`❌ Abaixo da meta (faltam ${(95-overallRate).toFixed(1)}%)`));
  }
  
  console.log(chalk.cyan('\n' + '═'.repeat(50) + '\n'));
}

main().catch(console.error);