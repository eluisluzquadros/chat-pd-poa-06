import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://ngrqwmvuhvjkeohesbxs.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzYwOTAxNywiZXhwIjoyMDY5MTg1MDE3fQ.7jVZP70RAjpfFPfehZt5Gr3vSxn8DZ3YyPJNjCwZXEo'
);

async function fixDocumentsTable() {
  console.log('🔧 Corrigindo tabela documents...\n');
  
  // Verificar quais colunas existem
  console.log('📊 Verificando estrutura atual da tabela documents...');
  
  const { data: sample } = await supabase
    .from('documents')
    .select('*')
    .limit(1);
  
  if (sample && sample.length > 0) {
    console.log('Colunas encontradas:', Object.keys(sample[0]));
  }
  
  // Criar script SQL para adicionar colunas faltantes
  console.log('\n📋 SQL necessário para adicionar colunas:\n');
  
  const alterTableSQL = `
-- Adicionar colunas faltantes na tabela documents
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS title TEXT;

ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS file_name TEXT;

ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS file_path TEXT;

ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS type TEXT;

ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true;

ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS is_processed BOOLEAN DEFAULT false;
`;

  console.log(alterTableSQL);
  
  // Salvar em arquivo
  const fs = await import('fs');
  await fs.promises.writeFile('fix-documents-columns.sql', alterTableSQL);
  
  console.log('\n✅ SQL salvo em: fix-documents-columns.sql');
  
  // Criar script de upload simplificado que funciona com a estrutura atual
  console.log('\n🚀 Criando script de upload adaptado...');
  
  const uploadScript = `
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const supabase = createClient(
  'https://ngrqwmvuhvjkeohesbxs.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzYwOTAxNywiZXhwIjoyMDY5MTg1MDE3fQ.7jVZP70RAjpfFPfehZt5Gr3vSxn8DZ3YyPJNjCwZXEo'
);

async function uploadDocs() {
  const files = ['PDPOA2025-Minuta_Preliminar_LUOS.docx', 'PDPOA2025-Minuta_Preliminar_PLANO_DIRETOR.docx'];
  
  for (const file of files) {
    console.log('📄 Processando:', file);
    
    // Criar documento com estrutura básica
    const { data: doc } = await supabase
      .from('documents')
      .insert({
        content: 'Documento: ' + file,
        metadata: {
          title: file.replace('.docx', ''),
          source: 'knowledge-base',
          type: 'DOCX'
        }
      })
      .select()
      .single();
    
    if (doc) {
      console.log('✅ Documento criado:', doc.id);
      
      // Processar documento
      const { data, error } = await supabase.functions.invoke('process-document', {
        body: { documentId: doc.id }
      });
      
      if (error) {
        console.log('❌ Erro:', error.message);
      } else {
        console.log('✅ Processado:', data?.chunks_processed || 0, 'chunks');
      }
    }
  }
}

uploadDocs();
`;

  await fs.promises.writeFile('upload-docs-simple.mjs', uploadScript);
  console.log('✅ Script salvo em: upload-docs-simple.mjs');
  
  console.log('\n📋 PRÓXIMOS PASSOS:');
  console.log('1. Execute o SQL no Dashboard: fix-documents-columns.sql');
  console.log('2. Depois execute: node upload-docs-simple.mjs');
  console.log('\nOu use a estrutura atual com: node upload-docs-simple.mjs');
}

fixDocumentsTable();