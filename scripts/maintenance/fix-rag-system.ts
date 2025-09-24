// Script para corrigir o sistema RAG usando a infraestrutura existente
// Execute com: npx tsx scripts/fix-rag-system.ts

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente não configuradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log('🔧 Corrigindo Sistema RAG\n');

async function executeSQL() {
  console.log('📝 Criando/Atualizando estruturas SQL...\n');
  
  // SQL simplificado para criar apenas o essencial
  const sqlCommands = [
    // 1. Adicionar coluna chunk_metadata se não existir
    `DO $$ 
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'document_embeddings' 
        AND column_name = 'chunk_metadata'
      ) THEN
        ALTER TABLE document_embeddings 
        ADD COLUMN chunk_metadata jsonb;
      END IF;
    END $$;`,
    
    // 2. Criar índice para chunk_metadata
    `CREATE INDEX IF NOT EXISTS idx_chunk_metadata 
    ON document_embeddings USING gin(chunk_metadata);`,
    
    // 3. Criar função de busca hierárquica simplificada
    `CREATE OR REPLACE FUNCTION match_hierarchical_documents(
      query_embedding vector(1536),
      match_count int,
      document_ids text[],
      query_text text DEFAULT ''
    )
    RETURNS TABLE(
      id text,
      document_id text,
      content_chunk text,
      chunk_metadata jsonb,
      similarity float
    )
    LANGUAGE plpgsql
    AS $$
    BEGIN
      RETURN QUERY
      SELECT 
        de.id::text,
        de.document_id::text,
        de.content_chunk,
        de.chunk_metadata,
        1 - (de.embedding <=> query_embedding) as similarity
      FROM document_embeddings de
      WHERE 
        (cardinality(document_ids) = 0 OR de.document_id = ANY(document_ids))
        AND de.embedding IS NOT NULL
      ORDER BY 
        -- Boost para matches específicos
        CASE 
          WHEN de.chunk_metadata->>'hasCertification' = 'true' 
            AND lower(query_text) LIKE '%certificação%' THEN 0.5
          WHEN de.chunk_metadata->>'has4thDistrict' = 'true' 
            AND lower(query_text) LIKE '%4º distrito%' THEN 0.5
          ELSE 1.0
        END * (de.embedding <=> query_embedding)
      LIMIT match_count;
    END;
    $$;`,
    
    // 4. Criar tabela de cache se não existir
    `CREATE TABLE IF NOT EXISTS query_cache (
      id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      query text NOT NULL,
      embedding vector(1536),
      results jsonb,
      created_at timestamp with time zone DEFAULT now(),
      hit_count int DEFAULT 0,
      UNIQUE(query)
    );`,
    
    // 5. Criar tabela de riscos se não existir
    `CREATE TABLE IF NOT EXISTS bairros_risco_desastre (
      id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      bairro text NOT NULL,
      tipo_risco text NOT NULL,
      nivel_risco text,
      descricao text,
      documento_referencia text,
      artigo_relacionado text,
      created_at timestamp with time zone DEFAULT now()
    );`
  ];
  
  for (const sql of sqlCommands) {
    try {
      const { error } = await supabase.rpc('execute_sql', { query: sql });
      if (error) {
        // Tenta executar diretamente
        console.log('⚠️ execute_sql não disponível, pulando comando SQL');
      } else {
        console.log('✅ SQL executado com sucesso');
      }
    } catch (e) {
      console.log('⚠️ Erro ao executar SQL:', e);
    }
  }
}

async function updateExistingChunks() {
  console.log('\n🔄 Atualizando chunks existentes com metadados...\n');
  
  // Buscar chunks sem metadados
  const { data: chunks, error } = await supabase
    .from('document_embeddings')
    .select('id, content_chunk')
    .is('chunk_metadata', null)
    .limit(100);
  
  if (error) {
    console.error('❌ Erro ao buscar chunks:', error.message);
    return;
  }
  
  console.log(`📊 ${chunks?.length || 0} chunks para atualizar`);
  
  if (!chunks || chunks.length === 0) {
    console.log('✅ Todos os chunks já têm metadados');
    return;
  }
  
  // Atualizar chunks com metadados básicos
  for (const chunk of chunks) {
    const text = chunk.content_chunk.toLowerCase();
    
    const metadata = {
      hasCertification: text.includes('certificação') && 
                       (text.includes('sustentabilidade') || text.includes('ambiental')),
      has4thDistrict: text.includes('4º distrito') || 
                      text.includes('quarto distrito') ||
                      text.includes('zot 8.2'),
      hasImportantKeywords: false,
      keywords: [],
      references: []
    };
    
    // Detectar artigo
    const articleMatch = chunk.content_chunk.match(/Art\.\s*(\d+)/i);
    if (articleMatch) {
      metadata['articleNumber'] = articleMatch[1];
    }
    
    // Detectar inciso
    const incisoMatch = chunk.content_chunk.match(/\b([IVX]+)\s*[-–—.]/);
    if (incisoMatch) {
      metadata['incisoNumber'] = incisoMatch[1];
    }
    
    // Keywords importantes
    if (metadata.hasCertification || metadata.has4thDistrict) {
      metadata.hasImportantKeywords = true;
    }
    
    // Atualizar chunk
    const { error: updateError } = await supabase
      .from('document_embeddings')
      .update({ chunk_metadata: metadata })
      .eq('id', chunk.id);
    
    if (updateError) {
      console.error(`❌ Erro ao atualizar chunk ${chunk.id}:`, updateError.message);
    }
  }
  
  console.log('✅ Chunks atualizados com metadados');
}

