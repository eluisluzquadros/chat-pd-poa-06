#!/usr/bin/env node

/**
 * Monitor embedding generation progress
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import chalk from 'chalk';

dotenv.config({ path: '.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ngrqwmvuhvjkeohesbxs.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function monitorProgress() {
  console.clear();
  console.log(chalk.bold.cyan('📊 MONITORAMENTO DE EMBEDDINGS\n'));
  
  // Get total articles
  const { count: total } = await supabase
    .from('legal_articles')
    .select('*', { count: 'exact', head: true });
  
  // Get articles with embeddings
  const { count: withEmbeddings } = await supabase
    .from('legal_articles')
    .select('*', { count: 'exact', head: true })
    .not('embedding', 'is', null);
  
  // Get articles without embeddings
  const { count: withoutEmbeddings } = await supabase
    .from('legal_articles')
    .select('*', { count: 'exact', head: true })
    .is('embedding', null);
  
  const percentage = total > 0 ? ((withEmbeddings / total) * 100).toFixed(1) : 0;
  
  console.log(chalk.blue(`📚 Total de artigos: ${total}`));
  console.log(chalk.green(`✅ Com embeddings: ${withEmbeddings}`));
  console.log(chalk.yellow(`⏳ Sem embeddings: ${withoutEmbeddings}`));
  console.log(chalk.bold(`\n📈 Progresso: ${percentage}%`));
  
  // Progress bar
  const barLength = 50;
  const filled = Math.round((withEmbeddings / total) * barLength);
  const bar = '█'.repeat(filled) + '░'.repeat(barLength - filled);
  console.log(chalk.cyan(`[${bar}]`));
  
  // Get sample of recent embeddings
  const { data: recent } = await supabase
    .from('legal_articles')
    .select('id, document_type, embedding_generated_at')
    .not('embedding_generated_at', 'is', null)
    .order('embedding_generated_at', { ascending: false })
    .limit(5);
  
  if (recent && recent.length > 0) {
    console.log(chalk.gray('\n📝 Últimos processados:'));
    recent.forEach(r => {
      const time = new Date(r.embedding_generated_at).toLocaleTimeString();
      console.log(chalk.gray(`  - ID ${r.id} (${r.document_type}) às ${time}`));
    });
  }
  
  // Estimate time remaining
  if (withEmbeddings > 0 && withoutEmbeddings > 0) {
    const rate = 10; // artigos por segundo (estimativa)
    const secondsRemaining = withoutEmbeddings / rate;
    const minutes = Math.ceil(secondsRemaining / 60);
    console.log(chalk.gray(`\n⏱️ Tempo estimado restante: ${minutes} minutos`));
  }
  
  if (withoutEmbeddings === 0) {
    console.log(chalk.bold.green('\n🎉 COMPLETO! Todos os artigos têm embeddings!'));
    return true;
  }
  
  return false;
}

// Monitor every 5 seconds
async function continuousMonitor() {
  let complete = false;
  
  while (!complete) {
    complete = await monitorProgress();
    
    if (!complete) {
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}

continuousMonitor().catch(console.error);