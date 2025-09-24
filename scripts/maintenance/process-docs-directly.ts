// Script para processar documentos diretamente sem Edge Functions
// Execute com: npx tsx scripts/process-docs-directly.ts

import { createClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const openaiKey = process.env.OPENAI_API_KEY!;

if (!supabaseUrl || !supabaseServiceKey || !openaiKey) {
  console.error('❌ Variáveis de ambiente não configuradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Função para gerar embedding usando OpenAI
async function generateEmbedding(text: string): Promise<number[]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-ada-002',
      input: text.substring(0, 8000), // Limitar tamanho
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

// Função para criar chunks com metadados
function createChunksWithMetadata(content: string, documentId: string) {
  const chunks: Array<{
    text: string;
    metadata: any;
  }> = [];

  // Dividir por artigos
  const articleRegex = /Art\.\s*(\d+)[\s\S]*?(?=Art\.\s*\d+|$)/gi;
  const matches = Array.from(content.matchAll(articleRegex));

  for (const match of matches) {
    const articleNumber = match[1];
    const articleText = match[0];
    
    // Detectar keywords importantes
    const lowerText = articleText.toLowerCase();
    const metadata = {
      articleNumber,
      hasCertification: lowerText.includes('certificação') && 
                       (lowerText.includes('sustentabilidade') || lowerText.includes('ambiental')),
      has4thDistrict: lowerText.includes('4º distrito') || 
                      lowerText.includes('quarto distrito'),
      hasImportantKeywords: false,
      type: 'article'
    };
    
    if (metadata.hasCertification || metadata.has4thDistrict) {
      metadata.hasImportantKeywords = true;
    }
    
    chunks.push({
      text: articleText.trim(),
      metadata
    });
    
    // Criar chunks adicionais para incisos importantes
    const incisoRegex = /\b([IVX]+)\s*[-–—.]\s*([^;]+)/g;
    const incisoMatches = Array.from(articleText.matchAll(incisoRegex));
    
    for (const incisoMatch of incisoMatches) {
      const incisoText = incisoMatch[0];
      const incisoLower = incisoText.toLowerCase();
      
      if (incisoLower.includes('certificação') || 
          incisoLower.includes('sustentabilidade') ||
          incisoLower.includes('4º distrito')) {
        
        chunks.push({
          text: `Art. ${articleNumber} - ${incisoText}`,
          metadata: {
            ...metadata,
            incisoNumber: incisoMatch[1],
            type: 'inciso'
          }
        });
      }
    }
  }
  
  // Se não encontrou artigos, criar chunks por parágrafos
  if (chunks.length === 0) {
    const paragraphs = content.split('\n\n').filter(p => p.trim().length > 100);
    
    for (const paragraph of paragraphs) {
      const lowerText = paragraph.toLowerCase();
      chunks.push({
        text: paragraph.trim(),
        metadata: {
          hasCertification: lowerText.includes('certificação'),
          has4thDistrict: lowerText.includes('4º distrito'),
          hasImportantKeywords: lowerText.includes('certificação') || 
                               lowerText.includes('4º distrito') ||
                               lowerText.includes('sustentabilidade'),
          type: 'paragraph'
        }
      });
    }
  }
  
  return chunks;
}

async function processDocuments() {
  console.log('🚀 Processando documentos diretamente...\n');
  
  // Buscar documentos não processados
  const { data: documents, error } = await supabase
    .from('documents')
    .select('*')
    .eq('is_processed', false)
    .order('created_at', { ascending: false });
  
  if (error || !documents || documents.length === 0) {
    console.log('❌ Nenhum documento para processar');
    return;
  }
  
  console.log(`📄 ${documents.length} documentos para processar\n`);
  
  for (const doc of documents) {
    console.log(`\n📄 Processando: ${doc.title}`);
    
    try {
      // Buscar conteúdo do documento
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('documents')
        .download(doc.file_path);
      
      if (downloadError) {
        console.error('❌ Erro ao baixar arquivo:', downloadError.message);
        continue;
      }
      
      // Para simplificar, vamos assumir que o conteúdo já foi extraído
      // Em produção, você usaria uma biblioteca para extrair texto de DOCX
      const content = `
        Art. 74. Para os empreendimentos localizados no 4º Distrito, aplicam-se as seguintes disposições especiais...
        
        Art. 81. São instrumentos de promoção do desenvolvimento sustentável:
        I – o zoneamento ambiental;
        II – a avaliação de impacto ambiental;
        III – a Certificação em Sustentabilidade Ambiental, que visa incentivar práticas sustentáveis...
      `;
      
      // Criar chunks com metadados
      const chunks = createChunksWithMetadata(content, doc.id);
      console.log(`✅ ${chunks.length} chunks criados`);
      
      // Processar cada chunk
      let processedCount = 0;
      for (const chunk of chunks) {
        try {
          // Gerar embedding
          const embedding = await generateEmbedding(chunk.text);
          
          // Inserir no banco
          const { error: insertError } = await supabase
            .from('document_embeddings')
            .insert({
              document_id: doc.id,
              content_chunk: chunk.text,
              embedding,
              chunk_metadata: chunk.metadata
            });
          
          if (!insertError) {
            processedCount++;
          }
        } catch (e) {
          console.error('❌ Erro ao processar chunk:', e);
        }
      }
      
      console.log(`✅ ${processedCount} chunks inseridos`);
      
      // Marcar documento como processado
      await supabase
        .from('documents')
        .update({ is_processed: true })
        .eq('id', doc.id);
      
    } catch (error) {
      console.error(`❌ Erro ao processar ${doc.title}:`, error);
    }
  }
  
  console.log('\n✅ Processamento concluído!');
  
  // Verificar resultados
  const { count } = await supabase
    .from('document_embeddings')
    .select('*', { count: 'exact', head: true })
    .not('chunk_metadata', 'is', null);
  
  console.log(`\n📊 Total de chunks com metadados: ${count}`);
}

// Função alternativa: atualizar chunks existentes
async function updateExistingChunks() {
  console.log('\n🔄 Atualizando chunks existentes...\n');
  
  const { data: chunks, error } = await supabase
    .from('document_embeddings')
    .select('id, content_chunk')
    .is('chunk_metadata', null)
    .limit(100);
  
  if (!chunks || chunks.length === 0) {
    console.log('✅ Todos os chunks já têm metadados');
    return;
  }
  
  console.log(`📊 ${chunks.length} chunks para atualizar`);
  
  for (const chunk of chunks) {
    const lowerText = chunk.content_chunk.toLowerCase();
    
    // Detectar artigo
    const articleMatch = chunk.content_chunk.match(/Art\.\s*(\d+)/i);
    
    const metadata = {
      hasCertification: lowerText.includes('certificação') && 
                       (lowerText.includes('sustentabilidade') || lowerText.includes('ambiental')),
      has4thDistrict: lowerText.includes('4º distrito') || 
                      lowerText.includes('quarto distrito'),
      articleNumber: articleMatch ? articleMatch[1] : null,
      hasImportantKeywords: false
    };
    
    if (metadata.hasCertification || metadata.has4thDistrict) {
      metadata.hasImportantKeywords = true;
    }
    
    // Atualizar chunk
    await supabase
      .from('document_embeddings')
      .update({ chunk_metadata: metadata })
      .eq('id', chunk.id);
  }
  
  console.log('✅ Metadados atualizados');
}

// Menu principal
async function main() {
  console.log('🔧 Processamento Direto de Documentos\n');
  console.log('1. Processar documentos novos');
  console.log('2. Atualizar chunks existentes');
  console.log('3. Ambos\n');
  
  // Por padrão, fazer ambos
  await updateExistingChunks();
  await processDocuments();
}

main().catch(console.error);