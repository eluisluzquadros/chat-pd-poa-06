#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import chalk from 'chalk';

dotenv.config({ path: '.env' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SERVICE_KEY || ANON_KEY);

async function checkTables() {
  console.log(chalk.cyan.bold('\n🔍 VERIFICANDO ESTRUTURA DAS TABELAS\n'));
  
  // Check legal_articles structure
  console.log(chalk.cyan('1. ESTRUTURA DA TABELA legal_articles'));
  
  const { data: sample, error } = await supabase
    .from('legal_articles')
    .select('*')
    .limit(1);
  
  if (error) {
    console.log(chalk.red('Erro:', error.message));
  } else if (sample && sample[0]) {
    console.log(chalk.green('Colunas disponíveis:'));
    Object.keys(sample[0]).forEach(col => {
      console.log(chalk.white(`  • ${col}`));
    });
  }
  
  // Check actual articles
  console.log(chalk.cyan('\n2. ARTIGOS ESPECÍFICOS'));
  
  const articles = [1, 3, 5, 38, 75, 119];
  for (const num of articles) {
    const { data, error } = await supabase
      .from('legal_articles')
      .select('*')
      .eq('article_number', num)
      .limit(1);
    
    if (data && data[0]) {
      console.log(chalk.green(`Art. ${num} (${data[0].document_type}):`));
      const content = data[0].full_content || data[0].article_text || data[0].content || '';
      console.log(chalk.white(`   ${content.substring(0, 100)}...`));
    } else {
      console.log(chalk.yellow(`Art. ${num} não encontrado`));
    }
  }
  
  // Check count
  console.log(chalk.cyan('\n3. CONTAGEM DE REGISTROS'));
  
  const { count: totalArticles } = await supabase
    .from('legal_articles')
    .select('*', { count: 'exact', head: true });
  
  console.log(chalk.green(`Total de artigos: ${totalArticles}`));
  
  // Check regime_urbanistico_consolidado
  console.log(chalk.cyan('\n4. BAIRROS DISPONÍVEIS'));
  
  const { data: bairros } = await supabase
    .from('regime_urbanistico_consolidado')
    .select('Bairro, Zona');
  
  const uniqueBairros = [...new Set(bairros?.map(b => b.Bairro))].sort();
  console.log(chalk.green(`Total de bairros únicos: ${uniqueBairros.length}`));
  console.log(chalk.white('Primeiros 20 bairros:'));
  uniqueBairros.slice(0, 20).forEach(b => {
    console.log(chalk.white(`  • ${b}`));
  });
  
  // Check if "Aberta dos Morros" exists
  const abertaDosMorros = uniqueBairros.find(b => 
    b?.toLowerCase().includes('aberta') || 
    b?.toLowerCase().includes('morros')
  );
  
  if (abertaDosMorros) {
    console.log(chalk.green(`\nEncontrado: ${abertaDosMorros}`));
  } else {
    console.log(chalk.yellow('\n"Aberta dos Morros" não encontrado'));
  }
}

checkTables().catch(error => {
  console.error(chalk.red('Erro:', error));
  process.exit(1);
});
