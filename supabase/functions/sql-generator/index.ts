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

QUERIES ESPECÍFICAS IMPORTANTES:
1. Para contar bairros de Porto Alegre:
   SELECT COUNT(DISTINCT row_data->>'Bairro') as total_bairros 
   FROM document_rows 
   WHERE dataset_id = '1FTENHpX4aLxmAoxvrEeGQn0fej-wxTMQRQs_XBjPQPY'
   
2. Para listar ZOTs de um bairro específico:
   SELECT DISTINCT row_data->>'Zona' as zona 
   FROM document_rows 
   WHERE dataset_id = '1FTENHpX4aLxmAoxvrEeGQn0fej-wxTMQRQs_XBjPQPY' 
   AND row_data->>'Bairro' = 'PETRÓPOLIS'
   
3. Para altura máxima de uma ZOT:
   SELECT row_data->>'Altura Máxima - Edificação Isolada' as altura_maxima
   FROM document_rows
   WHERE dataset_id = '17_GMWnJC1sKff-YS0wesgxsvo3tnZdgSSb4JZ0ZjpCk'
   AND row_data->>'Zona' = 'ZOT 07'

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

MAPEAMENTO DE TERMOS DO USUÁRIO PARA CAMPOS DA BASE (NOMES EXATOS):
- "CA", "coeficiente", "índice de aproveitamento", "potencial construtivo" → "Coeficiente de Aproveitamento - Básico", "Coeficiente de Aproveitamento - Máximo"
- "taxa de ocupação", "TO", "ocupação" → colunas relacionadas à ocupação
- "altura máxima", "gabarito", "altura" → "Altura Máxima - Edificação Isolada"
- "maior", "máximo", "superior", "teto", "limite máximo" → buscar campos com valores máximos

CAMPOS CORRETOS DO DATASET:
- Zona: "Zona"
- Altura máxima: "Altura Máxima - Edificação Isolada" 
- CA Básico: "Coeficiente de Aproveitamento - Básico"
- CA Máximo: "Coeficiente de Aproveitamento - Máximo"

REGRA ESPECIAL PARA CONSULTAS DE CONSTRUÇÃO:
Se isConstructionQuery = true, OBRIGATORIAMENTE inclua estas colunas no resultado:
- "Zona" (para identificar a ZOT) 
- "Altura Máxima - Edificação Isolada" (nome EXATO da coluna)
- "Coeficiente de Aproveitamento - Básico" (nome EXATO da coluna)
- "Coeficiente de Aproveitamento - Máximo" (nome EXATO da coluna)
PRIORIDADE: Use SEMPRE o dataset "17_GMWnJC1sKff-YS0wesgxsvo3tnZdgSSb4JZ0ZjpCk" para consultas de construção

QUERIES ESPECÍFICAS CRÍTICAS:
1. Para "índice de aproveitamento médio" de um bairro - USE DUAS QUERIES SEPARADAS:
   
   Query 1 - Calcular APENAS a média:
   SELECT AVG(((row_data->>'Coeficiente de Aproveitamento - Básico')::numeric + 
               (row_data->>'Coeficiente de Aproveitamento - Máximo')::numeric) / 2) as indice_medio
   FROM document_rows 
   WHERE dataset_id = '17_GMWnJC1sKff-YS0wesgxsvo3tnZdgSSb4JZ0ZjpCk'
   AND UPPER(row_data->>'Bairro') = 'NOME_BAIRRO'
   
   Query 2 - Listar as ZOTs com detalhes (SEM AVG):
   SELECT row_data->>'Zona' as zona,
          row_data->>'Altura Máxima - Edificação Isolada' as altura_maxima,
          row_data->>'Coeficiente de Aproveitamento - Básico' as ca_basico,
          row_data->>'Coeficiente de Aproveitamento - Máximo' as ca_maximo
   FROM document_rows 
   WHERE dataset_id = '17_GMWnJC1sKff-YS0wesgxsvo3tnZdgSSb4JZ0ZjpCk'
   AND UPPER(row_data->>'Bairro') = 'NOME_BAIRRO'
   ORDER BY row_data->>'Zona'
   
2. Para "ZOTs com coeficiente maior que X":
   SELECT DISTINCT row_data->>'Zona' as zona,
          (row_data->>'Coeficiente de Aproveitamento - Máximo')::numeric as ca_maximo
   FROM document_rows 
   WHERE dataset_id = '17_GMWnJC1sKff-YS0wesgxsvo3tnZdgSSb4JZ0ZjpCk'
   AND (row_data->>'Coeficiente de Aproveitamento - Máximo')::numeric > X
   
