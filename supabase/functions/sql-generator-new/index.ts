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
    table: string;
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

    const systemPrompt = `Você é um especialista em geração de consultas SQL para o banco de dados do PDUS 2025.

NOVA ESTRUTURA DO BANCO (USAR ESTAS TABELAS):

1. TABELA: regime_urbanistico
   Colunas:
   - id (SERIAL PRIMARY KEY)
   - bairro (VARCHAR) - Nome do bairro
   - zona (VARCHAR) - Nome da zona (ex: "ZOT 8", "ZONA 1")
   - altura_max_m (DECIMAL) - Altura máxima em metros
   - ca_max (DECIMAL) - Coeficiente de Aproveitamento Máximo
   - ca_basico (DECIMAL) - Coeficiente de Aproveitamento Básico (pode ser NULL)
   - to_base (DECIMAL) - Taxa de Ocupação Base
   - to_max (DECIMAL) - Taxa de Ocupação Máxima
   - taxa_permeabilidade (DECIMAL) - Taxa de Permeabilidade
   - recuo_jardim_m (DECIMAL) - Recuo de jardim em metros
   - recuo_lateral_m (DECIMAL) - Recuo lateral em metros
   - recuo_fundos_m (DECIMAL) - Recuo de fundos em metros
   - area_total_ha (DECIMAL) - Área total em hectares
   - populacao (INTEGER) - População
   - densidade_hab_ha (DECIMAL) - Densidade habitacional por hectare
   - domicilios (INTEGER) - Número de domicílios
   - quarteirao_padrao_m (INTEGER) - Quarteirão padrão em metros
   - divisao_lote (BOOLEAN) - Se permite divisão de lote
   - remembramento (BOOLEAN) - Se permite remembramento
   - quota_ideal_m2 (INTEGER) - Quota ideal em m²
   - metadata (JSONB) - Metadados adicionais
   - created_at (TIMESTAMP)
   - updated_at (TIMESTAMP)

2. TABELA: zots_bairros
   Colunas:
   - id (SERIAL PRIMARY KEY)
   - bairro (VARCHAR) - Nome do bairro
   - zona (VARCHAR) - Nome da zona
   - caracteristicas (JSONB) - Características da zona
   - restricoes (JSONB) - Restrições aplicáveis
   - incentivos (JSONB) - Incentivos disponíveis
   - metadata (JSONB) - Metadados adicionais
   - created_at (TIMESTAMP)
   - updated_at (TIMESTAMP)

3. TABELA: bairros_risco_desastre (se necessário)
   Colunas:
   - id (SERIAL PRIMARY KEY)
   - bairro (VARCHAR)
   - tipo_risco (VARCHAR)
   - nivel_risco (VARCHAR)
   - descricao (TEXT)
   - metadata (JSONB)

REGRAS DE GERAÇÃO:

1. SEMPRE use as novas tabelas dedicadas (regime_urbanistico, zots_bairros)
2. NÃO use mais document_rows ou dataset_id
3. Acesso direto às colunas (sem JSONB)
4. Para bairros: WHERE UPPER(bairro) = UPPER('nome_do_bairro')
5. Para zonas: WHERE zona = 'ZOT XX' ou zona LIKE 'ZOT%'
6. Limite resultados quando apropriado com LIMIT

MAPEAMENTO DE TERMOS:
- "altura máxima", "gabarito" → altura_max_m
- "CA", "coeficiente", "índice de aproveitamento" → ca_max, ca_basico
- "taxa de ocupação", "TO" → to_base, to_max
- "permeabilidade" → taxa_permeabilidade
- "recuo" → recuo_jardim_m, recuo_lateral_m, recuo_fundos_m

QUERIES EXEMPLO:

1. Altura máxima de uma ZOT:
   SELECT zona, altura_max_m, bairro 
   FROM regime_urbanistico 
   WHERE zona = 'ZOT 8'

2. Parâmetros de um bairro:
   SELECT zona, altura_max_m, ca_max, to_max 
   FROM regime_urbanistico 
   WHERE UPPER(bairro) = UPPER('Centro Histórico')
   ORDER BY zona

3. ZOTs com CA maior que X:
   SELECT DISTINCT zona, ca_max, bairro
   FROM regime_urbanistico
   WHERE ca_max > 2.4
   ORDER BY ca_max DESC

4. Listar bairros:
   SELECT DISTINCT bairro 
   FROM regime_urbanistico 
   ORDER BY bairro

5. O que pode ser construído em um bairro:
   SELECT zona, altura_max_m, ca_max, to_max, taxa_permeabilidade
   FROM regime_urbanistico
   WHERE UPPER(bairro) = UPPER('nome_do_bairro')
   ORDER BY zona

CONTEXTO: ${JSON.stringify(analysisResult)}

Gere consultas SQL otimizadas usando as NOVAS TABELAS. Responda APENAS com JSON válido.`;

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