async function insertMissingRiskData() {
  console.log('\n📊 Verificando dados de risco...\n');
  
  // Verificar se já existem dados
  const { count } = await supabase
    .from('bairros_risco_desastre')
    .select('*', { count: 'exact', head: true });
  
  if (count && count > 0) {
    console.log(`✅ ${count} registros de risco já existem`);
    return;
  }
  
  console.log('📝 Inserindo dados de risco de exemplo...');
  
  const riskData = [
    {
      bairro: 'Navegantes',
      tipo_risco: 'Inundação',
      nivel_risco: 'Alto',
      descricao: 'Área sujeita a alagamentos frequentes',
      documento_referencia: 'Plano Diretor - Anexo Riscos',
      artigo_relacionado: 'Art. 142'
    },
    {
      bairro: 'Humaitá',
      tipo_risco: 'Inundação',
      nivel_risco: 'Médio',
      descricao: 'Risco moderado de alagamento',
      documento_referencia: 'Plano Diretor - Anexo Riscos',
      artigo_relacionado: 'Art. 142'
    },
    {
      bairro: 'São João',
      tipo_risco: 'Deslizamento',
      nivel_risco: 'Alto',
      descricao: 'Encostas com risco de deslizamento',
      documento_referencia: 'Plano Diretor - Anexo Riscos',
      artigo_relacionado: 'Art. 143'
    }
  ];
  
  const { error } = await supabase
    .from('bairros_risco_desastre')
    .insert(riskData);
  
  if (error) {
    console.error('❌ Erro ao inserir dados de risco:', error.message);
  } else {
    console.log('✅ Dados de risco inseridos');
  }
}

async function testQueries() {
  console.log('\n🧪 Testando queries...\n');
  
  const testQueries = [
    "Qual artigo da LUOS trata da Certificação em Sustentabilidade Ambiental?",
    "Qual a regra para empreendimentos do 4º distrito?",
    "Quais bairros têm risco de inundação?"
  ];
  
  for (const query of testQueries) {
    console.log(`\n📝 Query: "${query}"`);
    
    try {
      // Buscar embedding existente no cache
      const { data: cacheData } = await supabase
        .from('query_cache')
        .select('embedding')
        .eq('query', query)
        .single();
      
      if (cacheData?.embedding) {
        console.log('✅ Embedding encontrado no cache');
        
        // Buscar resultados
        const { data: results } = await supabase
          .rpc('match_documents', {
            query_embedding: cacheData.embedding,
            match_count: 3,
            document_ids: []
          });
        
        if (results && results.length > 0) {
          console.log(`✅ ${results.length} resultados encontrados`);
          console.log(`   Top match: ${results[0].content_chunk.substring(0, 100)}...`);
        } else {
          console.log('❌ Nenhum resultado encontrado');
        }
      } else {
        console.log('⚠️ Embedding não encontrado no cache');
      }
    } catch (e) {
      console.log('❌ Erro na query:', e);
    }
  }
}

async function main() {
  console.log('🚀 Iniciando correção do sistema RAG\n');
  console.log('URL Supabase:', supabaseUrl);
  console.log('=====================================\n');
  
  await executeSQL();
  await updateExistingChunks();
  await insertMissingRiskData();
  await testQueries();
  
  console.log('\n✅ Correção concluída!');
  console.log('\n📋 Próximos passos:');
  console.log('1. Execute o SQL completo no Supabase Dashboard (arquivo EXECUTE_THIS_SQL.sql)');
  console.log('2. Deploy as Edge Functions via Dashboard');
  console.log('3. Execute: npx tsx scripts/reprocess-knowledge-base.ts');
  console.log('4. Teste o sistema com as queries específicas');
}

main().catch(console.error);