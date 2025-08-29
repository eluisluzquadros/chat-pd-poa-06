#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkStatus() {
  // Contar total de Q&A chunks
  const { count: qaCount } = await supabase
    .from('document_sections')
    .select('*', { count: 'exact', head: true })
    .eq('metadata->>source_file', 'PDPOA2025-QA.docx');
  
  // Contar total geral
  const { count: totalCount } = await supabase
    .from('document_sections')
    .select('*', { count: 'exact', head: true });
  
  // Contar cache entries
  const { count: cacheCount } = await supabase
    .from('query_cache')
    .select('*', { count: 'exact', head: true });
  
  console.log('\n📊 STATUS DA BASE DE CONHECIMENTO:');
  console.log('=====================================');
  console.log(`Q&A chunks: ${qaCount || 0}`);
  console.log(`Total document_sections: ${totalCount || 0}`);
  console.log(`Cache entries: ${cacheCount || 0}`);
  console.log(`Completude Q&A: ${Math.round(((qaCount || 0) / 1400) * 100)}%`);
  
  if (qaCount >= 1400) {
    console.log('\n🎉 BASE DE Q&A COMPLETA!');
  } else if (qaCount >= 1200) {
    console.log('\n✅ BASE DE Q&A COM BOA COBERTURA!');
    console.log(`Faltam apenas ${1400 - qaCount} chunks para 100%`);
  } else {
    console.log(`\n⚠️ Faltam ${1400 - qaCount} Q&A chunks para completar`);
  }
  
  // Verificar últimos chunks adicionados
  const { data: recent } = await supabase
    .from('document_sections')
    .select('id, content, created_at')
    .eq('metadata->>source_file', 'PDPOA2025-QA.docx')
    .order('created_at', { ascending: false })
    .limit(3);
  
  if (recent && recent.length > 0) {
    console.log('\n📝 Últimos chunks adicionados:');
    recent.forEach((chunk, idx) => {
      const preview = chunk.content.substring(0, 60).replace(/\n/g, ' ');
      console.log(`  ${idx + 1}. ${preview}...`);
    });
  }
}

checkStatus().catch(console.error);