3. Para "zot X pertence a que bairro":
   SELECT DISTINCT row_data->>'Bairro' as bairro, row_data->>'Zona' as zona
   FROM document_rows 
   WHERE dataset_id = '1FTENHpX4aLxmAoxvrEeGQn0fej-wxTMQRQs_XBjPQPY'
   AND row_data->>'Zona' LIKE 'ZOT X%'

REGRA CRÍTICA PARA PRECISÃO DE DADOS:
1. CORRESPONDÊNCIA EXATA DE BAIRROS:
   - SEMPRE usar = 'NOME_BAIRRO_MAIUSCULO' (não ILIKE '%bairro%')
   - Exemplos: 'BOA VISTA' ≠ 'BOA VISTA DO SUL' (são bairros diferentes)
   - 'PETRÓPOLIS' ≠ 'PETROPOLIS' (verificar acentuação)

2. ZOTs COM SUBDIVISÕES:
   - CRÍTICO: Só retornar subdivisões que EXISTEM na base de dados
   - Para Petrópolis: só tem ZOT 07, ZOT 08.3-B e ZOT 08.3-C
   - NUNCA inventar ZOT 08.3-A se não existe no bairro
   - Query: WHERE row_data->>'Bairro' = 'PETRÓPOLIS' AND row_data->>'Zona' IN ('ZOT 07', 'ZOT 08.3-B', 'ZOT 08.3-C')

3. VALIDAÇÃO OBRIGATÓRIA:
   - Verificar se dados retornados são realmente do bairro solicitado
   - NUNCA misturar dados de bairros diferentes
   - Se consulta é sobre "Petrópolis", só retornar dados onde Bairro = 'PETRÓPOLIS'

CONTEXTO: ${analysisResult?.entities ? JSON.stringify(analysisResult.entities) : 'Nenhuma entidade específica'}
É consulta de construção: ${analysisResult?.isConstructionQuery || false}
Estratégia especial: ${analysisResult?.processingStrategy || 'standard'}

DICAS PARA NOMES DE BAIRROS:
- SEMPRE use UPPER() para comparação: UPPER(row_data->>'Bairro') = UPPER('nome')
- Bairros com acentos: tente ambas as versões (com e sem acento)
- "Três Figueiras" pode estar como "TRES FIGUEIRAS" ou "TRÊS FIGUEIRAS" - SEMPRE tente ambas variações
- Para bairros com acentos, SEMPRE gere queries com e sem acentos (ex: "TRÊS FIGUEIRAS" e "TRES FIGUEIRAS")
- "Cristal" deve estar como "CRISTAL"
- NUNCA diga que um bairro não existe sem verificar variações do nome

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

REGRAS CRÍTICAS:
1. Se a pergunta menciona "índice de aproveitamento médio", use DUAS queries: uma para calcular APENAS o AVG (sem outros campos) e outra para listar as ZOTs com detalhes
2. Se pergunta por "ZOTs com coeficiente maior que", filtre por ca_maximo > valor
3. Para bairros, SEMPRE tente múltiplas variações do nome (com/sem acento, maiúsculo)
4. NUNCA retorne resultado vazio sem tentar variações do nome do bairro
5. Para "Três Figueiras", SEMPRE gere queries que tentam: "TRÊS FIGUEIRAS", "TRES FIGUEIRAS", "três figueiras", "tres figueiras"
6. Para "liste todos os bairros", use: SELECT DISTINCT row_data->>'Bairro' FROM document_rows WHERE dataset_id = '17_GMWnJC1sKff-YS0wesgxsvo3tnZdgSSb4JZ0ZjpCk' ORDER BY 1
7. Para "o que pode ser construído", SEMPRE retorne TODAS as ZOTs do bairro (sem LIMIT), pois um bairro pode ter múltiplas ZOTs

