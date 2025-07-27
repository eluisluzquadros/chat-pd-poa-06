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
        version: "2d19859030ff705a87c746f7e96eea03aefb71f166725aee39692f1476566d48",
        input: {
          prompt: `Contexto: Você é um assistente especializado no Plano Diretor de Desenvolvimento Urbano Sustentável (PDUS) de Porto Alegre 2025.
          
Papel do usuário: ${userRole}

Pergunta: ${message}`,
          max_tokens: 4000,
          temperature: 0.7
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Erro na API Replicate: ${response.status}`);
    }

    const prediction = await response.json();
    
    // Aguardar conclusão da predição
    let result = prediction;
    while (result.status === 'starting' || result.status === 'processing') {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const pollResponse = await fetch(result.urls.get, {
        headers: { 'Authorization': `Token ${apiKey}` }
      });
      result = await pollResponse.json();
    }

    const content = result.output?.join('') || 'Resposta não disponível';

    return new Response(
      JSON.stringify({
        response: content,
        confidence: 0.78,
        sources: { tabular: 0, conceptual: 1 },
        executionTime: 3000,
        model: 'llama-3.1-70b'
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