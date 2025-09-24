#!/usr/bin/env node

/**
 * Corrigir inconsistências específicas das zonas
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import chalk from 'chalk';

dotenv.config({ path: '.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ngrqwmvuhvjkeohesbxs.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixZoneInconsistencies() {
  console.log(chalk.bold.cyan('\n🔧 CORRIGINDO INCONSISTÊNCIAS DAS ZONAS\n'));
  
  // Buscar todos os registros REGIME_FALLBACK
  const { data: records, error } = await supabase
    .from('legal_articles')
    .select('id, keywords')
    .eq('document_type', 'REGIME_FALLBACK');
  
  if (error || !records) {
    console.error(chalk.red('❌ Erro ao buscar registros:', error?.message));
    return;
  }
  
  console.log(chalk.blue(`📊 Encontrados ${records.length} registros para verificar`));
  
  let updated = 0;
  let totalChanges = 0;
  
  for (const record of records) {
    const originalKeywords = [...(record.keywords || [])];
    let newKeywords = [...originalKeywords];
    let hasChanges = false;
    
    // Corrigir cada keyword
    for (let i = 0; i < newKeywords.length; i++) {
      const keyword = newKeywords[i];
      let correctedKeyword = keyword;
      
      // Corrigir ZONA_ZOT-01, ZONA_ZOT-02, etc.
      if (keyword.startsWith('ZONA_ZOT-')) {
        const match = keyword.match(/ZONA_ZOT-(\d+)/);
        if (match) {
          const zoneNum = match[1].padStart(2, '0');
          correctedKeyword = `ZONA_${zoneNum}`;
          console.log(chalk.gray(`  ${keyword} → ${correctedKeyword}`));
        }
      }
      // Corrigir ZONA_ZONA-RURAL
      else if (keyword === 'ZONA_ZONA-RURAL') {
        correctedKeyword = 'ZONA_RURAL';
        console.log(chalk.gray(`  ${keyword} → ${correctedKeyword}`));
      }
      
      if (correctedKeyword !== keyword) {
        newKeywords[i] = correctedKeyword;
        hasChanges = true;
        totalChanges++;
      }
    }
    
    // Atualizar registro se houve mudanças
    if (hasChanges) {
      const { error: updateError } = await supabase
        .from('legal_articles')
        .update({ keywords: newKeywords })
        .eq('id', record.id);
      
      if (updateError) {
        console.error(chalk.red(`❌ Erro atualizando registro ${record.id}:`, updateError.message));
      } else {
        updated++;
        console.log(chalk.green(`✅ Registro ${record.id} atualizado`));
      }
    }
  }
  
  console.log(chalk.bold.cyan('\n📊 RESULTADO:'));
  console.log(`  ✅ Registros atualizados: ${updated}`);
  console.log(`  🔄 Total de keywords corrigidas: ${totalChanges}`);
  
  // Verificar resultado final
  console.log(chalk.blue('\n🔍 Verificando resultado final...'));
  
  const { data: finalData } = await supabase
    .from('legal_articles')
    .select('keywords')
    .eq('document_type', 'REGIME_FALLBACK');
  
  const finalZonas = new Set();
  finalData?.forEach(r => {
    r.keywords?.forEach(k => {
      if (k.startsWith('ZONA_') || k.includes('ZOT')) {
        finalZonas.add(k);
      }
    });
  });
  
  const remainingIssues = [...finalZonas].filter(z => 
    z.startsWith('ZONA_ZOT-') || z === 'ZONA_ZONA-RURAL'
  );
  
  if (remainingIssues.length === 0) {
    console.log(chalk.bold.green('🎉 TODAS AS INCONSISTÊNCIAS FORAM CORRIGIDAS!'));
  } else {
    console.log(chalk.yellow(`⚠️ Ainda restam ${remainingIssues.length} inconsistências:`));
    remainingIssues.forEach(issue => console.log(`  - ${issue}`));
  }
  
  console.log(chalk.gray(`\nTotal de zonas únicas: ${finalZonas.size}`));
}

// Executar correção
fixZoneInconsistencies().catch(error => {
  console.error(chalk.red('❌ Erro fatal:', error));
  process.exit(1);
});