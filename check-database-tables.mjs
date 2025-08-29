#!/usr/bin/env node
/**
 * Verifica tabelas no banco de dados
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkTables() {
  console.log('🔍 Verificando tabelas no Supabase...\n');
  
  // 1. Verificar legal_articles
  const { count: legalCount, error: legalError } = await supabase
    .from('legal_articles')
    .select('*', { count: 'exact', head: true });
  
  if (legalError) {
    console.log('❌ Tabela legal_articles:', legalError.message);
  } else {
    console.log(`✅ Tabela legal_articles: ${legalCount} registros`);
    
    // Verificar alguns registros
    const { data: sample } = await supabase
      .from('legal_articles')
      .select('id, document_type, article_number')
      .limit(3);
    
    if (sample) {
      console.log('   Amostra:', sample);
    }
  }
  
  // 2. Verificar regime_urbanistico_consolidado
  const { count: regimeCount, error: regimeError } = await supabase
    .from('regime_urbanistico_consolidado')
    .select('*', { count: 'exact', head: true });
  
  if (regimeError) {
    console.log('❌ Tabela regime_urbanistico_consolidado:', regimeError.message);
  } else {
    console.log(`✅ Tabela regime_urbanistico_consolidado: ${regimeCount} registros`);
    
    // Verificar alguns registros
    const { data: sample } = await supabase
      .from('regime_urbanistico_consolidado')
      .select('id, nome_bairro, nome_zona, altura_maxima')
      .limit(3);
    
    if (sample) {
      console.log('   Amostra:', sample);
    }
  }
  
  // 3. Verificar se RPC match_legal_articles existe
  console.log('\n📊 Testando RPC functions...');
  
  try {
    // Criar um embedding fake para teste
    const fakeEmbedding = new Array(1536).fill(0.1);
    
    const { data, error } = await supabase.rpc('match_legal_articles', {
      query_embedding: fakeEmbedding,
      match_threshold: 0.1,
      match_count: 1
    });
    
    if (error) {
      console.log('❌ RPC match_legal_articles:', error.message);
    } else {
      console.log('✅ RPC match_legal_articles existe');
      if (data && data.length > 0) {
        console.log('   Retornou', data.length, 'resultados');
      }
    }
  } catch (err) {
    console.log('❌ RPC match_legal_articles não existe:', err.message);
  }
  
  // 4. Verificar document_sections
  const { count: sectionsCount, error: sectionsError } = await supabase
    .from('document_sections')
    .select('*', { count: 'exact', head: true });
  
  if (sectionsError) {
    console.log('❌ Tabela document_sections:', sectionsError.message);
  } else {
    console.log(`✅ Tabela document_sections: ${sectionsCount} registros`);
  }
}

checkTables().catch(console.error);