${analysisResult?.isConstructionQuery ? 
`ATENÇÃO: Esta é uma consulta sobre construção. OBRIGATORIAMENTE inclua:
- Campo "Zona" para identificar a ZOT
- Campo "Altura Máxima - Edificação Isolada" (nome exato da coluna)
- Campo "Coeficiente de Aproveitamento - Básico" (nome exato da coluna)  
- Campo "Coeficiente de Aproveitamento - Máximo" (nome exato da coluna)

DATASET OBRIGATÓRIO: Use "17_GMWnJC1sKff-YS0wesgxsvo3tnZdgSSb4JZ0ZjpCk" como prioridade MÁXIMA

CRÍTICO ABSOLUTO - PRECISÃO DE DADOS:
1. CORRESPONDÊNCIA EXATA DE BAIRROS:
   row_data->>'Bairro' = 'NOME_BAIRRO_MAIUSCULO' (NUNCA use ILIKE)
   
2. VALIDAÇÃO POR BAIRRO ESPECÍFICO:
   - PETRÓPOLIS: só tem ZOT 07, ZOT 08.3-B, ZOT 08.3-C
   - BOA VISTA: verificar quais ZOTs existem na base
   - NUNCA assumir que todas as subdivisões (A, B, C) existem
   
3. QUERY SEGURA PARA SUBDIVISÕES:
   WHERE row_data->>'Bairro' = 'PETRÓPOLIS' 
   AND row_data->>'Zona' IN ('ZOT 07', 'ZOT 08.3-B', 'ZOT 08.3-C')
   (usar lista específica das ZOTs que EXISTEM)

4. VERIFICAÇÃO FINAL:
   - Se retornou dados, conferir se todos são do bairro correto
   - NUNCA retornar ZOT que não existe no bairro

RECONHECIMENTO DE VARIAÇÕES LINGUÍSTICAS:
Se o usuário perguntar por qualquer variação de:
- "CA", "coeficiente", "índice de aproveitamento", "potencial construtivo" → busque "Coeficiente de Aproveitamento - Básico/Máximo"
- "taxa de ocupação", "TO" → busque campos de ocupação  
- "altura máxima", "gabarito" → busque "Altura Máxima - Edificação Isolada"
- "maior", "máximo", "superior", "teto" → identifique que quer valores máximos

VALIDAÇÃO FINAL: Sempre verifique se retornou dados válidos dos 4 campos obrigatórios para construção` : ''}

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
        console.log('DEBUG - SQL Generator extracted JSON from markdown');
      }
      
      sqlResult = JSON.parse(contentToParse);
      console.log('DEBUG - Successfully parsed SQL JSON, queries count:', sqlResult.sqlQueries?.length);
    } catch (parseError) {
      console.error('Failed to parse SQL result:', parseError, 'Raw content:', data.choices[0].message.content);
      
      // Enhanced fallback with better queries for construction
      const isConstruction = analysisResult.isConstructionQuery;
      const constructionFields = `
        row_data->>'Zona' as zona,
        row_data->>'Altura Máxima - Edificação Isolada' as altura_maxima,
        row_data->>'Coeficiente de Aproveitamento - Básico' as ca_basico,
        row_data->>'Coeficiente de Aproveitamento - Máximo' as ca_maximo
      `;
      
      sqlResult = {
        sqlQueries: [
          {
            query: isConstruction 
              ? `SELECT ${constructionFields} FROM document_rows WHERE dataset_id = '17_GMWnJC1sKff-YS0wesgxsvo3tnZdgSSb4JZ0ZjpCk' LIMIT 20`
              : `SELECT row_data FROM document_rows WHERE dataset_id IN ('${analysisResult.requiredDatasets?.join("', '") || ''}') LIMIT 10`,
            dataset_id: analysisResult.requiredDatasets?.[0] || '17_GMWnJC1sKff-YS0wesgxsvo3tnZdgSSb4JZ0ZjpCk',
            purpose: isConstruction ? 'Consulta de parâmetros construtivos (fallback)' : 'Consulta genérica de fallback'
          }
        ],
        confidence: 0.6,
        executionPlan: isConstruction ? 'Buscar dados construtivos essenciais' : 'Executar consulta simples como fallback'
      };
      console.log('DEBUG - Used enhanced SQL fallback for construction:', isConstruction);
    }

    // Validate and execute queries
    const executionResults = [];
    for (const sqlQuery of sqlResult.sqlQueries) {
      try {
        console.log('SQL Query before cleaning:', sqlQuery.query);
        
        // Remove leading/trailing whitespace and newlines to fix RPC function
        const cleanQuery = sqlQuery.query.trim().replace(/\s+/g, ' ');
        console.log('SQL Query after cleaning:', cleanQuery);
        
        // Basic SQL injection prevention
        if (!/^SELECT/i.test(cleanQuery)) {
          throw new Error('Apenas consultas SELECT são permitidas');
        }
        
        const { data: queryResult, error } = await supabaseClient
          .rpc('execute_sql_query', { query_text: cleanQuery });
        
        console.log('RPC Result:', { data: queryResult, error });

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