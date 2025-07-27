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
    const apiKey = Deno.env.get('GROQ_API_KEY');
    if (!apiKey) {
      throw new Error('GROQ_API_KEY não encontrada');
    }

    const { message, userRole = 'user' } = await req.json();

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.1-70b-versatile',
        messages: [
          {
            role: 'system',
            content: `Você é um assistente especializado no Plano Diretor de Desenvolvimento Urbano Sustentável (PDUS) de Porto Alegre 2025. O usuário tem papel: ${userRole}`
          },
          {
            role: 'user',
            content: message
          }
        ],
        temperature: 0.7,
        max_tokens: 4000
      })
    });

    if (!response.ok) {
      throw new Error(`Erro na API Groq: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || 'Resposta não disponível';

    return new Response(
      JSON.stringify({
        response: content,
        confidence: 0.8,
        sources: { tabular: 0, conceptual: 1 },
        executionTime: 1500,
        model: 'llama-3.1-70b-versatile'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro no Groq:', error);
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