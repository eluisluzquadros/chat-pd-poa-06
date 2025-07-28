import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VectorSearchRequest {
  message: string;
  userRole?: string;
  context?: any;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, userRole, context }: VectorSearchRequest = await req.json();

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Generate embedding for the query
    const { data: embeddingData, error: embeddingError } = await supabaseClient.functions.invoke('generate-text-embedding', {
      body: { text: message }
    });

    if (embeddingError) {
      throw new Error(`Embedding generation failed: ${embeddingError.message}`);
    }

    // Get relevant documents based on user role
    let documentQuery = supabaseClient
      .from('documents')
      .select('id, title, file_name');

    // Filter by user role if specified
    if (userRole === 'citizen') {
      documentQuery = documentQuery.eq('is_public', true);
    }

    const { data: documents, error: docsError } = await documentQuery;

    if (docsError) {
      console.error('Error fetching documents:', docsError);
      return new Response(JSON.stringify({ matches: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!documents?.length) {
      return new Response(JSON.stringify({ matches: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const documentIds = documents.map(doc => doc.id.toString());

    // Search for relevant content using semantic similarity
    const { data: matches, error: matchError } = await supabaseClient.rpc('match_documents', {
      query_embedding: embeddingData.embedding,
      match_count: 10,
      document_ids: documentIds
    });

    if (matchError) {
      console.error('Error in document matching:', matchError);
      return new Response(JSON.stringify({ matches: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Enhanced filtering and ranking based on PDUS context
    let enhancedMatches = matches || [];

    // Boost relevance for PDUS-specific terms
    const pdusKeywords = [
      'zot', 'zona', 'regime urbanístico', 'coeficiente', 'altura',
      'bairro', 'porto alegre', 'plano diretor', 'pdus', 'sustentável'
    ];

    enhancedMatches = enhancedMatches.map((match: any) => {
      let boostedScore = match.similarity || 0;
      
      const content = (match.content || match.content_chunk || '').toLowerCase();
      
      // Boost score for PDUS-relevant content
      pdusKeywords.forEach(keyword => {
        if (content.includes(keyword)) {
          boostedScore += 0.1;
        }
      });

      // Additional boost for entity matches from context
      if (context?.zots) {
        context.zots.forEach((zot: string) => {
          if (content.includes(zot.toLowerCase())) {
            boostedScore += 0.2;
          }
        });
      }

      if (context?.bairros) {
        context.bairros.forEach((bairro: string) => {
          if (content.includes(bairro.toLowerCase())) {
            boostedScore += 0.15;
          }
        });
      }

      return {
        ...match,
        similarity: Math.min(boostedScore, 1.0), // Cap at 1.0
        boosted: boostedScore > (match.similarity || 0)
      };
    });

    // Sort by enhanced similarity score
    enhancedMatches.sort((a, b) => (b.similarity || 0) - (a.similarity || 0));

    // Take top results
    const topMatches = enhancedMatches.slice(0, 5);

    return new Response(JSON.stringify({
      matches: topMatches,
      total: enhancedMatches.length,
      query: message,
      context: context
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Enhanced vector search error:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      matches: []
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});