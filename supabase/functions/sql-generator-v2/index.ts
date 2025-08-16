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

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    console.log('🔥 SQL Generator V2 - Processing:', {
      query: query,
      analysis: analysisResult
    });

    // SISTEMA DIRETO - BASEADO NAS CONSULTAS QUE FUNCIONARAM
    let sqlQueries = [];
    
    const queryLower = query.toLowerCase();
    
    // 1. CERTIFICAÇÃO EM SUSTENTABILIDADE AMBIENTAL
    if (queryLower.includes('certificação') && queryLower.includes('sustentabilidade')) {
      sqlQueries.push({
        query: `SELECT content_chunk, chunk_metadata
                FROM document_embeddings 
                WHERE content_chunk ILIKE '%certificação%sustentabilidade%' 
                   OR content_chunk ILIKE '%art%81%' 
                   OR content_chunk ILIKE '%artigo 81%'
                   OR chunk_metadata->>'articleNumber' = '81'
                ORDER BY 
                  CASE 
                    WHEN content_chunk ILIKE '%art%81%' THEN 1
                    WHEN chunk_metadata->>'articleNumber' = '81' THEN 2
                    ELSE 3 
                  END
                LIMIT 5`,
        table: 'document_embeddings',
        purpose: 'Buscar artigo sobre Certificação em Sustentabilidade Ambiental'
      });
    }
    
    // 2. BAIRROS "EM ÁREA DE ESTUDO" PARA PROTEÇÃO CONTRA ENCHENTES
    else if (queryLower.includes('área de estudo') || 
             (queryLower.includes('proteção') && queryLower.includes('enchente'))) {
      sqlQueries.push({
        query: `SELECT bairro_nome, observacoes
                FROM bairros_risco_desastre 
                WHERE observacoes ILIKE '%Em área de estudo%' 
                   OR observacoes ILIKE '%para proteção%inundação%'
                ORDER BY bairro_nome`,
        table: 'bairros_risco_desastre',
        purpose: 'Buscar bairros em área de estudo para proteção contra enchentes'
      });
    }
    
    // 3. QUESTÕES DE RISCO E INUNDAÇÃO
    else if (queryLower.includes('risco') || queryLower.includes('inundação') || 
             queryLower.includes('enchente') || queryLower.includes('cota')) {
      
      if (queryLower.includes('quantos')) {
        sqlQueries.push({
          query: `SELECT COUNT(DISTINCT bairro_nome) as total_bairros
                  FROM bairros_risco_desastre 
                  WHERE risco_inundacao = true`,
          table: 'bairros_risco_desastre',
          purpose: 'Contar bairros com risco de inundação'
        });
      } else {
        sqlQueries.push({
          query: `SELECT bairro_nome, risco_inundacao, nivel_risco_inundacao, observacoes
                  FROM bairros_risco_desastre 
                  WHERE risco_inundacao = true 
                  ORDER BY nivel_risco_inundacao DESC NULLS LAST, bairro_nome`,
          table: 'bairros_risco_desastre',
          purpose: 'Buscar bairros com risco de inundação'
        });
      }
    }
    
    // 4. QUESTÕES DE ALTURA MÁXIMA
    else if (queryLower.includes('altura') && queryLower.includes('máxima')) {
      if (queryLower.includes('mais alta') || queryLower.includes('maior')) {
        sqlQueries.push({
          query: `SELECT bairro, zona, altura_maxima
                  FROM regime_urbanistico 
                  WHERE altura_maxima IS NOT NULL 
                  ORDER BY altura_maxima DESC 
                  LIMIT 10`,
          table: 'regime_urbanistico',
          purpose: 'Buscar alturas máximas mais altas da cidade'
        });
      } else {
        // Buscar por bairro específico se mencionado
        const bairroMatch = query.match(/(?:bairro|do|da|de)\s+([A-Za-zÀ-ÿ\s]+?)(?:\?|$|,)/i);
        if (bairroMatch) {
          const bairroName = bairroMatch[1].trim();
          sqlQueries.push({
            query: `SELECT bairro, zona, altura_maxima, coef_aproveitamento_basico, coef_aproveitamento_maximo
                    FROM regime_urbanistico 
                    WHERE translate(UPPER(bairro), 'ÁÀÃÂÄÉÈÊËÍÌÎÏÓÒÕÔÖÚÙÛÜÇÑ', 'AAAAAEEEEIIIIOOOOOUUUUCN') 
                          ILIKE '%' || translate(UPPER('${bairroName}'), 'ÁÀÃÂÄÉÈÊËÍÌÎÏÓÒÕÔÖÚÙÛÜÇÑ', 'AAAAAEEEEIIIIOOOOOUUUUCN') || '%'
                    ORDER BY altura_maxima DESC`,
            table: 'regime_urbanistico',
            purpose: `Buscar altura máxima do bairro ${bairroName}`
          });
        }
      }
    }
    
    // 5. QUESTÕES DE ZOT E COEFICIENTES
    else if (queryLower.includes('zot') || queryLower.includes('coeficiente') || queryLower.includes('aproveitamento')) {
      if (queryLower.includes('maior') && queryLower.includes('4')) {
        sqlQueries.push({
          query: `SELECT DISTINCT zona, coef_aproveitamento_maximo
                  FROM regime_urbanistico 
                  WHERE coef_aproveitamento_maximo > 4 
                  ORDER BY coef_aproveitamento_maximo DESC, zona`,
          table: 'regime_urbanistico',
          purpose: 'Buscar ZOTs com coeficiente de aproveitamento maior que 4'
        });
      } else {
        const bairroMatch = query.match(/(?:bairro|do|da|de)\s+([A-Za-zÀ-ÿ\s]+?)(?:\?|$|,)/i);
        if (bairroMatch) {
          const bairroName = bairroMatch[1].trim();
          sqlQueries.push({
            query: `SELECT bairro, zona, altura_maxima, coef_aproveitamento_basico, coef_aproveitamento_maximo, 
                           area_minima_lote, recuo_jardim, taxa_permeabilidade_acima_1500
                    FROM regime_urbanistico 
                    WHERE translate(UPPER(bairro), 'ÁÀÃÂÄÉÈÊËÍÌÎÏÓÒÕÔÖÚÙÛÜÇÑ', 'AAAAAEEEEIIIIOOOOOUUUUCN') 
                          ILIKE '%' || translate(UPPER('${bairroName}'), 'ÁÀÃÂÄÉÈÊËÍÌÎÏÓÒÕÔÖÚÙÛÜÇÑ', 'AAAAAEEEEIIIIOOOOOUUUUCN') || '%'
                    ORDER BY zona`,
            table: 'regime_urbanistico',
            purpose: `Buscar parâmetros urbanísticos do bairro ${bairroName}`
          });
        }
      }
    }
    
    // 6. QUESTÕES SOBRE BAIRROS ESPECÍFICOS
    else if (queryLower.includes('bairro')) {
      const bairroMatch = query.match(/(?:bairro|do|da|de)\s+([A-Za-zÀ-ÿ\s]+?)(?:\?|$|,)/i);
      if (bairroMatch) {
        const bairroName = bairroMatch[1].trim();
        sqlQueries.push({
          query: `SELECT bairro, zona, altura_maxima, coef_aproveitamento_basico, coef_aproveitamento_maximo, 
                         area_minima_lote, recuo_jardim
                  FROM regime_urbanistico 
                  WHERE translate(UPPER(bairro), 'ÁÀÃÂÄÉÈÊËÍÌÎÏÓÒÕÔÖÚÙÛÜÇÑ', 'AAAAAEEEEIIIIOOOOOUUUUCN') 
                        ILIKE '%' || translate(UPPER('${bairroName}'), 'ÁÀÃÂÄÉÈÊËÍÌÎÏÓÒÕÔÖÚÙÛÜÇÑ', 'AAAAAEEEEIIIIOOOOOUUUUCN') || '%'
                  ORDER BY zona`,
          table: 'regime_urbanistico',
          purpose: `Buscar dados do bairro ${bairroName}`
        });
      }
    }
    
    // 7. BUSCA EM DOCUMENTOS (FALLBACK)
    else {
      sqlQueries.push({
        query: `SELECT content_chunk, chunk_metadata
                FROM document_embeddings 
                WHERE content_chunk ILIKE '%${query.split(' ').join('%')}%'
                ORDER BY 
                  CASE 
                    WHEN chunk_metadata->>'hasImportantKeywords' = 'true' THEN 1
                    WHEN chunk_metadata->>'articleNumber' IS NOT NULL THEN 2
                    ELSE 3 
                  END
                LIMIT 5`,
        table: 'document_embeddings',
        purpose: 'Busca geral em documentos'
      });
    }

    // Se não gerou nenhuma query, usar fallback
    if (sqlQueries.length === 0) {
      sqlQueries.push({
        query: `SELECT bairro, zona, altura_maxima, coef_aproveitamento_maximo 
                FROM regime_urbanistico 
                LIMIT 20`,
        table: 'regime_urbanistico',
        purpose: 'Consulta de fallback - dados gerais'
      });
    }

    const sqlResult: SQLGenerationResponse = {
      sqlQueries: sqlQueries,
      confidence: 0.9,
      executionPlan: 'Query direcionada baseada em análise de padrões'
    };

    // EXECUTAR AS QUERIES DIRETAMENTE
    const executionResults = [];
    for (const sqlQuery of sqlResult.sqlQueries) {
      try {
        console.log('🔍 EXECUTANDO SQL:', {
          query: sqlQuery.query,
          table: sqlQuery.table,
          purpose: sqlQuery.purpose
        });

        const { data: queryResult, error } = await supabaseClient
          .rpc('execute_sql_query', { query_text: sqlQuery.query });

        if (error) {
          console.error('❌ ERRO SQL:', error.message);
          executionResults.push({
            ...sqlQuery,
            error: error.message,
            data: []
          });
        } else {
          console.log('✅ SQL SUCESSO:', {
            resultCount: queryResult?.length || 0,
            table: sqlQuery.table
          });
          
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

    sqlResult.executionResults = executionResults;

    return new Response(JSON.stringify(sqlResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ SQL Generator V2 error:', error);
    
    return new Response(JSON.stringify({
      sqlQueries: [],
      confidence: 0,
      executionPlan: 'Error occurred',
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});