
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verificar documentos
    const { data: documents, error: docError } = await supabase
      .from('documents')
      .select('id, title, type, is_processed, created_at');
    
    if (docError) throw docError;

    // Verificar embeddings
    const { data: embeddings, error: embError } = await supabase
      .from('document_embeddings')
      .select('document_id, created_at')
      .order('created_at', { ascending: false });

    if (embError) throw embError;

    // Construir relatório
    const status = {
      total_documents: documents?.length || 0,
      processed_documents: documents?.filter(d => d.is_processed).length || 0,
      total_embeddings: embeddings?.length || 0,
      documents_with_embeddings: new Set(embeddings?.map(e => e.document_id)).size || 0,
      recent_documents: documents?.slice(0, 5).map(d => ({
        id: d.id,
        title: d.title,
        type: d.type,
        is_processed: d.is_processed,
        created_at: d.created_at
      })),
      recent_embeddings: embeddings?.slice(0, 5).map(e => ({
        document_id: e.document_id,
        created_at: e.created_at
      }))
    };

    return new Response(
      JSON.stringify(status),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('Error checking processing status:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
