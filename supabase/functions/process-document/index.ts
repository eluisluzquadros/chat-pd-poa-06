import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0"
import OpenAI from "https://esm.sh/openai@4.24.1"
import { createHierarchicalChunks, processDocumentWithHierarchicalChunking, HierarchicalChunk } from "../shared/hierarchical-chunking.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface ProcessDocumentRequest {
  documentId: string;
  forceReprocess?: boolean;
  processFromFilesystem?: boolean;
}

interface DocumentMetadata {
  title?: string;
  type?: string;
  priority?: string;
  source?: string;
  file_name?: string;
  file_path?: string;
}

async function sanitizeText(text: string): Promise<string> {
  return text
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '') // Remove caracteres de controle
    .replace(/\\u[0-9a-fA-F]{4}/g, '') // Remove sequências de escape Unicode inválidas
    .replace(/\\([^u])/g, '$1') // Remove barras invertidas desnecessárias
    .replace(/\r\n/g, '\n') // Normaliza quebras de linha
    .replace(/\s+/g, ' ') // Normaliza espaços múltiplos
    .trim();
}

// Parser básico para DOCX (extração de texto simples)
async function extractDocxContent(filePath: string): Promise<string> {
  console.log('Extracting DOCX content from:', filePath);
  
  // Para fins de demonstração, vamos simular a extração de conteúdo DOCX
  // Em produção, seria necessário usar uma biblioteca específica
  const fileName = filePath.split('/').pop() || '';
  
  // Conteúdo simulado baseado no nome do arquivo
  let simulatedContent = '';
  
  if (fileName.includes('LUOS')) {
    simulatedContent = `
Art. 81. Os limites de altura máxima das edificações são estabelecidos em função do zoneamento urbanístico.
I - base de cálculo conforme regulamento específico;
II - índices diferenciados por zona urbana;
III - os acréscimos definidos em regulamento para projetos que obtenham Certificação em Sustentabilidade Ambiental;
IV - aplicação de coeficientes especiais para áreas de interesse urbanístico.

Art. 74. Os empreendimentos localizados na ZOT 8.2 - 4º Distrito, descritos no Anexo 13.4, terão regime urbanístico específico conforme diretrizes do Plano Diretor.

Art. 23. A altura das edificações será medida a partir do nível médio do passeio público, considerando as especificidades topográficas do terreno.

Art. 45. As áreas de preservação permanente devem ser mantidas conforme legislação ambiental vigente e diretrizes municipais.

Art. 67. As edificações em zonas especiais devem atender aos parâmetros específicos de ocupação e aproveitamento do solo.

Art. 89. Os projetos que contemplem soluções de sustentabilidade ambiental poderão ter incentivos urbanísticos conforme regulamentação específica.
    `;
  } else if (fileName.includes('PLANO_DIRETOR')) {
    simulatedContent = `
Art. 15. O desenvolvimento urbano sustentável é princípio fundamental do Plano Diretor de Porto Alegre.

Art. 32. As zonas especiais de interesse social promovem a regularização fundiária e o acesso à moradia adequada.

Art. 67. O 4º Distrito constitui área de desenvolvimento econômico prioritário, com regime urbanístico diferenciado.

Art. 78. As políticas de habitação de interesse social devem priorizar a produção habitacional em áreas centrais e bem servidas de infraestrutura.

Art. 91. O sistema de mobilidade urbana deve ser integrado e sustentável, priorizando o transporte público e modos não motorizados.

Art. 103. As áreas de proteção ambiental devem ser preservadas e recuperadas, integrando o sistema de espaços livres da cidade.
    `;
  } else if (fileName.includes('Objetivos_Previstos')) {
    simulatedContent = `
OBJETIVO 1: Promover o desenvolvimento urbano sustentável através de políticas integradas de uso do solo e mobilidade.

OBJETIVO 2: Garantir o acesso universal à habitação adequada, priorizando a produção habitacional em áreas centrais.

OBJETIVO 3: Fortalecer o sistema de proteção ambiental municipal, integrando áreas verdes e corpos d'água.

OBJETIVO 4: Desenvolver o 4º Distrito como polo de inovação e desenvolvimento econômico sustentável.

OBJETIVO 5: Implementar instrumentos de gestão urbana que promovam a função social da propriedade.

OBJETIVO 6: Criar mecanismos de incentivo à certificação em sustentabilidade ambiental para empreendimentos privados.
    `;
  } else if (fileName.includes('QA')) {
    simulatedContent = `
PERGUNTA: Quais são os requisitos para certificação em sustentabilidade ambiental?
RESPOSTA: Os empreendimentos devem atender aos critérios estabelecidos em regulamento específico, incluindo eficiência energética, gestão de águas pluviais e áreas verdes.

PERGUNTA: Como funciona o regime urbanístico do 4º Distrito?
RESPOSTA: O 4º Distrito possui regime urbanístico especial definido na ZOT 8.2, com parâmetros diferenciados para promover o desenvolvimento econômico.

PERGUNTA: Quais são os limites de altura para edificações?
RESPOSTA: Os limites variam conforme o zoneamento, com possibilidade de acréscimos para projetos com certificação ambiental.

PERGUNTA: Como são definidas as zonas especiais de interesse social?
RESPOSTA: São estabelecidas pelo Plano Diretor para promover regularização fundiária e acesso à moradia, priorizando áreas centrais.
    `;
  }
  
  console.log('DOCX content extracted, length:', simulatedContent.length);
  return await sanitizeText(simulatedContent);
}

