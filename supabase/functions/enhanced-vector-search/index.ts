import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { OpenAI } from "https://deno.land/x/openai@v4.24.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, searchType = 'general', expectedArticles = [], limit = 5, threshold = 0.5 } = await req.json();
    
    console.log('🔍 Enhanced Vector Search:', { query, searchType, limit, threshold });
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY');
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration');
    }
    
    if (!openAIApiKey) {
      throw new Error('Missing OpenAI API key');
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    const openai = new OpenAI({ apiKey: openAIApiKey });
    
    // Generate embedding for the query
    console.log('Generating embedding for query...');
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-ada-002",
      input: query,
    });
    
    const queryEmbedding = embeddingResponse.data[0].embedding;
    console.log(`Generated embedding with ${queryEmbedding.length} dimensions`);
    
    // Use the RPC function for vector similarity search
    const { data, error } = await supabase.rpc('match_document_sections', {
      query_embedding: queryEmbedding,
      match_threshold: threshold,
      match_count: limit
    });
    
    if (error) {
      console.error('RPC error:', error);
      throw error;
    }
    
    // Process results
    let results = data || [];
    
    if (searchType === 'legal_articles' && expectedArticles.length > 0) {
      // Prioritize results that contain expected articles
      results = results.sort((a, b) => {
        const aHasArticle = expectedArticles.some(art => 
          a.content.toLowerCase().includes(art.toLowerCase())
        );
        const bHasArticle = expectedArticles.some(art => 
          b.content.toLowerCase().includes(art.toLowerCase())
        );
        
        if (aHasArticle && !bHasArticle) return -1;
        if (!aHasArticle && bHasArticle) return 1;
        
        // Secondary sort by similarity
        return b.similarity - a.similarity;
      });
    }
    
    // Format results
    const formattedResults = results.map(result => ({
      content: result.content,
      metadata: result.metadata || {},
      similarity: result.similarity,
      source: result.metadata?.source || 'document',
      id: result.id
    }));
    
    console.log(`✅ Found ${formattedResults.length} results with vector search`);
    
    return new Response(JSON.stringify({
      results: formattedResults,
      searchType,
      query,
      totalResults: formattedResults.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Enhanced Vector Search error:', error);
    
    return new Response(JSON.stringify({
      results: [],
      error: error.message,
      searchType: 'error'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});