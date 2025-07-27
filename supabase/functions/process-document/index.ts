
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0"
import OpenAI from "https://esm.sh/openai@4.24.1"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ProcessDocumentRequest {
  documentId: string;
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
    .select('content, url_content, type, file_path, url')
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
    hasUrlContent: !!document.url_content,
    hasFilePath: !!document.file_path,
    hasUrl: !!document.url
  });

  let content = document.content;

  // Se não houver conteúdo direto, tentamos outras fontes
  if (!content || content.trim() === '') {
    if (document.url_content) {
      content = document.url_content;
    } else if (document.file_path) {
      content = await downloadFileContent(supabase, document.file_path);
    } else if (document.url) {
      content = await fetchUrlContent(document.url);
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { documentId } = await req.json() as ProcessDocumentRequest;

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const openai = new OpenAI({
      apiKey: Deno.env.get('OPENAI_API_KEY')!,
    });

    console.log('Processing document:', documentId);
    const content = await getDocumentContent(supabase, documentId);
    console.log('Content retrieved successfully');

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
      JSON.stringify({ success: true, chunks_processed: chunks.length }),
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
