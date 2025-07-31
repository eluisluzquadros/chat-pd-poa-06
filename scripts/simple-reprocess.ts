// Script simplificado para reprocessar a base de conhecimento
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const KNOWLEDGE_BASE_PATH = path.join(process.cwd(), 'knowledgebase');

async function uploadAndProcess() {
  console.log('🚀 Iniciando reprocessamento simplificado...\n');
  
  // Lista arquivos
  const files = await fs.promises.readdir(KNOWLEDGE_BASE_PATH);
  const docxFiles = files.filter(f => f.endsWith('.docx'));
  
  console.log(`📁 ${docxFiles.length} arquivos DOCX encontrados\n`);
  
  for (const file of docxFiles) {
    console.log(`📄 Processando: ${file}`);
    
    try {
      // 1. Upload do arquivo
      const fileBuffer = await fs.promises.readFile(path.join(KNOWLEDGE_BASE_PATH, file));
      const storagePath = `knowledge-base/${file}`;
      
      // Remove arquivo existente
      await supabase.storage.from('documents').remove([storagePath]);
      
      // Upload novo
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(storagePath, fileBuffer, {
          contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          upsert: true
        });
      
      if (uploadError) {
        console.error(`❌ Erro no upload: ${uploadError.message}`);
        continue;
      }
      
      console.log('✅ Upload concluído');
      
      // 2. Criar documento no banco
      const { data: doc, error: docError } = await supabase
        .from('documents')
        .insert({
          title: file.replace('.docx', '').replace(/[-_]/g, ' '),
          file_name: file,
          file_path: storagePath,
          type: 'DOCX',
          is_public: true,
          is_processed: false
        })
        .select()
        .single();
      
      if (docError) {
        console.error(`❌ Erro ao criar documento: ${docError.message}`);
        continue;
      }
      
      console.log(`✅ Documento criado com ID: ${doc.id}`);
      
      // 3. Processar documento
      console.log('⚙️ Processando chunks e embeddings...');
      const { data: processData, error: processError } = await supabase.functions.invoke('process-document', {
        body: { documentId: doc.id }
      });
      
      if (processError) {
        console.error(`❌ Erro no processamento: ${processError.message}`);
      } else {
        console.log(`✅ ${processData?.chunks_processed || 0} chunks criados\n`);
      }
      
    } catch (error) {
      console.error(`❌ Erro geral: ${error}\n`);
    }
  }
  
  console.log('✅ Reprocessamento concluído!');
}

uploadAndProcess().catch(console.error);