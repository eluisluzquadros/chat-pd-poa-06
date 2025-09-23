#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import chalk from 'chalk';

dotenv.config({ path: '.env' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function check() {
  console.log(chalk.cyan.bold('\n🔍 VERIFICANDO DADOS FALTANTES\n'));
  
  // 1. Verificar chunks do regime urbanístico
  console.log(chalk.blue('1. CHUNKS DO REGIME URBANÍSTICO:'));
  const { data: chunks, error: chunksError } = await supabase
    .from('document_sections')
    .select('title, content')
    .or('title.ilike.%regime%,content.ilike.%regime urbanístico%')
    .limit(5);
  
  if (chunksError) {
    console.log(chalk.red('Erro:', chunksError.message));
  } else {
    console.log(chalk.green(`Encontrados ${chunks?.length || 0} chunks sobre regime`));
    chunks?.forEach(c => {
      console.log(`  • ${c.title?.substring(0, 50) || c.content?.substring(0, 50)}...`);
    });
  }
  
  // 2. Verificar casos de teste QA
  console.log(chalk.blue('\n2. CASOS DE TESTE QA:'));
  const { data: qaTests, error: qaError } = await supabase
    .from('qa_test_cases')
    .select('id, question, expected_answer')
    .limit(5);
  
  if (qaError) {
    console.log(chalk.red('Erro:', qaError.message));
  } else {
    console.log(chalk.green(`Encontrados ${qaTests?.length || 0} casos de teste`));
    qaTests?.forEach(q => {
      console.log(`  • ${q.question?.substring(0, 50)}...`);
    });
  }
  
  // 3. Verificar contagem total
  console.log(chalk.blue('\n3. CONTAGEM TOTAL DE DADOS:'));
  
  const { count: regimeCount } = await supabase
    .from('regime_urbanistico_consolidado')
    .select('*', { count: 'exact', head: true });
  
  const { count: legalCount } = await supabase
    .from('legal_articles')
    .select('*', { count: 'exact', head: true });
  
  const { count: sectionsCount } = await supabase
    .from('document_sections')
    .select('*', { count: 'exact', head: true });
  
  const { count: qaCount } = await supabase
    .from('qa_test_cases')
    .select('*', { count: 'exact', head: true });
  
  console.log(chalk.green(`  • regime_urbanistico_consolidado: ${regimeCount} registros`));
  console.log(chalk.green(`  • legal_articles: ${legalCount} artigos`));
  console.log(chalk.green(`  • document_sections: ${sectionsCount} chunks`));
  console.log(chalk.green(`  • qa_test_cases: ${qaCount} casos`));
  
  // 4. Verificar se agentic-rag está buscando em document_sections
  console.log(chalk.blue('\n4. ANÁLISE:'));
  if (sectionsCount > 0) {
    console.log(chalk.yellow('⚠️ document_sections tem dados mas agentic-rag NÃO está usando!'));
  }
  if (qaCount > 0) {
    console.log(chalk.yellow('⚠️ qa_test_cases existe mas NÃO está sendo usado para busca!'));
  }
}

check().catch(console.error);
