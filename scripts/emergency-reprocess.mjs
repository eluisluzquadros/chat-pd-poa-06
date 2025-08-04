#!/usr/bin/env node
// Script de emergência para reprocessar documentos
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuração
const supabaseUrl = 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzYwOTAxNywiZXhwIjoyMDY5MTg1MDE3fQ.7jVZP70RAjpfFPfehZt5Gr3vSxn8DZ3YyPJNjCwZXEo';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function uploadAndProcess(filePath, fileName) {
  console.log(`📤 Processando: ${fileName}`);
  
  try {
    // Upload para o storage
    const fileContent = fs.readFileSync(filePath);
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(fileName, fileContent, {
        contentType: 'application/octet-stream',
        upsert: true
      });

    if (uploadError) {
      console.error(`❌ Erro no upload: ${uploadError.message}`);
      return false;
    }

    // Chamar função de processamento
    const { data, error } = await supabase.functions.invoke('process-document', {
      body: {
        fileName: fileName,
        storageUrl: uploadData.path
      }
    });

    if (error) {
      console.error(`❌ Erro no processamento: ${error.message}`);
      return false;
    }

    console.log(`✅ ${fileName} processado com sucesso`);
    return true;
  } catch (err) {
    console.error(`❌ Erro: ${err.message}`);
    return false;
  }
}

async function main() {
  console.log('🚀 Iniciando reprocessamento de emergência...\n');
  
  const knowledgebasePath = path.join(__dirname, '..', 'knowledgebase');
  
  // Lista de arquivos prioritários
  const priorityFiles = [
    'PDPOA2025-Regime_Urbanistico.xlsx',
    'PDPOA2025-ZOTs_vs_Bairros.xlsx',
    'PDPOA2025-Minuta_Preliminar_PLANO_DIRETOR.docx',
    'PDPOA2025-Minuta_Preliminar_LUOS.docx'
  ];
  
  console.log('📦 Arquivos a processar:', priorityFiles.length);
  
  for (const fileName of priorityFiles) {
    const filePath = path.join(knowledgebasePath, fileName);
    
    if (fs.existsSync(filePath)) {
      await uploadAndProcess(filePath, fileName);
      // Aguarda 2 segundos entre processamentos
      await new Promise(resolve => setTimeout(resolve, 2000));
    } else {
      console.log(`⚠️ Arquivo não encontrado: ${fileName}`);
    }
  }
  
  console.log('\n✅ Reprocessamento concluído!');
  console.log('📊 Teste o sistema com estas queries:');
  console.log('   - "Qual é a altura máxima da ZOT 8?"');
  console.log('   - "Liste todas as zonas com altura acima de 60 metros"');
}

main().catch(console.error);