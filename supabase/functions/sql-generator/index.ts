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
  userRole?: string;
}

interface SQLGenerationResponse {
  sqlQueries: Array<{
    query: string;
    dataset_id: string;
    purpose: string;
  }>;
  confidence: number;
  executionPlan: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, analysisResult, userRole }: SQLGenerationRequest = await req.json();

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get schema information for datasets
    const { data: metadata } = await supabaseClient
      .from('document_metadata')
      .select('*')
      .in('id', analysisResult.requiredDatasets || []);

    const systemPrompt = `Você é um especialista em geração de consultas SQL para o banco de dados do PDUS 2025.

ESTRUTURA DO BANCO:
- Tabela: document_rows
- Campos: id (UUID), dataset_id (TEXT), row_data (JSONB), row_number (INTEGER), created_at
- Para acessar dados: row_data->>'campo_nome' para texto, (row_data->>'campo_numerico')::numeric para números

DATASETS DISPONÍVEIS:
${metadata?.map(m => `
- Dataset: ${m.id}
- Nome: ${m.title}
- Schema: ${JSON.stringify(m.schema)}
`).join('\n') || 'Nenhum dataset encontrado'}

SCHEMAS ESPECÍFICOS:
- Dataset ZOTs vs Bairros (1FTENHpX4aLxmAoxvrEeGQn0fej-wxTMQRQs_XBjPQPY):
  Colunas: ["id","Bairro","Zona","Total_Zonas_no_Bairro","Tem_Zona_Especial"]
  
- Dataset Regime Urbanístico (17_GMWnJC1sKff-YS0wesgxsvo3tnZdgSSb4JZ0ZjpCk):
  Colunas: ["id","Bairro","Zona","Área Mínima do Lote",...] (muitas colunas de parâmetros urbanísticos)

REGRAS DE GERAÇÃO:
1. SEMPRE use document_rows como tabela base
2. SEMPRE filtre por dataset_id primeiro
3. Use row_data->>'campo' para acessar dados JSONB
4. Para números: (row_data->>'campo')::numeric
5. Para JOINs entre datasets, use subqueries ou CTEs
6. Limite resultados com LIMIT quando apropriado
7. CORRESPONDÊNCIA EXATA DE BAIRROS: Use = 'BAIRRO' (não ILIKE '%bairro%')
8. Normalize ZOTs para formato "ZOT XX"
9. CUIDADO: "BOA VISTA" ≠ "BOA VISTA DO SUL" - são bairros diferentes
10. SEMPRE incluir a coluna "Zona" para identificar ZOTs nas consultas

REGRA ESPECIAL PARA CONSULTAS DE CONSTRUÇÃO:
Se isConstructionQuery = true, SEMPRE inclua estas colunas no resultado:
- "Zona" (para identificar a ZOT)
- "Altura máxima de edificação (m)" ou campos similares de altura
- "Coeficiente de Aproveitamento Básico" (coeficiente mínimo)
- "Coeficiente de Aproveitamento Máximo" (coeficiente máximo)

VALIDAÇÃO OBRIGATÓRIA:
- Para bairros, use correspondência EXATA: row_data->>'Bairro' = 'NOME_EXATO'
- Nunca use ILIKE '%nome%' para bairros - isso causa confusão entre similares
- Sempre normalize para maiúsculas: 'BOA VISTA', 'BOA VISTA DO SUL', etc.

CONTEXTO: ${analysisResult?.entities ? JSON.stringify(analysisResult.entities) : 'Nenhuma entidade específica'}
É consulta de construção: ${analysisResult?.isConstructionQuery || false}

Gere consultas SQL otimizadas e seguras. Responda APENAS com JSON válido.`;

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

${analysisResult?.isConstructionQuery ? 
`ATENÇÃO: Esta é uma consulta sobre construção. OBRIGATORIAMENTE inclua:
- Campo "Zona" para identificar a ZOT
- Altura máxima de edificação
- Coeficiente de aproveitamento básico (mínimo)  
- Coeficiente de aproveitamento máximo

CRÍTICO: Use correspondência EXATA para bairros:
row_data->>'Bairro' = 'NOME_BAIRRO_MAIUSCULO'
NÃO use ILIKE - evita confusão entre "BOA VISTA" e "BOA VISTA DO SUL"` : ''}

Responda com JSON válido seguindo esta estrutura:
{
  "sqlQueries": [
    {
      "query": "SELECT row_data->>'campo' as campo FROM document_rows WHERE dataset_id = 'id' AND ...",
      "dataset_id": "dataset_id_aqui",
      "purpose": "descrição do propósito da consulta"
    }
  ],
  "confidence": 0.95,
  "executionPlan": "descrição de como as consultas devem ser executadas"
}`
          }
        ],
        temperature: 0.1,
        max_tokens: 1000
      }),
    });

    const data = await response.json();
    let sqlResult: SQLGenerationResponse;

    try {
      sqlResult = JSON.parse(data.choices[0].message.content);
    } catch (parseError) {
      console.error('Failed to parse SQL result:', parseError);
      // Fallback query
      sqlResult = {
        sqlQueries: [
          {
            query: `SELECT row_data FROM document_rows WHERE dataset_id IN ('${analysisResult.requiredDatasets?.join("', '") || ''}') LIMIT 10`,
            dataset_id: analysisResult.requiredDatasets?.[0] || '',
            purpose: 'Consulta genérica de fallback'
          }
        ],
        confidence: 0.5,
        executionPlan: 'Executar consulta simples como fallback'
      };
    }

    // Validate and execute queries
    const executionResults = [];
    for (const sqlQuery of sqlResult.sqlQueries) {
      try {
        // Basic SQL injection prevention
        if (!/^SELECT/i.test(sqlQuery.query.trim())) {
          throw new Error('Apenas consultas SELECT são permitidas');
        }

        const { data: queryResult, error } = await supabaseClient
          .rpc('execute_sql_query', { query_text: sqlQuery.query })
          .limit(100);

        if (error) {
          console.error('SQL execution error:', error);
          executionResults.push({
            ...sqlQuery,
            error: error.message,
            data: []
          });
        } else {
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
      executionPlan: 'Falha na geração de consultas'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});