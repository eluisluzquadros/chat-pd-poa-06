#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function verifyHierarchy() {
  console.log('🔍 Verificando tabela legal_hierarchy...\n');
  
  // 1. Check if table exists and has data
  const { data: hierarchyData, error: hierarchyError } = await supabase
    .from('legal_hierarchy')
    .select('*')
    .eq('document_type', 'LUOS')
    .order('order_index');
    
  if (hierarchyError) {
    console.error('❌ Erro ao acessar legal_hierarchy:', hierarchyError.message);
    return false;
  }
  
  console.log(`✅ Tabela legal_hierarchy existe com ${hierarchyData.length} registros LUOS\n`);
  
  // 2. Test the function
  console.log('🧪 Testando função get_article_context...\n');
  
  const testCases = [
    { doc: 'LUOS', art: 119, expected: 'Título X' },
    { doc: 'LUOS', art: 75, expected: 'Título VI' },
    { doc: 'LUOS', art: 1, expected: 'Título I' },
    { doc: 'LUOS', art: 4, expected: 'Título I' }
  ];
  
  for (const test of testCases) {
    const { data, error } = await supabase.rpc('get_article_context', {
      doc_type: test.doc,
      art_num: test.art
    });
    
    if (error) {
      console.log(`❌ Art. ${test.art}: Erro - ${error.message}`);
    } else {
      const passed = data?.includes(test.expected) ? '✅' : '⚠️';
      console.log(`${passed} Art. ${test.art}: ${data || 'Não encontrado'}`);
    }
  }
  
  // 3. Show hierarchy structure
  console.log('\n📊 Estrutura da Hierarquia LUOS:');
  console.log('─'.repeat(50));
  
  hierarchyData.slice(0, 10).forEach(item => {
    console.log(`${item.hierarchy_type.toUpperCase()} ${item.hierarchy_number}: ${item.hierarchy_name}`);
    console.log(`  Arts. ${item.article_start} a ${item.article_end}`);
  });
  
  return true;
}

verifyHierarchy().catch(console.error);