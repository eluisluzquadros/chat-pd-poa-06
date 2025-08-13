#!/usr/bin/env node

/**
 * Adicionar mapeamento de artigos legais ao vector store
 */

import { createClient } from '@supabase/supabase-js';
import { OpenAI } from 'openai';
import chalk from 'chalk';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

config({ path: path.join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

async function generateEmbedding(text) {
  const response = await openai.embeddings.create({
    model: "text-embedding-ada-002",
    input: text,
  });
  return response.data[0].embedding;
}

async function main() {
  console.log(chalk.cyan.bold('\n📚 ADICIONANDO MAPEAMENTO DE ARTIGOS LEGAIS\n'));
  
  // Ler arquivo de mapeamento
  const mappingPath = path.join(__dirname, '..', 'knowledgebase', 'MAPEAMENTO_ARTIGOS_LEGAIS.md');
  const content = await fs.readFile(mappingPath, 'utf-8');
  
  // Criar chunks específicos para cada artigo importante
  const chunks = [
    {
      content: `MAPEAMENTO OFICIAL DE ARTIGOS - LUOS
      
Certificação em Sustentabilidade Ambiental: LUOS - Art. 81, Inciso III
Altura máxima de edificação: LUOS - Art. 81
Coeficiente de aproveitamento: LUOS - Art. 82
Recuos obrigatórios: LUOS - Art. 83
Taxa de permeabilidade: LUOS - Art. 84
Outorga Onerosa: LUOS - Art. 86
Estudo de Impacto de Vizinhança (EIV): LUOS - Art. 89
4º Distrito (Quarto Distrito): LUOS - Art. 74`,
      metadata: {
        source: 'MAPEAMENTO_ARTIGOS_LEGAIS.md',
        type: 'legal_reference',
        law: 'LUOS',
        importance: 'critical'
      }
    },
    {
      content: `MAPEAMENTO OFICIAL DE ARTIGOS - PDUS
      
ZEIS (Zonas Especiais de Interesse Social): PDUS - Art. 92
AEIS (Áreas Especiais de Interesse Social): PDUS - Art. 93
Áreas de Preservação Permanente (APP): PDUS - Art. 95
Habitação de Interesse Social (HIS): PDUS - Art. 101
Regularização Fundiária: PDUS - Art. 102
CMDUA (Conselho Municipal): PDUS - Art. 104`,
      metadata: {
        source: 'MAPEAMENTO_ARTIGOS_LEGAIS.md',
        type: 'legal_reference',
        law: 'PDUS',
        importance: 'critical'
      }
    },
    {
      content: `CORREÇÕES IMPORTANTES DE ARTIGOS

EIV (Estudo de Impacto de Vizinhança):
- CORRETO: LUOS - Art. 89
- ERRADO: Art. 90

ZEIS (Zonas Especiais de Interesse Social):
- CORRETO: PDUS - Art. 92
- ERRADO: LUOS ou sem citação de lei

Certificação em Sustentabilidade:
- CORRETO: LUOS - Art. 81, Inciso III
- ERRADO: Art. 80 ou 82`,
      metadata: {
        source: 'MAPEAMENTO_ARTIGOS_LEGAIS.md',
        type: 'corrections',
        importance: 'critical'
      }
    },
    {
      content: content, // Documento completo
      metadata: {
        source: 'MAPEAMENTO_ARTIGOS_LEGAIS.md',
        type: 'full_document',
        importance: 'high'
      }
    }
  ];
  
  console.log(chalk.yellow(`📝 Processando ${chunks.length} chunks de artigos legais...\n`));
  
  let success = 0;
  let failed = 0;
  
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    console.log(chalk.gray(`${i + 1}/${chunks.length} - ${chunk.metadata.type}...`));
    
    try {
      // Gerar embedding
      const embedding = await generateEmbedding(chunk.content);
      
      // Salvar no banco usando SQL direto para garantir vector correto
      const { error } = await supabase
        .from('document_sections')
        .insert({
          content: chunk.content,
          metadata: chunk.metadata,
          embedding: embedding,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      
      if (error) {
        console.log(chalk.red(`  ❌ Erro: ${error.message}`));
        failed++;
      } else {
        console.log(chalk.green(`  ✅ Adicionado com sucesso`));
        success++;
      }
      
    } catch (error) {
      console.log(chalk.red(`  ❌ Erro: ${error.message}`));
      failed++;
    }
    
    // Pequena pausa entre chunks
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log(chalk.cyan.bold('\n' + '═'.repeat(60)));
  console.log(chalk.cyan.bold('📊 RESUMO'));
  console.log(chalk.cyan.bold('═'.repeat(60) + '\n'));
  
  console.log(`Total de chunks: ${chunks.length}`);
  console.log(`${chalk.green('✅ Sucesso:')} ${success}`);
  console.log(`${chalk.red('❌ Falhas:')} ${failed}`);
  
  if (success > 0) {
    console.log(chalk.green.bold('\n✨ Mapeamento de artigos adicionado ao vector store!'));
    console.log('O sistema agora deve citar os artigos corretamente.');
  }
}

main().catch(error => {
  console.error(chalk.red('\n❌ ERRO:'), error);
  process.exit(1);
});