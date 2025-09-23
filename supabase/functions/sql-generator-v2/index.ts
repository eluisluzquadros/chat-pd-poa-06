import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SQLGenerationRequest {
  query: string;
  analysisResult: any;
  hints?: any;
  userRole?: string;
}

interface SQLGenerationResponse {
  sqlQueries: Array<{
    query: string;
    table: string;
    purpose: string;
  }>;
  confidence: number;
  executionPlan: string;
  executionResults?: any[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, analysisResult, hints }: SQLGenerationRequest = await req.json();

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Sistema aprimorado para regime_urbanistico
    const systemPrompt = `Você é um especialista em geração de consultas SQL para o banco de dados do PDUS 2025.

TABELA PRINCIPAL: regime_urbanistico (385 registros)
Colunas principais:
- bairro (VARCHAR) - Nome do bairro (ex: "PETRÓPOLIS", "CENTRO HISTÓRICO")
- zona (VARCHAR) - Nome da zona (ex: "ZOT 07", "ZOT 08.3 - B")
- altura_maxima (DECIMAL) - Altura máxima em metros
- coef_aproveitamento_basico (DECIMAL) - CA básico
- coef_aproveitamento_maximo (DECIMAL) - CA máximo
- area_minima_lote (INTEGER) - Área mínima do lote
- testada_minima_lote (INTEGER) - Testada mínima
- taxa_permeabilidade_acima_1500 (DECIMAL) - Taxa de permeabilidade para lotes > 1500m²
- taxa_permeabilidade_ate_1500 (DECIMAL) - Taxa de permeabilidade para lotes <= 1500m²
- recuo_jardim (DECIMAL) - Recuo de jardim em metros
- afastamento_frente (TEXT) - Afastamento frontal
- afastamento_lateral (TEXT) - Afastamento lateral
- afastamento_fundos (TEXT) - Afastamento de fundos

OBSERVAÇÕES IMPORTANTES:
1. Os bairros estão em MAIÚSCULAS na tabela (ex: "PETRÓPOLIS", não "Petrópolis")
2. As zonas têm formato "ZOT XX" ou "ZOT XX.X - Y" (ex: "ZOT 07", "ZOT 08.3 - B")
3. Um bairro pode ter múltiplas zonas (ex: Petrópolis tem ZOT 07, ZOT 08.3-B, ZOT 08.3-C)
4. Use UPPER() para normalizar nomes de bairros na busca
5. Para altura máxima, considere que pode haver múltiplas zonas no mesmo bairro

QUERIES EXEMPLO:

1. Altura máxima de um bairro (considerando todas as zonas):
   SELECT bairro, zona, altura_maxima 
   FROM regime_urbanistico 
   WHERE UPPER(bairro) = UPPER('Petrópolis')
   ORDER BY altura_maxima DESC

2. Altura máxima mais alta de toda a cidade:
   SELECT bairro, zona, altura_maxima 
   FROM regime_urbanistico 
   WHERE altura_maxima IS NOT NULL
   ORDER BY altura_maxima DESC 
   LIMIT 5

3. Parâmetros principais de um bairro:
   SELECT 
     bairro,
     zona,
     altura_maxima,
     coef_aproveitamento_basico,
     coef_aproveitamento_maximo,
     taxa_permeabilidade_acima_1500,
     recuo_jardim
   FROM regime_urbanistico 
   WHERE UPPER(bairro) = UPPER('Petrópolis')

4. Bairros com altura máxima acima de X metros:
   SELECT DISTINCT bairro, zona, altura_maxima
   FROM regime_urbanistico
   WHERE altura_maxima > 60
   ORDER BY altura_maxima DESC

5. Listar todos os bairros únicos:
   SELECT DISTINCT bairro 
   FROM regime_urbanistico 
   WHERE bairro IS NOT NULL
   ORDER BY bairro

CONTEXTO DA QUERY: ${JSON.stringify(analysisResult)}
HINTS: ${JSON.stringify(hints)}

Gere consultas SQL otimizadas usando APENAS a tabela regime_urbanistico. 
IMPORTANTE: NÃO use document_rows, use APENAS regime_urbanistico!
Responda APENAS com JSON válido.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { 
            role: 'user', 
            content: `Gere consultas SQL para: "${query}"

Análise prévia: ${JSON.stringify(analysisResult)}

LEMBRE-SE: 
- Use APENAS a tabela regime_urbanistico
- Os bairros estão em MAIÚSCULAS
- Use UPPER() para normalizar buscas
- Um bairro pode ter múltiplas zonas

Responda com JSON válido seguindo esta estrutura:
{
  "sqlQueries": [
    {
      "query": "SELECT ... FROM regime_urbanistico WHERE ...",
      "table": "regime_urbanistico",
      "purpose": "descrição do propósito"
    }
  ],
  "confidence": 0.95,
  "executionPlan": "descrição do plano"
}`
          }
        ],
        temperature: 0.1,
        max_tokens: 1000
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.choices || data.choices.length === 0) {
      throw new Error(`Invalid OpenAI response: ${JSON.stringify(data)}`);
    }
    
    let sqlResult: SQLGenerationResponse;

    try {
      let contentToParse = data.choices[0].message.content;
      
      // Extract JSON from markdown code blocks if present
      const jsonMatch = contentToParse.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
      if (jsonMatch) {
        contentToParse = jsonMatch[1];
      }
      
      sqlResult = JSON.parse(contentToParse);
    } catch (parseError) {
      console.error('Failed to parse SQL result:', parseError);
      
      // Fallback mais inteligente baseado na query
      const fallbackQueries = [];
      
      // Detectar o que o usuário quer
      const queryLower = query.toLowerCase();
      
      if (queryLower.includes('altura') && (queryLower.includes('máxima') || queryLower.includes('mais alta'))) {
        if (queryLower.includes('petrópolis')) {
          fallbackQueries.push({
            query: `SELECT bairro, zona, altura_maxima FROM regime_urbanistico WHERE UPPER(bairro) = 'PETRÓPOLIS' ORDER BY altura_maxima DESC`,
            table: 'regime_urbanistico',
            purpose: 'Buscar altura máxima em Petrópolis'
          });
        } else {
          fallbackQueries.push({
            query: `SELECT bairro, zona, altura_maxima FROM regime_urbanistico WHERE altura_maxima IS NOT NULL ORDER BY altura_maxima DESC LIMIT 10`,
            table: 'regime_urbanistico',
            purpose: 'Buscar alturas máximas mais altas da cidade'
          });
        }
      } else if (queryLower.includes('índices') || queryLower.includes('parâmetros')) {
        const bairroMatch = query.match(/(?:bairro|de|do|da)\s+([A-Za-zÀ-ÿ\s]+?)(?:\?|$)/i);
        if (bairroMatch) {
          const bairroName = bairroMatch[1].trim();
          fallbackQueries.push({
            query: `SELECT bairro, zona, altura_maxima, coef_aproveitamento_basico, coef_aproveitamento_maximo, taxa_permeabilidade_acima_1500, recuo_jardim FROM regime_urbanistico WHERE UPPER(bairro) = UPPER('${bairroName}')`,
            table: 'regime_urbanistico',
            purpose: `Buscar parâmetros urbanísticos do bairro ${bairroName}`
          });
        }
      }
      
      // Se não conseguiu identificar, query genérica
      if (fallbackQueries.length === 0) {
        fallbackQueries.push({
          query: `SELECT bairro, zona, altura_maxima, coef_aproveitamento_maximo FROM regime_urbanistico LIMIT 20`,
          table: 'regime_urbanistico',
          purpose: 'Consulta de fallback - amostra de dados'
        });
      }
      
      sqlResult = {
        sqlQueries: fallbackQueries,
        confidence: 0.7,
        executionPlan: 'Usando estratégia de fallback baseada em análise de texto'
      };
    }

    // Executar as queries
    const executionResults = [];
    for (const sqlQuery of sqlResult.sqlQueries) {
      try {
        const cleanQuery = sqlQuery.query.trim().replace(/\s+/g, ' ');
        
        // Validação básica de segurança
        if (!/^SELECT/i.test(cleanQuery)) {
          throw new Error('Apenas consultas SELECT são permitidas');
        }
        
        console.log('Executando query:', cleanQuery);
        
        // Executar query diretamente
        const { data: queryResult, error } = await supabaseClient
          .rpc('execute_sql_query', { query_text: cleanQuery });
        
        if (error) {
          console.error('Erro na execução:', error);
          executionResults.push({
            ...sqlQuery,
            error: error.message,
            data: []
          });
        } else {
          console.log(`Query retornou ${queryResult?.length || 0} resultados`);
          executionResults.push({
            ...sqlQuery,
            data: queryResult || []
          });
        }
      } catch (execError) {
        console.error('Query execution error:', execError);
        executionResults.push({
          ...sqlQuery,
          error: execError.message,
          data: []
        });
      }
    }

    return new Response(JSON.stringify({
      ...sqlResult,
      executionResults
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('SQL generation error:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      sqlQueries: [],
      confidence: 0,
      executionPlan: 'Falha na geração de consultas',
      executionResults: []
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});