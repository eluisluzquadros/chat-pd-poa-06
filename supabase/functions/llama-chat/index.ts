import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('REPLICATE_API_KEY');
    if (!apiKey) {
      throw new Error('REPLICATE_API_KEY não encontrada');
    }

    const { message, userRole = 'user' } = await req.json();

    const response = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Token ${apiKey}`
      },
      body: JSON.stringify({
        version: "meta/meta-llama-3-70b-instruct",
        input: {
          prompt: `Você é um assistente especializado no Plano Diretor de Desenvolvimento Urbano Sustentável (PDUS) de Porto Alegre 2025. O usuário tem papel: ${userRole}\n\n${message}`,
          max_tokens: 4000,
          temperature: 0.7
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Erro na API Llama: ${response.status}`);
    }

    const data = await response.json();
    
    // Para Replicate, precisamos aguardar o resultado
    let result = data;
    while (result.status === 'starting' || result.status === 'processing') {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const statusResponse = await fetch(result.urls.get, {
        headers: { 'Authorization': `Token ${apiKey}` }
      });
      result = await statusResponse.json();
    }

    const content = result.output?.join('') || 'Resposta não disponível';

    return new Response(
      JSON.stringify({
        response: content,
        confidence: 0.75,
        sources: { tabular: 0, conceptual: 1 },
        executionTime: 3000,
        model: 'llama-3-70b-instruct'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro no Llama:', error);
    return new Response(
      JSON.stringify({
        response: 'Desculpe, ocorreu um erro ao processar sua solicitação.',
        confidence: 0.1,
        sources: { tabular: 0, conceptual: 0 },
        executionTime: 0,
        error: error.message
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});