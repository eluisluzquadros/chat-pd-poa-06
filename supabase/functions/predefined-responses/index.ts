import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PredefinedRequest {
  responseType: string;
  query: string;
}

const OBJECTIVES_RESPONSE = `# Objetivo Central do Novo Plano Diretor de Porto Alegre

O objetivo central do novo Plano Diretor de Porto Alegre é:

Tornar Porto Alegre uma cidade mais **atraente**, **competitiva**, **resiliente** e **sustentável**, com qualidade de vida, justiça urbana e oportunidades para todos — especialmente para os mais vulneráveis.

## Cinco Objetivos Estratégicos

Esse objetivo geral se desdobra em cinco objetivos estratégicos, que norteiam toda a proposta:

1. **Qualificar os espaços públicos** e ampliar o uso do Guaíba.

2. **Reduzir os tempos de deslocamento** na cidade.

3. **Reduzir o custo da moradia** e garantir o direito à cidade.

4. **Adaptar a cidade às mudanças climáticas** e zerar emissões de gases de efeito estufa.

5. **Fortalecer o planejamento urbano** com base na economia urbana, dados e capacidade de financiamento.

---

📍 **Explore mais:**
- [Mapa com Regras Construtivas:](https://bit.ly/3ILdXRA)
- [Contribua com sugestões](https://bit.ly/4oefZKm) 
- [Audiência Pública](https://bit.ly/4o7AWqb)

💬 **Dúvidas?** planodiretor@portoalegre.rs.gov.br`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { responseType, query }: PredefinedRequest = await req.json();
    
    let response = '';
    
    switch (responseType) {
      case 'objectives':
        response = OBJECTIVES_RESPONSE;
        break;
      default:
        return new Response(JSON.stringify({ error: 'Response type not supported' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    return new Response(JSON.stringify({
      response,
      confidence: 1.0,
      sources: { predefined: true },
      query
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Predefined responses error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});