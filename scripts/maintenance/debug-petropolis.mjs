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

async function debug() {
  console.log(chalk.cyan.bold('\n🔍 DEBUG: PETRÓPOLIS QUERY\n'));
  
  // 1. Verificar dados no banco
  console.log(chalk.blue('1. DADOS NO BANCO:'));
  const { data: dbData } = await supabase
    .from('regime_urbanistico_consolidado')
    .select('*')
    .or('Bairro.ilike.%PETRÓ%,Bairro.ilike.%PETRO%')
    .limit(5);
  
  console.log(`Encontrados ${dbData?.length || 0} registros:`);
  dbData?.forEach(d => {
    console.log(`  • ${d.Bairro} | ${d.Zona} | Altura: ${d.Altura_Maxima___Edificacao_Isolada}m`);
  });
  
  // 2. Testar query no agentic-rag
  console.log(chalk.blue('\n2. RESPOSTA DO AGENTIC-RAG:'));
  
  const queries = [
    "altura máxima no bairro PETRÓPOLIS",
    "o que posso construir no bairro Petrópolis",
    "regime urbanístico de PETRÓPOLIS",
    "altura máxima PETRÓPOLIS"
  ];
  
  for (const q of queries) {
    console.log(chalk.yellow(`\nQuery: "${q}"`));
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/agentic-rag`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ANON_KEY}`
      },
      body: JSON.stringify({
        query: q,
        sessionId: 'debug-petropolis',
        bypassCache: true
      })
    });
    
    const result = await response.json();
    
    // Check if response mentions Petrópolis or 60m
    if (result.response?.includes('60') || result.response?.includes('PETRÓ')) {
      console.log(chalk.green('✅ ENCONTROU DADOS!'));
      console.log(result.response.substring(0, 200));
    } else {
      console.log(chalk.red('❌ NÃO ENCONTROU'));
      console.log(chalk.gray(result.response?.substring(0, 150) || 'Sem resposta'));
    }
    
    // Show sources
    if (result.sources) {
      console.log(chalk.gray(`Fontes: ${JSON.stringify(result.sources)}`));
    }
  }
}

debug().catch(console.error);