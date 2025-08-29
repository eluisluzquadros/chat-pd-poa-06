#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import chalk from 'chalk';

dotenv.config({ path: '.env' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SERVICE_KEY || ANON_KEY);

async function test() {
  console.log(chalk.cyan.bold('\nTESTE: ABERTA DOS MORROS\n'));
  
  // 1. Verificar se existe no banco
  console.log(chalk.blue('1. DADOS NO BANCO:'));
  const { data } = await supabase
    .from('regime_urbanistico_consolidado')
    .select('*')
    .eq('Bairro', 'ABERTA DOS MORROS');
  
  if (data && data.length > 0) {
    console.log(chalk.green('✅ Encontrados no banco:'));
    data.forEach(d => {
      console.log(`  • Zona: ${d.Zona}`);
      console.log(`    Altura: ${d.Altura_Maxima___Edificacao_Isolada}m`);
      console.log(`    Coef. Básico: ${d.Coeficiente_de_Aproveitamento___Basico}`);
      console.log(`    Coef. Máximo: ${d.Coeficiente_de_Aproveitamento___Maximo}`);
    });
  }
  
  // 2. Testar query no agentic-rag
  console.log(chalk.blue('\n2. RESPOSTA DO AGENTIC-RAG:'));
  const response = await fetch(`${SUPABASE_URL}/functions/v1/agentic-rag`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ANON_KEY}`
    },
    body: JSON.stringify({
      query: 'qual é a altura máxima e coef. básico e máx do aberta dos morros para cada zot',
      sessionId: 'test-aberta',
      bypassCache: true
    })
  });
  
  const result = await response.json();
  console.log(chalk.yellow('Resposta:'));
  console.log(result.response);
  
  // 3. Análise
  console.log(chalk.blue('\n3. ANÁLISE:'));
  if (result.response.includes('não encontrei') || result.response.includes('não há informações')) {
    console.log(chalk.red('❌ PROBLEMA: Dados existem no banco mas sistema não encontrou!'));
    console.log(chalk.yellow('Possíveis causas:'));
    console.log('  1. Normalização de case (ABERTA DOS MORROS vs aberta dos morros)');
    console.log('  2. Threshold de similaridade muito alto');
    console.log('  3. Query não está sendo processada corretamente');
  } else if (result.response.includes('ABERTA DOS MORROS')) {
    console.log(chalk.green('✅ Sistema encontrou os dados corretamente!'));
  } else {
    console.log(chalk.yellow('⚠️ Resposta inconclusiva'));
  }
}

test().catch(console.error);
