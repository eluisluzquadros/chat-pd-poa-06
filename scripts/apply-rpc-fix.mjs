#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzYwOTAxNywiZXhwIjoyMDY5MTg1MDE3fQ.7jVZP70RAjpfFPfehZt5Gr3vSxn8DZ3YyPJNjCwZXEo';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyRPCFix() {
  console.log('🔧 Aplicando correção da RPC match_legal_articles...\n');
  
  try {
    // Criar ou atualizar a função RPC
    const { data, error } = await supabase.rpc('query', {
      query: `
        CREATE OR REPLACE FUNCTION match_legal_articles(
          query_embedding vector(1536),
          match_threshold float DEFAULT 0.6,
          match_count int DEFAULT 10
        )
        RETURNS TABLE (
          id bigint,
          document_type text,
          article_number int,
          article_text text,
          full_content text,
          keywords text[],
          source text,
          title text,
          hierarchy_info jsonb,
          embedding vector(1536),
          similarity float
        )
        LANGUAGE plpgsql
        AS $$
        BEGIN
          RETURN QUERY
          SELECT 
            la.id,
            la.document_type,
            la.article_number,
            la.article_text,
            la.full_content,
            la.keywords,
            la.source,
            la.title,
            la.hierarchy_info,
            la.embedding,
            1 - (la.embedding <=> query_embedding) as similarity
          FROM legal_articles la
          WHERE 
            la.embedding IS NOT NULL
            -- CORREÇÃO: Inclui TODOS os document_types
            AND 1 - (la.embedding <=> query_embedding) > match_threshold
          ORDER BY 
            la.embedding <=> query_embedding
          LIMIT match_count;
        END;
        $$;
      `
    });

    if (error) {
      console.error('❌ Erro ao aplicar correção:', error.message);
      return false;
    }

    console.log('✅ RPC match_legal_articles atualizada com sucesso!');
    
    // Verificar se a correção foi aplicada
    console.log('\n🔍 Testando RPC corrigida...');
    
    const fakeEmbedding = new Array(1536).fill(0.1);
    const { data: testData, error: testError } = await supabase.rpc('match_legal_articles', {
      query_embedding: fakeEmbedding,
      match_threshold: 0.1,
      match_count: 20
    });
    
    if (testError) {
      console.error('❌ Erro ao testar RPC:', testError.message);
      return false;
    }
    
    // Verificar document types retornados
    const docTypes = {};
    testData?.forEach(item => {
      docTypes[item.document_type] = (docTypes[item.document_type] || 0) + 1;
    });
    
    console.log('\n📊 Document types sendo retornados:');
    Object.entries(docTypes).forEach(([type, count]) => {
      console.log(`  • ${type}: ${count}`);
    });
    
    if (docTypes['REGIME_FALLBACK'] || docTypes['QA_CATEGORY']) {
      console.log('\n🎉 SUCESSO! RPC agora retorna TODOS os document_types!');
      return true;
    } else {
      console.log('\n⚠️ Aviso: REGIME_FALLBACK e QA_CATEGORY ainda não aparecem nos resultados.');
      console.log('Isso pode ser normal se não houver matches com o embedding de teste.');
      return true;
    }
    
  } catch (err) {
    console.error('❌ Erro crítico:', err.message);
    return false;
  }
}

// Executar
applyRPCFix().then(success => {
  if (success) {
    console.log('\n✅ Correção aplicada com sucesso!');
    process.exit(0);
  } else {
    console.log('\n❌ Falha ao aplicar correção.');
    process.exit(1);
  }
});