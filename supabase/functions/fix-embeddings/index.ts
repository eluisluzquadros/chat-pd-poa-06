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
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')!;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

    // Buscar documentos
    const { data: documents, error: fetchError } = await supabase
      .from('document_sections')
      .select('id, content')
      .order('id');

    if (fetchError) throw fetchError;

    console.log(`Processando ${documents?.length || 0} documentos...`);

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

        // Salvar usando SQL direto para garantir tipo vector
        const { error: updateError } = await supabase.rpc('update_document_embedding', {
          doc_id: doc.id,
          new_embedding: embedding
        });

        if (updateError) {
          // Se RPC não existir, tentar SQL direto
          const sql = `
            UPDATE document_sections 
            SET embedding = $1::vector
            WHERE id = $2
          `;
          
          const { error: sqlError } = await supabase.rpc('exec_sql', {
            query: sql,
            params: [embedding, doc.id]
          });

          if (sqlError) {
            console.error(`Erro no doc ${doc.id}:`, sqlError);
            failed++;
          } else {
            processed++;
          }
        } else {
          processed++;
        }

        // Log progresso
        if ((processed + failed) % 10 === 0) {
          console.log(`Progresso: ${processed + failed}/${documents?.length}`);
        }

      } catch (error) {
        console.error(`Erro processando doc ${doc.id}:`, error);
        failed++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed,
        failed,
        total: documents?.length || 0
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