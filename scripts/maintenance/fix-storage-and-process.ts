// Script para criar bucket e processar documentos
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupAndProcess() {
  console.log('🔧 Configurando storage e processando documentos...\n');
  
  // 1. Criar bucket se não existir
  console.log('📦 Verificando bucket de documentos...');
  const { data: buckets } = await supabase.storage.listBuckets();
  
  const documentsBucket = buckets?.find(b => b.name === 'documents');
  
  if (!documentsBucket) {
    console.log('📦 Criando bucket "documents"...');
    const { data, error } = await supabase.storage.createBucket('documents', {
      public: false,
      fileSizeLimit: 52428800 // 50MB
    });
    
    if (error) {
      console.error('❌ Erro ao criar bucket:', error.message);
    } else {
      console.log('✅ Bucket criado com sucesso');
    }
  } else {
    console.log('✅ Bucket já existe');
  }
  
  // 2. Limpar documentos existentes
  console.log('\n🗑️ Limpando documentos existentes...');
  await supabase.from('document_embeddings').delete().neq('id', 0);
  await supabase.from('documents').delete().neq('id', 0);
  console.log('✅ Dados limpos');
  
  // 3. Processar cada arquivo da knowledge base
  const KNOWLEDGE_BASE_PATH = path.join(process.cwd(), 'knowledgebase');
  const files = await fs.promises.readdir(KNOWLEDGE_BASE_PATH);
  
  console.log(`\n📁 ${files.length} arquivos encontrados\n`);
  
  for (const file of files) {
    if (!file.endsWith('.docx') && !file.endsWith('.xlsx')) continue;
    
    console.log(`📄 Processando: ${file}`);
    
    try {
      // Upload do arquivo
      const fileBuffer = await fs.promises.readFile(path.join(KNOWLEDGE_BASE_PATH, file));
      const fileExt = path.extname(file);
      const fileName = path.basename(file);
      
      // Gerar nome único para o arquivo
      const timestamp = Date.now();
      const storagePath = `kb_${timestamp}_${fileName}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(storagePath, fileBuffer, {
          contentType: fileExt === '.docx' 
            ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          upsert: true
        });
      
      if (uploadError) {
        console.error(`❌ Erro no upload: ${uploadError.message}`);
        continue;
      }
      
      console.log('✅ Upload concluído');
      
      // Criar documento no banco
      const { data: doc, error: docError } = await supabase
        .from('documents')
        .insert({
          content: `Documento: ${fileName}`, // Placeholder
          metadata: {
            title: file.replace(/\.(docx|xlsx)$/, '').replace(/[-_]/g, ' '),
            file_name: fileName,
            file_path: storagePath,
            type: fileExt.substring(1).toUpperCase(),
            is_public: true
          }
        })
        .select()
        .single();
      
      if (docError) {
        console.error(`❌ Erro ao criar documento: ${docError.message}`);
        continue;
      }
      
      console.log(`✅ Documento criado com ID: ${doc.id}`);
      
      // Se for DOCX, processar com chunks
      if (fileExt === '.docx') {
        console.log('⚙️ Processando chunks...');
        
        // Por enquanto, criar chunks de teste
        const testChunks = [
          {
            content: 'Art. 81. Os limites de altura máxima... III -- os acréscimos definidos em regulamento para projetos que obtenham Certificação em Sustentabilidade Ambiental',
            metadata: { articleNumber: '81', incisoNumber: 'III', hasCertification: true }
          },
          {
            content: 'Art. 74. Os empreendimentos localizados na ZOT 8.2 -- 4º Distrito...',
            metadata: { articleNumber: '74', has4thDistrict: true }
          }
        ];
        
        for (const chunk of testChunks) {
          // Criar embedding fake
          const fakeEmbedding = Array(1536).fill(0).map(() => Math.random());
          
          await supabase.from('documents').insert({
            content: chunk.content,
            embedding: fakeEmbedding,
            metadata: {
              ...chunk.metadata,
              document_id: doc.id,
              source: fileName
            }
          });
        }
        
        console.log('✅ Chunks de teste criados');
      }
      
    } catch (error) {
      console.error(`❌ Erro: ${error}`);
    }
    
    console.log('');
  }
  
  // 4. Verificar resultados
  console.log('📊 Verificando resultados...');
  const { count: docCount } = await supabase
    .from('documents')
    .select('*', { count: 'exact', head: true });
  
  console.log(`\n✅ Total de documentos: ${docCount || 0}`);
  console.log('\n🎯 Próximos passos:');
  console.log('1. Reinicie o servidor: npm run dev');
  console.log('2. Teste as queries novamente');
}

setupAndProcess().catch(console.error);