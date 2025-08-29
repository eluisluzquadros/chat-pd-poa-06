import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { OpenAI } from 'https://deno.land/x/openai@v4.24.0/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { batch_size = 10, offset = 0 } = await req.json();
    
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')!;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

    // Buscar apenas um lote de documentos
    const { data: documents, error: fetchError } = await supabase
      .from('document_sections')
      .select('id, content')
      .range(offset, offset + batch_size - 1)
      .order('id');

    if (fetchError) throw fetchError;

    console.log(`Processando lote: ${offset} a ${offset + batch_size - 1}`);
    console.log(`Documentos no lote: ${documents?.length || 0}`);

    let processed = 0;
    let failed = 0;

    for (const doc of documents || []) {
      try {
        // Gerar embedding
        const response = await openai.embeddings.create({
          model: 'text-embedding-ada-002',
          input: doc.content.substring(0, 8000),
        });

        const embedding = response.data[0].embedding;

        // Usar RPC para salvar corretamente
        const { error: updateError } = await supabase.rpc('update_document_embedding', {
          doc_id: doc.id,
          new_embedding: embedding
        });

        if (updateError) {
          console.error(`Erro no doc ${doc.id}:`, updateError);
          failed++;
        } else {
          processed++;
          console.log(`✅ Doc ${doc.id} processado`);
        }

      } catch (error) {
        console.error(`Erro processando doc ${doc.id}:`, error);
        failed++;
      }
    }

    // Contar total de documentos
    const { count: totalDocs } = await supabase
      .from('document_sections')
      .select('*', { count: 'exact', head: true });

    const hasMore = (offset + batch_size) < (totalDocs || 0);

    return new Response(
      JSON.stringify({
        success: true,
        processed,
        failed,
        batch_size,
        offset,
        total_docs: totalDocs,
        has_more: hasMore,
        next_offset: hasMore ? offset + batch_size : null
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Erro:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});