import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0"
import OpenAI from "https://esm.sh/openai@4.24.1"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface DocumentContent {
  id: string;
  content: string;
}

interface EmbeddingChunk {
  document_id: string;
  content_chunk: string;
  embedding: number[];
}

class DocumentProcessor {
  private supabase;
  private openai;
  
  constructor(supabaseUrl: string, supabaseKey: string, openaiKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.openai = new OpenAI({ apiKey: openaiKey });
  }

  private async getDocument(documentId: string): Promise<DocumentContent> {
    const { data, error } = await this.supabase
      .from('documents')
      .select('content')
      .eq('id', documentId)
      .single();

    if (error || !data) {
      throw new Error('Document not found');
    }

    if (!data.content || typeof data.content !== 'string') {
      throw new Error('Invalid document content');
    }

    return { id: documentId, content: data.content };
  }

  private splitIntoChunks(text: string, maxChunkSize: number): string[] {
    // Pré-processamento do texto para remover caracteres inválidos
    const cleanText = text
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove caracteres de controle
      .replace(/\s+/g, ' ')                          // Normaliza espaços
      .trim();

    const sentences = cleanText.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const chunks: string[] = [];
    let currentChunk: string[] = [];
    let currentSize = 0;

    for (const sentence of sentences) {
      const trimmedSentence = sentence.trim();
      
      if (currentSize + trimmedSentence.length > maxChunkSize) {
        if (currentChunk.length > 0) {
          chunks.push(this.normalizeChunk(currentChunk.join('. ') + '.'));
          currentChunk = [];
          currentSize = 0;
        }
        
        // Lidar com sentenças muito longas
        if (trimmedSentence.length > maxChunkSize) {
          const subChunks = this.splitLongSentence(trimmedSentence, maxChunkSize);
          chunks.push(...subChunks);
        } else {
          currentChunk = [trimmedSentence];
          currentSize = trimmedSentence.length;
        }
      } else {
        currentChunk.push(trimmedSentence);
        currentSize += trimmedSentence.length + 2;
      }
    }

    if (currentChunk.length > 0) {
      chunks.push(this.normalizeChunk(currentChunk.join('. ') + '.'));
    }

    return chunks;
  }

  private splitLongSentence(sentence: string, maxChunkSize: number): string[] {
    const words = sentence.split(' ');
    const chunks: string[] = [];
    let currentChunk: string[] = [];
    let currentSize = 0;

    for (const word of words) {
      if (currentSize + word.length + 1 > maxChunkSize && currentChunk.length > 0) {
        chunks.push(this.normalizeChunk(currentChunk.join(' ')));
        currentChunk = [];
        currentSize = 0;
      }
      currentChunk.push(word);
      currentSize += word.length + 1;
    }

    if (currentChunk.length > 0) {
      chunks.push(this.normalizeChunk(currentChunk.join(' ')));
    }

    return chunks;
  }

  private normalizeChunk(chunk: string): string {
    return chunk
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s.,!?-]/g, ''); // Remove caracteres especiais exceto pontuação básica
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.openai.embeddings.create({
        model: "text-embedding-3-small",
        input: text
      });

      const embedding = response.data[0].embedding;
      
      // Validação do embedding
      if (!Array.isArray(embedding) || embedding.length === 0) {
        throw new Error('Invalid embedding format');
      }

      // Verifica se todos os elementos são números
      if (!embedding.every(n => typeof n === 'number' && !isNaN(n))) {
        throw new Error('Invalid embedding values');
      }

      return embedding;
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw new Error(`Embedding generation failed: ${error.message}`);
    }
  }

  private async saveEmbedding(chunk: EmbeddingChunk): Promise<void> {
    const { error } = await this.supabase
      .from('document_embeddings')
      .insert(chunk);

    if (error) {
      throw new Error(`Failed to save embedding: ${error.message}`);
    }
  }

  private async updateDocumentStatus(documentId: string): Promise<void> {
    const { error } = await this.supabase
      .from('documents')
      .update({ is_processed: true })
      .eq('id', documentId);

    if (error) {
      throw new Error(`Failed to update document status: ${error.message}`);
    }
  }

  public async processDocument(documentId: string): Promise<{ success: boolean; chunks_processed: number }> {
    try {
      const document = await this.getDocument(documentId);
      const chunks = this.splitIntoChunks(document.content, 4000);
      
      console.log(`Processing ${chunks.length} chunks for document ${documentId}`);
      
      for (const [index, chunk] of chunks.entries()) {
        console.log(`Processing chunk ${index + 1}/${chunks.length}`);
        
        const embedding = await this.generateEmbedding(chunk);
        
        await this.saveEmbedding({
          document_id: documentId,
          content_chunk: chunk,
          embedding: embedding
        });
      }

      await this.updateDocumentStatus(documentId);
      
      return {
        success: true,
        chunks_processed: chunks.length
      };
    } catch (error) {
      console.error('Document processing failed:', error);
      throw error;
    }
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { documentId } = await req.json();

    if (!documentId) {
      throw new Error('Document ID is required');
    }

    const processor = new DocumentProcessor(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      Deno.env.get('OPENAI_API_KEY')!
    );

    const result = await processor.processDocument(documentId);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