IMPORTANTE: Use APENAS as novas tabelas (regime_urbanistico, zots_bairros), NÃO use document_rows!

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
      
      // Fallback para queries básicas com nova estrutura
      sqlResult = {
        sqlQueries: [
          {
            query: `SELECT zona, altura_max_m, ca_max, to_max FROM regime_urbanistico LIMIT 20`,
            table: 'regime_urbanistico',
            purpose: 'Consulta de fallback com nova estrutura'
          }
        ],
        confidence: 0.6,
        executionPlan: 'Executar consulta básica como fallback'
      };
    }

    // Validate and execute queries
    const executionResults = [];
    for (const sqlQuery of sqlResult.sqlQueries) {
      try {
        const cleanQuery = sqlQuery.query.trim().replace(/\s+/g, ' ');
        
        // Basic SQL injection prevention
        if (!/^SELECT/i.test(cleanQuery)) {
          throw new Error('Apenas consultas SELECT são permitidas');
        }
        
        // First check if table exists and has data
        const tableCheck = await supabaseClient
          .from(sqlQuery.table || 'regime_urbanistico')
          .select('id')
          .limit(1);

        if (tableCheck.error) {
          // Table doesn't exist or is empty, fallback to old structure
          console.warn(`Table ${sqlQuery.table} not accessible, using fallback`);
          
          // Convert query to old structure format
          const fallbackQuery = convertToOldStructure(cleanQuery, analysisResult);
          
          const { data: queryResult, error } = await supabaseClient
            .rpc('execute_sql_query', { query_text: fallbackQuery });
          
          if (error) {
            executionResults.push({
              ...sqlQuery,
              error: `Tabela nova não disponível, fallback também falhou: ${error.message}`,
              data: []
            });
          } else {
            executionResults.push({
              ...sqlQuery,
              data: queryResult || [],
              note: 'Usando estrutura antiga (fallback)'
            });
          }
        } else {
          // Execute query on new table
          const { data: queryResult, error } = await supabaseClient
            .rpc('execute_sql_query', { query_text: cleanQuery });
          
          if (error) {
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

// Helper function to convert new structure query to old structure
function convertToOldStructure(query: string, analysisResult: any): string {
  // This is a fallback converter for when new tables don't exist
  // It converts queries from new table structure to old document_rows structure
  
  let convertedQuery = query;
  
  // Replace table names
  convertedQuery = convertedQuery.replace(/FROM\s+regime_urbanistico/gi, 
    "FROM document_rows WHERE dataset_id = '17_GMWnJC1sKff-YS0wesgxsvo3tnZdgSSb4JZ0ZjpCk'");
  
  convertedQuery = convertedQuery.replace(/FROM\s+zots_bairros/gi,
    "FROM document_rows WHERE dataset_id = '1FTENHpX4aLxmAoxvrEeGQn0fej-wxTMQRQs_XBjPQPY'");
  
  // Replace column names with JSONB access
  const columnMappings = {
    'bairro': "row_data->>'Bairro'",
    'zona': "row_data->>'Zona'",
    'altura_max_m': "row_data->>'Altura Máxima - Edificação Isolada'",
    'ca_max': "row_data->>'Coeficiente de Aproveitamento - Máximo'",
    'ca_basico': "row_data->>'Coeficiente de Aproveitamento - Básico'",
    'to_max': "row_data->>'Taxa de Ocupação Máxima'",
    'to_base': "row_data->>'Taxa de Ocupação Base'",
    'taxa_permeabilidade': "row_data->>'Taxa de Permeabilidade'"
  };
  
  for (const [newCol, oldCol] of Object.entries(columnMappings)) {
    const regex = new RegExp(`\\b${newCol}\\b`, 'gi');
    convertedQuery = convertedQuery.replace(regex, oldCol);
  }
  
  // Fix WHERE clauses
  convertedQuery = convertedQuery.replace(/WHERE\s+UPPER\((.*?)\)\s*=\s*UPPER/gi, 
    "AND UPPER($1) = UPPER");
  
  return convertedQuery;
}