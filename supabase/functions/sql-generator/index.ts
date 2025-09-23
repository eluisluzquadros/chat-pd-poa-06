import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { 
  createZoneSearchPatterns, 
  createBairroSearchPatterns,
  normalizeZoneName,
  normalizeBairroName
} from '../_shared/normalization.ts';

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

    // Normalizar entidades antes de gerar SQL
    if (analysisResult?.entities) {
      if (analysisResult.entities.zots) {
        analysisResult.entities.zots = analysisResult.entities.zots.map((zot: any) => 
          typeof zot === 'string' ? normalizeZoneName(zot) : zot
        );
      }
      if (analysisResult.entities.bairros) {
        analysisResult.entities.bairros = analysisResult.entities.bairros.map((bairro: string) => 
          normalizeBairroName(bairro)
        );
      }
    }

    const systemPrompt = `Você é um especialista em geração de consultas SQL para o banco de dados do PDUS 2025.

TABELAS DISPONÍVEIS (USAR APENAS ESTAS):

1. TABELA PRINCIPAL: regime_urbanistico (385 registros)
   Colunas principais:
   - bairro (VARCHAR) - Nome em MAIÚSCULAS (ex: "PETRÓPOLIS", "CENTRO HISTÓRICO")
   - zona (VARCHAR) - Formato "ZOT XX" (ex: "ZOT 07", "ZOT 08.3 - B")
   - altura_maxima (DECIMAL) - Altura máxima em metros
   - coef_aproveitamento_basico (DECIMAL) - CA básico
   - coef_aproveitamento_maximo (DECIMAL) - CA máximo
   - area_minima_lote (INTEGER) - Área mínima do lote
   - testada_minima_lote (INTEGER) - Testada mínima
   - taxa_permeabilidade_acima_1500 (DECIMAL) - Taxa para lotes > 1500m²
   - taxa_permeabilidade_ate_1500 (DECIMAL) - Taxa para lotes <= 1500m²
   - recuo_jardim (DECIMAL) - Recuo de jardim em metros
   - afastamento_frente (TEXT) - Afastamento frontal
   - afastamento_lateral (TEXT) - Afastamento lateral
   - afastamento_fundos (TEXT) - Afastamento de fundos
   - comercio_varejista_inocuo (VARCHAR) - Limites para comércio
   - industria_inocua (DECIMAL) - Limites para indústria
   - nivel_controle_entretenimento (VARCHAR) - Nível de controle

2. TABELA: zots_bairros (mapeamento zona-bairro)
   Colunas:
   - bairro (VARCHAR) - Nome do bairro
   - zona (VARCHAR) - Nome da zona
   - caracteristicas (JSONB) - Características específicas
   - restricoes (JSONB) - Restrições aplicáveis
   - incentivos (JSONB) - Incentivos disponíveis

3. TABELA: bairros_risco_desastre (riscos climáticos)
   Colunas:
   - bairro (VARCHAR) - Nome do bairro
   - tipo_risco (VARCHAR) - Tipo do risco (inundação, deslizamento, etc)
   - nivel_risco (VARCHAR) - Nível (alto, médio, baixo)
   - descricao (TEXT) - Descrição detalhada
   - metadata (JSONB) - Dados adicionais

REGRAS DE GERAÇÃO:

1. SEMPRE use a tabela regime_urbanistico (385 registros disponíveis)
2. document_rows FOI DELETADA - NÃO EXISTE MAIS
3. Os bairros estão em MAIÚSCULAS COM ACENTOS (ex: "PETRÓPOLIS", "CENTRO HISTÓRICO", "TRÊS FIGUEIRAS")
4. Para bairros com acentos, use uma das opções:
   - WHERE bairro ILIKE '%nome_parcial%' (mais seguro)
   - WHERE bairro IN ('NOME COM ACENTO', 'NOME SEM ACENTO')
   - WHERE bairro = 'NOME EXATO COM ACENTO'
5. Para zonas: WHERE zona = 'ZOT XX' ou zona LIKE 'ZOT%'
6. Um bairro pode ter múltiplas zonas (Petrópolis tem 3 zonas)
7. Limite resultados quando apropriado com LIMIT

MAPEAMENTO DE TERMOS:
- "altura máxima", "gabarito", "altura mais alta" → altura_maxima
- "CA", "coeficiente", "índice de aproveitamento" → coef_aproveitamento_basico, coef_aproveitamento_maximo
- "permeabilidade" → taxa_permeabilidade_acima_1500, taxa_permeabilidade_ate_1500
- "recuo" → recuo_jardim
- "afastamento" → afastamento_frente, afastamento_lateral, afastamento_fundos
- "risco", "desastre", "inundação", "alagamento" → buscar em bairros_risco_desastre
- "características", "restrições", "incentivos" → buscar em zots_bairros

IMPORTANTE - NORMALIZAÇÃO E ACENTUAÇÃO:
1. Os nomes de zonas já foram normalizados para o formato "ZOT XX" (ex: "ZOT 07", "ZOT 15")
2. ATENÇÃO: Os bairros no banco mantêm ACENTOS (ex: "TRÊS FIGUEIRAS", "PETRÓPOLIS", "CENTRO HISTÓRICO")
3. Use comparação exata para zonas: WHERE zona = 'ZOT 07'
4. Para bairros, SEMPRE considere acentuação:
   - Para "Três Figueiras" use: WHERE bairro = 'TRÊS FIGUEIRAS' (com acento)
   - Para "Centro Histórico" use: WHERE bairro = 'CENTRO HISTÓRICO'
   - Se não tiver certeza, use ILIKE: WHERE bairro ILIKE '%FIGUEIRAS%'
5. MAPEAMENTO DE BAIRROS IMPORTANTES:
   - "tres figueiras" → 'TRÊS FIGUEIRAS' (com Ê)
   - "petropolis" → 'PETRÓPOLIS' (com Ó)
   - "centro historico" → 'CENTRO HISTÓRICO' (com Ó)

QUERIES EXEMPLO:

1. Altura máxima de um bairro (todas as zonas):
   SELECT bairro, zona, altura_maxima, coef_aproveitamento_basico, coef_aproveitamento_maximo
   FROM regime_urbanistico 
   WHERE bairro = 'PETRÓPOLIS'
   ORDER BY altura_maxima DESC

2. Bairro com acento (Três Figueiras):
   SELECT bairro, zona, altura_maxima, coef_aproveitamento_basico, coef_aproveitamento_maximo
   FROM regime_urbanistico 
   WHERE bairro = 'TRÊS FIGUEIRAS'
   ORDER BY zona

3. 🔴 CRÍTICO - Altura máxima mais alta da cidade:
   -- SEMPRE use esta query exata para "altura máxima mais alta":
   SELECT bairro, zona, altura_maxima 
   FROM regime_urbanistico 
   WHERE altura_maxima IS NOT NULL
   ORDER BY altura_maxima DESC 
   LIMIT 1
   -- Retorna: AZENHA, ZOT 08.3 - A, 130m

4. Parâmetros principais usando ILIKE (mais seguro):
   SELECT bairro, zona, altura_maxima, 
          coef_aproveitamento_basico, coef_aproveitamento_maximo,
          taxa_permeabilidade_acima_1500, recuo_jardim
   FROM regime_urbanistico 
   WHERE bairro ILIKE '%CENTRO HISTÓRICO%'

5. Riscos de um bairro:
   SELECT bairro, tipo_risco, nivel_risco, descricao
   FROM bairros_risco_desastre
   WHERE bairro ILIKE '%PETRÓPOLIS%'

5. Características de zona:
   SELECT bairro, zona, caracteristicas, restricoes, incentivos
   FROM zots_bairros
   WHERE zona = 'ZOT 07'

6. Busca combinada (regime + riscos):
   SELECT r.bairro, r.zona, r.altura_maxima, 
          b.tipo_risco, b.nivel_risco
   FROM regime_urbanistico r
   LEFT JOIN bairros_risco_desastre b ON UPPER(r.bairro) = UPPER(b.bairro)
   WHERE UPPER(r.bairro) = 'PETRÓPOLIS'

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

IMPORTANTE: Use APENAS a tabela regime_urbanistico (385 registros). A tabela document_rows FOI DELETADA!

🔴 REGRA ESPECIAL: Se a pergunta for sobre "altura máxima mais alta" ou "maior altura":
- Gere EXATAMENTE: SELECT bairro, zona, altura_maxima FROM regime_urbanistico WHERE altura_maxima IS NOT NULL ORDER BY altura_maxima DESC LIMIT 1
- Esta query retorna o valor correto: 130m (AZENHA, ZOT 08.3 - A)

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
      
      // Fallback inteligente baseado na query
      const queryLower = query.toLowerCase();
      const fallbackQuery = queryLower.includes('petrópolis') || queryLower.includes('petropolis')
        ? `SELECT bairro, zona, altura_maxima, coef_aproveitamento_basico, coef_aproveitamento_maximo FROM regime_urbanistico WHERE UPPER(bairro) = 'PETRÓPOLIS'`
        : queryLower.includes('altura') && queryLower.includes('máxima')
        ? `SELECT bairro, zona, altura_maxima FROM regime_urbanistico WHERE altura_maxima IS NOT NULL ORDER BY altura_maxima DESC LIMIT 10`
        : `SELECT bairro, zona, altura_maxima, coef_aproveitamento_maximo FROM regime_urbanistico LIMIT 20`;
      
      sqlResult = {
        sqlQueries: [
          {
            query: fallbackQuery,
            table: 'regime_urbanistico',
            purpose: 'Consulta de fallback otimizada'
          }
        ],
        confidence: 0.7,
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
        
        // Executar query diretamente na tabela regime_urbanistico
        console.log('Executando query na regime_urbanistico:', cleanQuery);
        
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
      executionPlan: 'Falha na geração de consultas'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Função removida - document_rows foi deletada
// Usar apenas regime_urbanistico