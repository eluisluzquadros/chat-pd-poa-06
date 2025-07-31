// Script para executar SQL diretamente via Supabase Client
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function executeSQLCommands() {
  console.log('🚀 Executando comandos SQL via Supabase Client...\n');
  
  // Primeiro, vamos verificar o que existe
  console.log('📊 Verificando estrutura atual...\n');
  
  try {
    // Teste 1: Verificar se a tabela documents existe
    const { data: docs, error: docsError } = await supabase
      .from('documents')
      .select('id')
      .limit(1);
    
    if (docsError) {
      console.log('❌ Tabela documents:', docsError.message);
    } else {
      console.log('✅ Tabela documents existe');
    }
    
    // Teste 2: Verificar document_embeddings
    const { data: embeddings, error: embError } = await supabase
      .from('document_embeddings')
      .select('id')
      .limit(1);
    
    if (embError) {
      console.log('❌ Tabela document_embeddings:', embError.message);
      
      // Tentar criar a tabela
      console.log('\n🔧 Tentando criar tabela document_embeddings...');
      
      // Usar RPC para executar SQL raw
      const { error: createError } = await supabase.rpc('exec_sql', {
        query: `
          CREATE TABLE IF NOT EXISTS document_embeddings (
            id SERIAL PRIMARY KEY,
            document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
            content_chunk TEXT NOT NULL,
            embedding vector(1536),
            chunk_metadata JSONB DEFAULT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW()
          )
        `
      });
      
      if (createError) {
        console.log('❌ Erro ao criar tabela:', createError.message);
      } else {
        console.log('✅ Tabela criada com sucesso');
      }
    } else {
      console.log('✅ Tabela document_embeddings existe');
    }
    
    // Teste 3: Verificar funções
    console.log('\n🔍 Verificando funções SQL...');
    
    // Tentar chamar match_documents
    const fakeEmbedding = Array(1536).fill(0);
    const { data: matchData, error: matchError } = await supabase
      .rpc('match_documents', {
        query_embedding: fakeEmbedding,
        match_count: 1,
        document_ids: []
      });
    
    if (matchError) {
      console.log('❌ Função match_documents:', matchError.message);
    } else {
      console.log('✅ Função match_documents existe');
    }
    
    // Verificar extensões
    console.log('\n🔌 Verificando extensões...');
    
    // Teste de embedding generation
    const { data: embData, error: embGenError } = await supabase.functions
      .invoke('generate-text-embedding', {
        body: { text: 'teste' }
      });
    
    if (embGenError) {
      console.log('❌ Edge Function generate-text-embedding:', embGenError.message);
    } else {
      console.log('✅ Edge Function generate-text-embedding funcionando');
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
  
  // Agora vamos tentar uma abordagem diferente
  console.log('\n📝 Gerando comandos SQL para execução manual...\n');
  
  const sqlContent = await fs.promises.readFile('EXECUTE_THIS_SQL.sql', 'utf-8');
  
  // Dividir em comandos individuais
  const commands = sqlContent
    .split(/;\s*$/m)
    .map(cmd => cmd.trim())
    .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));
  
  console.log(`Total de comandos SQL: ${commands.length}`);
  
  // Salvar comandos individuais
  for (let i = 0; i < Math.min(5, commands.length); i++) {
    const fileName = `sql_command_${i + 1}.sql`;
    await fs.promises.writeFile(fileName, commands[i] + ';');
    console.log(`✅ Criado: ${fileName}`);
  }
  
  console.log('\n💡 Execute cada arquivo SQL individualmente no Dashboard se necessário.');
}

executeSQLCommands().catch(console.error);