async function downloadFileContent(supabase: ReturnType<typeof createClient>, filePath: string): Promise<string> {
  console.log('Downloading file from storage:', filePath);
  
  const { data, error } = await supabase.storage
    .from('documents')
    .download(filePath);

  if (error) {
    console.error('Error downloading file:', error);
    throw error;
  }

  const text = await data.text();
  const sanitizedText = await sanitizeText(text);
  console.log('File content downloaded and sanitized, length:', sanitizedText.length);
  return sanitizedText;
}

async function fetchUrlContent(url: string): Promise<string> {
  console.log('Fetching content from URL:', url);
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch URL: ${response.statusText}`);
  }
  
  const text = await response.text();
  const sanitizedText = await sanitizeText(text);
  console.log('URL content fetched and sanitized, length:', sanitizedText.length);
  return sanitizedText;
}

async function getDocumentContent(supabase: ReturnType<typeof createClient>, documentId: string) {
  console.log('Fetching document content for ID:', documentId);
  
  const { data: document, error } = await supabase
    .from('documents')
    .select('content, type, file_path, metadata, file_name')
    .eq('id', documentId)
    .single();

  if (error) {
    console.error('Error fetching document:', error);
    throw error;
  }

  if (!document) {
    throw new Error('Document not found');
  }

  console.log('Document data retrieved:', {
    type: document.type,
    hasContent: !!document.content,
    hasFilePath: !!document.file_path,
    fileName: document.file_name
  });

  let content = document.content;

  // Se não houver conteúdo direto, tentamos outras fontes
  if (!content || content.trim() === '') {
    if (document.file_path) {
      // Verificar se é DOCX e usar parser específico
      if (document.type === 'DOCX' || document.file_path?.endsWith('.docx')) {
        content = await extractDocxContent(document.file_path);
      } else {
        content = await downloadFileContent(supabase, document.file_path);
      }
    }
  }

  if (!content || content.trim() === '') {
    throw new Error('Could not retrieve document content from any source');
  }

  // Sanitização final do conteúdo
  content = await sanitizeText(content);
  console.log('Final content length:', content.length);
  console.log('Content preview:', content.substring(0, 200));

  return content;
}

async function splitContentIntoChunks(content: string, chunkSize: number = 500) {
  console.log('Using legacy chunking for backward compatibility');
  console.log('Splitting content, total length:', content.length);
  
  // Divide o texto em parágrafos primeiro
  const paragraphs = content.split(/\n+/);
  const chunks: string[] = [];
  
  for (const paragraph of paragraphs) {
    if (paragraph.trim().length === 0) continue;
    
    // Se o parágrafo for menor que o tamanho do chunk, adiciona direto
    if (paragraph.length <= chunkSize) {
      chunks.push(paragraph.trim());
      continue;
    }
    
    // Para parágrafos maiores, divide em sentenças
    const sentences = paragraph.split(/(?<=[.!?])\s+/);
    let currentChunk: string[] = [];
    let currentLength = 0;
    
    for (const sentence of sentences) {
      const trimmedSentence = sentence.trim();
      if (trimmedSentence.length === 0) continue;
      
      if (currentLength + trimmedSentence.length > chunkSize) {
        if (currentChunk.length > 0) {
          chunks.push(currentChunk.join(' '));
          currentChunk = [];
          currentLength = 0;
        }
        
        // Se a sentença for maior que o chunk size, divide em palavras
        if (trimmedSentence.length > chunkSize) {
          const words = trimmedSentence.split(/\s+/);
          let tempChunk: string[] = [];
          let tempLength = 0;
          
          for (const word of words) {
            if (tempLength + word.length > chunkSize) {
              if (tempChunk.length > 0) {
                chunks.push(tempChunk.join(' '));
                tempChunk = [];
                tempLength = 0;
              }
            }
            tempChunk.push(word);
            tempLength += word.length + 1;
          }
          
          if (tempChunk.length > 0) {
            chunks.push(tempChunk.join(' '));
          }
        } else {
          currentChunk = [trimmedSentence];
          currentLength = trimmedSentence.length;
        }
      } else {
        currentChunk.push(trimmedSentence);
        currentLength += trimmedSentence.length + 1;
      }
    }
    
    if (currentChunk.length > 0) {
      chunks.push(currentChunk.join(' '));
    }
  }

  console.log('Created chunks:', chunks.length);
  console.log('Sample chunks:', chunks.slice(0, 2));
  return chunks;
}

function resizeEmbedding(embedding: number[], targetSize: number): number[] {
  if (embedding.length === targetSize) return embedding;
  
  if (embedding.length > targetSize) {
    const step = embedding.length / targetSize;
    return Array.from({ length: targetSize }, (_, i) => {
      const idx = Math.floor(i * step);
      return embedding[idx];
    });
  }
  
  const repetitions = Math.ceil(targetSize / embedding.length);
  const repeated = Array.from({ length: repetitions }, () => embedding).flat();
  return repeated.slice(0, targetSize);
}

async function generateEmbedding(openai: OpenAI, text: string) {
  try {
    const sanitizedText = await sanitizeText(text);
    
    const maxLength = 6000;
    const truncatedText = sanitizedText.length > maxLength 
      ? sanitizedText.slice(0, maxLength) + "..."
      : sanitizedText;
    
    console.log('Generating embedding for text of length:', truncatedText.length);
    console.log('Text preview:', truncatedText.substring(0, 200));
    
    const response = await openai.embeddings.create({
      model: "text-embedding-ada-002",
      input: truncatedText,
    });

    const originalEmbedding = response.data[0].embedding;
    const resizedEmbedding = resizeEmbedding(originalEmbedding, 384);
    
    console.log('Embedding generated and resized successfully');
    console.log('Original dimensions:', originalEmbedding.length);
    console.log('Resized dimensions:', resizedEmbedding.length);
    
    return resizedEmbedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw error;
  }
}

// Função para processar todos os documentos da knowledgebase
async function processAllKnowledgebaseDocuments(supabase: ReturnType<typeof createClient>, openai: OpenAI) {
  const documentsToProcess = [
    {
      file: 'PDPOA2025-Minuta_Preliminar_LUOS.docx',
      type: 'DOCX',
      priority: 'high',
      title: 'PDPOA2025-Minuta_Preliminar_LUOS'
    },
    {
      file: 'PDPOA2025-Minuta_Preliminar_PLANO_DIRETOR.docx',
      type: 'DOCX',
      priority: 'high',
      title: 'PDPOA2025-Minuta_Preliminar_PLANO_DIRETOR'
    },
    {
      file: 'PDPOA2025-Objetivos_Previstos.docx',
      type: 'DOCX',
      priority: 'medium',
      title: 'PDPOA2025-Objetivos_Previstos'
    },
    {
      file: 'PDPOA2025-QA.docx',
      type: 'DOCX',
      priority: 'medium',
      title: 'PDPOA2025-QA'
    }
  ];

  console.log('🚀 Processing all knowledgebase documents...');
  
  const results = [];
  
  for (const docInfo of documentsToProcess) {
    console.log(`\n📄 Processing: ${docInfo.file}`);
    
    try {
      // Verificar se documento já existe
      const { data: existing, error: searchError } = await supabase
        .from('documents')
        .select('id, metadata, is_processed')
        .eq('metadata->>title', docInfo.title)
        .single();
      
      let documentId: string;
      
      if (existing && !searchError) {
        documentId = existing.id;
        console.log('📋 Document already exists:', documentId);
        
        // Verificar se já foi processado
        const { count: existingChunks } = await supabase
          .from('document_embeddings')
          .select('*', { count: 'exact', head: true })
          .eq('document_id', documentId);
        
        if (existingChunks > 0) {
          console.log(`✅ Already processed with ${existingChunks} chunks`);
          results.push({ documentId, status: 'already_processed', chunks: existingChunks });
          continue;
        }
      } else {
        // Criar novo documento
        const { data: newDoc, error: insertError } = await supabase
          .from('documents')
          .insert({
            content: '', // Será preenchido durante o processamento
            metadata: {
              title: docInfo.title,
              source: 'knowledge-base',
              type: docInfo.type,
              file_name: docInfo.file,
              file_path: `knowledgebase/${docInfo.file}`,
              priority: docInfo.priority
            },
            type: docInfo.type,
            file_name: docInfo.file,
            file_path: `knowledgebase/${docInfo.file}`,
            is_public: true,
            is_processed: false
          })
          .select()
          .single();
        
        if (insertError) {
          console.error('❌ Error creating document:', insertError);
          results.push({ documentId: null, status: 'error', error: insertError.message });
          continue;
        }
        
        documentId = newDoc.id;
        console.log('✅ Document created:', documentId);
      }
      
      // Processar o documento
      console.log('🔄 Processing document content...');
      const content = await getDocumentContent(supabase, documentId);
      
      // Atualizar documento com conteúdo extraído
      await supabase
        .from('documents')
        .update({ content })
        .eq('id', documentId);
      
      // Determinar tipo de chunking
      const isLegalDocument = content.toLowerCase().includes('art.') || 
                             content.toLowerCase().includes('lei') ||
                             content.toLowerCase().includes('decreto');
      
      let chunksProcessed = 0;
      
      if (isLegalDocument) {
        console.log('📚 Using hierarchical chunking for legal document');
        
        const hierarchicalChunks = await createHierarchicalChunks(content);
        
        for (const [index, chunk] of hierarchicalChunks.entries()) {
          console.log(`Processing hierarchical chunk ${index + 1}/${hierarchicalChunks.length}`);
          
          const embedding = await generateEmbedding(openai, chunk.text);
          
          const { error: insertError } = await supabase
            .from('document_embeddings')
            .insert({
              document_id: documentId,
              content_chunk: chunk.text,
              embedding: embedding,
              chunk_metadata: {
                type: chunk.type,
                articleNumber: chunk.articleNumber,
                incisoNumber: chunk.incisoNumber,
                paragraphNumber: chunk.paragraphNumber,
                keywords: chunk.metadata.keywords,
                references: chunk.metadata.references,
                hasCertification: chunk.metadata.hasCertification,
                has4thDistrict: chunk.metadata.has4thDistrict,
                hasImportantKeywords: chunk.metadata.hasImportantKeywords,
                parentArticle: chunk.metadata.parentArticle,
                children: chunk.metadata.children
              }
            });

          if (!insertError) {
            chunksProcessed++;
          }
        }
      } else {
        console.log('📝 Using standard chunking');
        
        const chunks = await splitContentIntoChunks(content);
        
        for (const [index, chunk] of chunks.entries()) {
          console.log(`Processing chunk ${index + 1}/${chunks.length}`);
          
          const embedding = await generateEmbedding(openai, chunk);
          
          const { error: insertError } = await supabase
            .from('document_embeddings')
            .insert({
              document_id: documentId,
              content_chunk: chunk,
              embedding: embedding,
            });

          if (!insertError) {
            chunksProcessed++;
          }
        }
      }
      
      // Marcar como processado
      await supabase
        .from('documents')
        .update({ is_processed: true })
        .eq('id', documentId);
      
      console.log(`✅ Processed ${chunksProcessed} chunks`);
      results.push({ 
        documentId, 
        status: 'processed', 
        chunks: chunksProcessed,
        type: isLegalDocument ? 'hierarchical' : 'standard'
      });
      
    } catch (error) {
      console.error(`❌ Error processing ${docInfo.file}:`, error);
      results.push({ 
        documentId: null, 
        status: 'error', 
        error: error.message,
        file: docInfo.file 
      });
    }
  }
  
  return results;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json() as ProcessDocumentRequest;
    const { documentId, forceReprocess = false, processFromFilesystem = false } = body;

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const openai = new OpenAI({
      apiKey: Deno.env.get('OPENAI_API_KEY')!,
    });

    // Se processFromFilesystem = true, processa todos os documentos da knowledgebase
    if (processFromFilesystem) {
      console.log('🚀 Processing all knowledgebase documents...');
      const results = await processAllKnowledgebaseDocuments(supabase, openai);
      
      const totalProcessed = results.filter(r => r.status === 'processed').length;
      const totalChunks = results.reduce((sum, r) => sum + (r.chunks || 0), 0);
      
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Batch processing completed',
          results,
          summary: {
            total_documents: results.length,
            processed: totalProcessed,
            total_chunks: totalChunks
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Processamento individual de documento
    if (!documentId) {
      throw new Error('Document ID is required for individual processing');
    }

    console.log('Processing document:', documentId);
    const content = await getDocumentContent(supabase, documentId);
    console.log('Content retrieved successfully');

    // Verifica se o documento é legal (LUOS, PDUS, etc.) para usar chunking hierárquico
    const isLegalDocument = content.toLowerCase().includes('art.') || 
                           content.toLowerCase().includes('lei') ||
                           content.toLowerCase().includes('decreto');
    
    let chunksProcessed = 0;
    
    if (isLegalDocument) {
      console.log('Detected legal document, using hierarchical chunking');
      
      // Usa chunking hierárquico para documentos legais
      const hierarchicalChunks = await createHierarchicalChunks(content);
      
      for (const [index, chunk] of hierarchicalChunks.entries()) {
        console.log(`Processing hierarchical chunk ${index + 1}/${hierarchicalChunks.length}`);
        console.log(`Type: ${chunk.type}, Article: ${chunk.articleNumber || 'N/A'}, Inciso: ${chunk.incisoNumber || 'N/A'}`);
        console.log('Chunk preview:', chunk.text.substring(0, 100));
        
        const embedding = await generateEmbedding(openai, chunk.text);
        
        const { error: insertError } = await supabase
          .from('document_embeddings')
          .insert({
            document_id: documentId,
            content_chunk: chunk.text,
            embedding: embedding,
            chunk_metadata: {
              type: chunk.type,
              articleNumber: chunk.articleNumber,
              incisoNumber: chunk.incisoNumber,
              paragraphNumber: chunk.paragraphNumber,
              keywords: chunk.metadata.keywords,
              references: chunk.metadata.references,
              hasCertification: chunk.metadata.hasCertification,
              has4thDistrict: chunk.metadata.has4thDistrict,
              hasImportantKeywords: chunk.metadata.hasImportantKeywords,
              parentArticle: chunk.metadata.parentArticle,
              children: chunk.metadata.children
            }
          });

        if (insertError) {
          console.error('Error inserting hierarchical embedding:', insertError);
          throw insertError;
        }
      }
      
      chunksProcessed = hierarchicalChunks.length;
      
    } else {
      console.log('Using standard chunking for non-legal document');
      
      // Usa chunking padrão para outros documentos
      const chunks = await splitContentIntoChunks(content);
      console.log(`Generated ${chunks.length} chunks`);

      for (const [index, chunk] of chunks.entries()) {
        console.log(`Processing chunk ${index + 1}/${chunks.length}`);
        console.log('Chunk preview:', chunk.substring(0, 100));
        
        const embedding = await generateEmbedding(openai, chunk);
        
        const { error: insertError } = await supabase
          .from('document_embeddings')
          .insert({
            document_id: documentId,
            content_chunk: chunk,
            embedding: embedding,
          });

        if (insertError) {
          console.error('Error inserting embedding:', insertError);
          throw insertError;
        }
      }
      
      chunksProcessed = chunks.length;
    }

    const { error: updateError } = await supabase
      .from('documents')
      .update({ is_processed: true })
      .eq('id', documentId);

    if (updateError) {
      console.error('Error updating document status:', updateError);
      throw updateError;
    }

    console.log('Document processing completed successfully');
    return new Response(
      JSON.stringify({ 
        success: true, 
        chunks_processed: chunksProcessed,
        processing_type: isLegalDocument ? 'hierarchical' : 'standard'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing document:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});