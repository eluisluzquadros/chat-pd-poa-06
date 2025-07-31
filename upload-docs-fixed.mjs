import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const supabase = createClient(
  'https://ngrqwmvuhvjkeohesbxs.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzYwOTAxNywiZXhwIjoyMDY5MTg1MDE3fQ.7jVZP70RAjpfFPfehZt5Gr3vSxn8DZ3YyPJNjCwZXEo'
);

async function uploadDocs() {
  const docsToProcess = [
    {
      file: 'PDPOA2025-Minuta_Preliminar_LUOS.docx',
      type: 'DOCX',
      priority: 'high'
    },
    {
      file: 'PDPOA2025-Minuta_Preliminar_PLANO_DIRETOR.docx',
      type: 'DOCX',
      priority: 'high'
    },
    {
      file: 'PDPOA2025-Objetivos_Previstos.docx',
      type: 'DOCX',
      priority: 'medium'
    },
    {
      file: 'PDPOA2025-QA.docx',
      type: 'DOCX',
      priority: 'medium'
    }
  ];
  
  console.log('🚀 Processando documentos da knowledgebase...\n');
  
  for (const docInfo of docsToProcess) {
    console.log(`\n📄 Processando: ${docInfo.file} (Prioridade: ${docInfo.priority})`);
    
    try {
      // Verificar se documento já existe
      const { data: existing } = await supabase
        .from('documents')
        .select('id, metadata')
        .eq('metadata->>title', docInfo.file.replace('.docx', ''))
        .single();
      
      if (existing) {
        console.log('⚠️ Documento já existe com ID:', existing.id);
        
        // Verificar se já tem chunks
        const { count } = await supabase
          .from('document_embeddings')
          .select('*', { count: 'exact', head: true })
          .eq('document_id', existing.id);
        
        if (count > 0) {
          console.log(`✅ Já processado com ${count} chunks`);
          continue;
        } else {
          console.log('🔄 Reprocessando documento...');
          
          // Processar documento existente
          const { data, error } = await supabase.functions.invoke('process-document', {
            body: { 
              documentId: existing.id,
              forceReprocess: true 
            }
          });
          
          if (error) {
            console.log('❌ Erro ao reprocessar:', error.message);
          } else {
            console.log('✅ Reprocessado:', data?.chunks_processed || 0, 'chunks');
          }
        }
      } else {
        // Criar novo documento sem as colunas extras
        const filePath = `knowledgebase/${docInfo.file}`;
        
        const { data: doc, error: insertError } = await supabase
          .from('documents')
          .insert({
            content: `Documento: ${docInfo.file}`, // Simplificado
            metadata: {
              title: docInfo.file.replace('.docx', ''),
              source: 'knowledge-base',
              type: docInfo.type,
              file_name: docInfo.file,
              file_path: filePath,
              priority: docInfo.priority
            }
          })
          .select()
          .single();
        
        if (insertError) {
          console.log('❌ Erro ao criar documento:', insertError.message);
          continue;
        }
        
        if (doc) {
          console.log('✅ Documento criado:', doc.id);
          
          // Processar documento
          const { data, error } = await supabase.functions.invoke('process-document', {
            body: { 
              documentId: doc.id,
              useHierarchicalChunking: true 
            }
          });
          
          if (error) {
            console.log('❌ Erro ao processar:', error.message);
          } else {
            console.log('✅ Processado:', data?.chunks_processed || 0, 'chunks');
          }
        }
      }
    } catch (error) {
      console.log('❌ Erro geral:', error.message);
    }
  }
  
  // Verificar total de chunks criados
  const { count: totalChunks } = await supabase
    .from('document_embeddings')
    .select('*', { count: 'exact', head: true });
  
  console.log(`\n\n📊 RESUMO FINAL:`);
  console.log(`Total de chunks no sistema: ${totalChunks || 0}`);
}

uploadDocs().catch(console.error);