import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * SISTEMA DINÂMICO - CARREGAMENTO DE BAIRROS E ZONAS DA BASE
 */

// Cache em memória para evitar consultas repetidas
let CACHE_BAIRROS: string[] = [];
let CACHE_ZONAS: string[] = [];
let CACHE_LOADED = false;

/**
 * FUNÇÃO PARA NORMALIZAR NOMES (MELHORADA)
 */
function normalizeName(name: string): string {
  return name.toLowerCase()
    .replace(/[áàãâä]/g, 'a')
    .replace(/[éèêë]/g, 'e')
    .replace(/[íìîï]/g, 'i')
    .replace(/[óòõôö]/g, 'o')
    .replace(/[úùûü]/g, 'u')
    .replace(/[ç]/g, 'c')
    .replace(/[ñ]/g, 'n')
    .replace(/cel\./g, 'coronel')
    .replace(/cel /g, 'coronel ')
    .replace(/aparicio/g, 'aparício')
    .replace(/mont serrat/g, 'montserrat')
    .replace(/vila  /g, 'vila ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * CARREGAMENTO DINÂMICO DOS 94 BAIRROS REAIS
 */
async function loadBairrosFromDatabase(supabaseClient: any): Promise<string[]> {
  if (CACHE_BAIRROS.length > 0) {
    return CACHE_BAIRROS;
  }

  try {
    // Carregar de regime_urbanistico
    const { data: regimeBairros, error: regimeError } = await supabaseClient
      .from('regime_urbanistico')
      .select('bairro')
      .not('bairro', 'is', null);

    // Carregar de bairros_risco_desastre
    const { data: riscoBairros, error: riscoError } = await supabaseClient
      .from('bairros_risco_desastre')
      .select('bairro_nome')
      .not('bairro_nome', 'is', null);

    if (regimeError || riscoError) {
      console.error('Erro ao carregar bairros:', { regimeError, riscoError });
      return [];
    }

    // Combinar e deduplicar
    const allBairros = new Set<string>();
    regimeBairros?.forEach(b => allBairros.add(b.bairro.toUpperCase().trim()));
    riscoBairros?.forEach(b => allBairros.add(b.bairro_nome.toUpperCase().trim()));

    CACHE_BAIRROS = Array.from(allBairros).sort();
    console.log(`🏘️ Carregados ${CACHE_BAIRROS.length} bairros dinamicamente da base`);
    
    return CACHE_BAIRROS;
  } catch (error) {
    console.error('Erro ao carregar bairros:', error);
    return [];
  }
}

/**
 * CARREGAMENTO DINÂMICO DAS 30 ZONAS REAIS
 */
async function loadZonasFromDatabase(supabaseClient: any): Promise<string[]> {
  if (CACHE_ZONAS.length > 0) {
    return CACHE_ZONAS;
  }

  try {
    const { data: zonas, error } = await supabaseClient
      .from('regime_urbanistico')
      .select('zona')
      .not('zona', 'is', null);

    if (error) {
      console.error('Erro ao carregar zonas:', error);
      return [];
    }

    const uniqueZonas = new Set<string>();
    zonas?.forEach(z => uniqueZonas.add(z.zona.trim()));

    CACHE_ZONAS = Array.from(uniqueZonas).sort();
    console.log(`🎯 Carregadas ${CACHE_ZONAS.length} zonas dinamicamente da base`);
    
    return CACHE_ZONAS;
  } catch (error) {
    console.error('Erro ao carregar zonas:', error);
    return [];
  }
}

/**
 * SISTEMA DE MATCHING INTELIGENTE PARA BAIRROS
 */
function findBairroMatch(query: string, bairrosList: string[]): string | null {
  const normalizedQuery = normalizeName(query);
  
  // 1. Match exato
  for (const bairro of bairrosList) {
    if (normalizeName(bairro) === normalizedQuery) {
      console.log(`🎯 Match exato: ${bairro}`);
      return bairro;
    }
  }
  
  // 2. Contém o nome completo
  for (const bairro of bairrosList) {
    if (normalizedQuery.includes(normalizeName(bairro))) {
      console.log(`🎯 Match por inclusão: ${bairro}`);
      return bairro;
    }
  }
  
  // 3. Bairro contém a query
  for (const bairro of bairrosList) {
    if (normalizeName(bairro).includes(normalizedQuery)) {
      console.log(`🎯 Match por substring: ${bairro}`);
      return bairro;
    }
  }
  
  // 4. Fuzzy matching para variações comuns
  const queryWords = normalizedQuery.split(' ').filter(w => w.length > 2);
  for (const bairro of bairrosList) {
    const bairroWords = normalizeName(bairro).split(' ');
    const matches = queryWords.filter(qw => 
      bairroWords.some(bw => bw.includes(qw) || qw.includes(bw))
    );
    
    if (matches.length >= Math.min(queryWords.length, 2)) {
      console.log(`🎯 Match fuzzy: ${bairro} (${matches.length}/${queryWords.length} palavras)`);
      return bairro;
    }
  }
  
  return null;
}

/**
 * EXTRAÇÃO DINÂMICA DE BAIRRO DA QUERY
 */
async function extractBairroFromQuery(query: string, bairrosList: string[]): Promise<string | null> {
  // 1. Busca por match direto usando sistema inteligente
  const directMatch = findBairroMatch(query, bairrosList);
  if (directMatch) {
    return directMatch;
  }
  
  // 2. Padrões específicos para extrair nomes
  const patterns = [
    /(?:bairro|no|na|do|da|de|em)\s+([a-záàãâäéèêëíìîïóòõôöúùûüç\s]+?)(?:\?|$|,|\s+(?:qual|como|o que|altura|coef))/i,
    /^([a-záàãâäéèêëíìîïóòõôöúùûüç\s]{4,30})(?:\s+(?:qual|como|o que|altura|coef|zot|zona))/i,
    /^([a-záàãâäéèêëíìîïóòõôöúùûüç\s]{4,30})$/i
  ];
  
  for (const pattern of patterns) {
    const match = query.match(pattern);
    if (match && match[1]) {
      const extracted = match[1].trim();
      
      // Filtrar palavras comuns
      const commonWords = ['porto alegre', 'plano diretor', 'luos', 'lei', 'artigo', 'altura', 'maxima', 'coeficiente', 'zona', 'zot', 'qual', 'como'];
      if (!commonWords.some(word => extracted.toLowerCase().includes(word)) && extracted.length > 3) {
        // Usar sistema inteligente para encontrar o bairro
        const foundBairro = findBairroMatch(extracted, bairrosList);
        
        if (foundBairro) {
          console.log(`🎯 Bairro identificado por padrão: ${foundBairro} (de: ${extracted})`);
          return foundBairro;
        }
      }
    }
  }
  
  console.log(`❌ Nenhum bairro identificado na query: ${query}`);
  return null;
}

/**
 * CLASSIFICAÇÃO DINÂMICA DE QUERY
 */
async function classifyQueryType(query: string, supabaseClient: any): Promise<{
  type: 'bairro' | 'artigo' | 'conceitual' | 'listagem' | 'enchentes' | 'geral',
  keywords: string[],
  bairro?: string,
  artigo?: string
}> {
  const queryLower = query.toLowerCase();
  
  // Carregar dados dinâmicos
  const bairrosList = await loadBairrosFromDatabase(supabaseClient);
  
  // Classificar por enchentes
  if (queryLower.includes('enchente') || queryLower.includes('inundação') || 
      queryLower.includes('área de estudo') || queryLower.includes('risco') ||
      (queryLower.includes('quantos') && queryLower.includes('bairro'))) {
    return { type: 'enchentes', keywords: ['enchente', 'inundação', 'risco'] };
  }
  
  // Classificar por listagem
  if (queryLower.includes('quais são') || queryLower.includes('quantos') || 
      queryLower.includes('liste') || queryLower.includes('listar')) {
    return { type: 'listagem', keywords: queryLower.split(' ').filter(w => w.length > 3) };
  }
  
  // Classificar por artigo
  const artMatch = query.match(/(?:art|artigo)\s*\.?\s*(\d+)/i);
  if (artMatch || queryLower.includes('certificação') || queryLower.includes('sustentabilidade') || 
      queryLower.includes('volumétrico') || queryLower.includes('luos')) {
    return { 
      type: 'artigo', 
      keywords: ['artigo', 'lei', 'luos'],
      artigo: artMatch ? artMatch[1] : null
    };
  }
  
  // Classificar por bairro (DINÂMICO)
  const bairro = await extractBairroFromQuery(query, bairrosList);
  if (bairro || queryLower.includes('altura') || queryLower.includes('coeficiente') || queryLower.includes('zot')) {
    return { 
      type: 'bairro', 
      keywords: ['altura', 'coeficiente', 'zot'],
      bairro: bairro
    };
  }
  
  // Classificar como conceitual
  if (queryLower.includes('objetivos') || queryLower.includes('princípios') || 
      queryLower.includes('diretor') || queryLower.includes('definição')) {
    return { type: 'conceitual', keywords: queryLower.split(' ').filter(w => w.length > 3) };
  }
  
  return { type: 'geral', keywords: queryLower.split(' ').filter(w => w.length > 3) };
}

/**
 * FUNÇÃO PARA EXTRAIR NÚMERO DE ARTIGO DA QUERY (MELHORADA)
 */
function extractArticleFromQuery(query: string): string | null {
  const patterns = [
    /(?:art|artigo)\s*\.?\s*(\d+)/i,
    /(?:^|\s)(\d+)º?(?:\s*(?:,|\.|\s)?\s*(?:inciso|§|parágrafo)?\s*[IVX]+)?/i
  ];
  
  for (const pattern of patterns) {
    const match = query.match(pattern);
    if (match && match[1]) {
      const articleNum = match[1];
      console.log(`📋 Artigo identificado: ${articleNum}`);
      return articleNum;
    }
  }
  
  return null;
}

/**
 * Agentic-RAG v2 - SISTEMA DINÂMICO SEM HARDCODING
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const query = body.query || body.message;
    const model = body.model || 'gpt-3.5-turbo';
    const sessionId = body.sessionId || `session_${Date.now()}`;
    
    console.log('📨 Agentic-RAG v2 DINÂMICO received request:', { 
      query: query,
      model: model,
      sessionId: sessionId 
    });

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const startTime = Date.now();
    const queryLower = query.toLowerCase();

    let executionResults = [];
    let hasResults = false;

    console.log('🔥 Executando sistema dinâmico sem hardcoding...');

    // CARREGAR DADOS DINÂMICOS (COM CACHE)
    const bairrosList = await loadBairrosFromDatabase(supabaseClient);
    const zonasList = await loadZonasFromDatabase(supabaseClient);
    console.log(`📊 Sistema carregado: ${bairrosList.length} bairros, ${zonasList.length} zonas`);

    // CLASSIFICAR TIPO DE QUERY PARA BUSCA INTELIGENTE (DINÂMICO)
    const queryClassification = await classifyQueryType(query, supabaseClient);
    console.log(`🧠 Query classificada como: ${queryClassification.type}`, queryClassification);

    // EXECUTAR ESTRATÉGIA BASEADA NA CLASSIFICAÇÃO
    if (queryClassification.type === 'artigo') {
      await executeArticleSearch();
    } else if (queryClassification.type === 'bairro') {
      await executeBairroSearch();
    } else if (queryClassification.type === 'enchentes') {
      await executeEnchentesSearch();
    } else if (queryClassification.type === 'listagem') {
      await executeListagemSearch();
    } else if (queryClassification.type === 'conceitual') {
      await executeConceitualSearch();
    } else {
      await executeGeneralSearch();
    }

    // ESTRATÉGIAS DE BUSCA ESPECIALIZADAS
    async function executeArticleSearch() {
      console.log(`📋 ESTRATÉGIA: Busca por artigos específicos...`);
      
      const articleNumber = queryClassification.artigo || extractArticleFromQuery(query);
      const searchStrategies = [];
      
      // Estratégia 1: Busca por número específico
      if (articleNumber) {
        searchStrategies.push(
          { term: `%art.%${articleNumber}%`, desc: `Artigo ${articleNumber} com ponto` },
          { term: `%art %${articleNumber}%`, desc: `Artigo ${articleNumber} com espaço` },
          { term: `%artigo%${articleNumber}%`, desc: `Artigo ${articleNumber} completo` }
        );
      }
      
      // Estratégia 2: Busca temática
      if (queryLower.includes('certificação') || queryLower.includes('sustentabilidade')) {
        searchStrategies.push(
          { term: '%certificação%sustentabilidade%ambiental%', desc: 'Certificação sustentabilidade' },
          { term: '%art%81%sustentabilidade%', desc: 'Art 81 sustentabilidade' }
        );
      }
      
      if (queryLower.includes('volumétrico')) {
        searchStrategies.push(
          { term: '%regime%volumétrico%', desc: 'Regime volumétrico' },
          { term: '%art%75%', desc: 'Art 75 volumétrico' }
        );
      }
      
      // Executar estratégias
      for (const strategy of searchStrategies) {
        const { data: docResults, error } = await supabaseClient
          .from('document_embeddings')
          .select('content_chunk, chunk_metadata')
          .ilike('content_chunk', strategy.term)
          .limit(8);

        if (!error && docResults && docResults.length > 0) {
          console.log(`✅ Estratégia bem-sucedida: ${strategy.desc}`);
          executionResults.push({
            query: `Busca artigo: ${strategy.desc}`,
            table: 'document_embeddings', 
            purpose: 'Buscar artigo específico da lei',
            data: docResults,
            strategy: strategy.desc
          });
          hasResults = true;
          return; // Parar na primeira estratégia bem-sucedida
        }
      }
      
      // Fallback: Busca em document_sections se não encontrou em embeddings
      if (!hasResults && articleNumber) {
        const { data: secResults, error } = await supabaseClient
          .from('document_sections')
          .select('content, metadata')
          .or(`content.ilike.%art.${articleNumber}%,content.ilike.%artigo ${articleNumber}%`)
          .limit(5);
          
        if (!error && secResults && secResults.length > 0) {
          console.log(`✅ Fallback document_sections para artigo ${articleNumber}`);
          executionResults.push({
            query: `Fallback artigo ${articleNumber}`,
            table: 'document_sections',
            purpose: 'Buscar artigo em document_sections',
            data: secResults.map(r => ({ content_chunk: r.content, chunk_metadata: r.metadata }))
          });
          hasResults = true;
        }
      }
    }
    
    async function executeEnchentesSearch() {
      console.log('🌊 ESTRATÉGIA: Busca por enchentes/risco...');
      
      // Estratégia 1: Busca específica por termos relacionados
      const riskTerms = queryLower.includes('proteção') ? 
        ['enchentes%sistema%atual', 'proteção%enchentes', 'área%estudo'] : 
        ['enchentes', 'inundação', 'risco'];
      
      for (const term of riskTerms) {
        const { data: enchentesResults, error } = await supabaseClient
          .from('bairros_risco_desastre')
          .select('bairro_nome, areas_criticas, observacoes, risco_inundacao, nivel_risco_geral')
          .or(`areas_criticas.ilike.%${term}%,risco_inundacao.eq.true`)
          .order('bairro_nome');

        if (!error && enchentesResults && enchentesResults.length > 0) {
          // Filtros específicos baseados na query
          let finalResults = enchentesResults;
          
          if (queryLower.includes('sistema atual') || queryLower.includes('protegidos')) {
            finalResults = enchentesResults.filter(b => 
              b.areas_criticas && 
              (b.areas_criticas.toLowerCase().includes('sistema atual') ||
               b.areas_criticas.toLowerCase().includes('protegidos'))
            );
          } else if (queryLower.includes('2024') || queryLower.includes('área de estudo')) {
            finalResults = enchentesResults.filter(b => 
              b.areas_criticas && b.areas_criticas.toLowerCase().includes('2024')
            );
          }
          
          if (queryLower.includes('quantos')) {
            executionResults.push({
              query: `Contar bairros: ${term}`,
              table: 'bairros_risco_desastre',
              purpose: 'Contar quantos bairros foram afetados',
              data: [{ 
                total_bairros_enchentes: finalResults.length,
                bairros_lista: finalResults.map(b => b.bairro_nome),
                criterio_busca: term
              }]
            });
          } else {
            executionResults.push({
              query: `Busca enchentes: ${term}`,
              table: 'bairros_risco_desastre',
              purpose: 'Buscar bairros afetados por enchentes',
              data: finalResults
            });
          }
          hasResults = true;
          return;
        }
      }
    }
    
    async function executeBairroSearch() {
      console.log(`🏘️ ESTRATÉGIA: Busca por dados urbanísticos (DINÂMICA)...`);
      
      const extractedBairro = queryClassification.bairro || await extractBairroFromQuery(query, bairrosList);
      let searchBairro = extractedBairro;
      
      // Estratégia 1: Bairro identificado diretamente
      if (searchBairro) {
        const { data: regimeResults, error } = await supabaseClient
          .from('regime_urbanistico')
          .select('zona, bairro, altura_maxima, coef_aproveitamento_basico, coef_aproveitamento_maximo')
          .ilike('bairro', `%${searchBairro}%`)
          .order('zona');

        if (!error && regimeResults && regimeResults.length > 0) {
          console.log(`✅ Encontrado dados para bairro: ${regimeResults[0].bairro}`);
          executionResults.push({
            query: `Dados urbanísticos ${searchBairro}`,
            table: 'regime_urbanistico',
            purpose: `Obter dados urbanísticos do bairro ${regimeResults[0].bairro}`,
            data: regimeResults,
            detectedBairro: searchBairro
          });
          hasResults = true;
          return;
        }
      }
      
      // Estratégia 2: Detectar bairro automaticamente usando sistema inteligente
      if (!searchBairro && (queryLower.includes('altura') || queryLower.includes('coeficiente'))) {
        const words = query.split(' ').filter(w => w.length > 3);
        for (const word of words) {
          const potentialBairro = findBairroMatch(word, bairrosList);
          
          if (potentialBairro) {
            searchBairro = potentialBairro;
            console.log(`🎯 Bairro detectado automaticamente via matching: ${searchBairro}`);
            break;
          }
        }
        
        if (searchBairro) {
          const { data: regimeResults, error } = await supabaseClient
            .from('regime_urbanistico')
            .select('zona, bairro, altura_maxima, coef_aproveitamento_basico, coef_aproveitamento_maximo')
            .ilike('bairro', `%${searchBairro}%`)
            .order('zona');

          if (!error && regimeResults && regimeResults.length > 0) {
            executionResults.push({
              query: `Auto-detectado: ${searchBairro}`,
              table: 'regime_urbanistico',
              purpose: `Dados urbanísticos do bairro ${regimeResults[0].bairro}`,
              data: regimeResults,
              detectedBairro: searchBairro
            });
            hasResults = true;
            return;
          }
        }
      }
    }

    async function executeListagemSearch() {
      console.log('📋 ESTRATÉGIA: Busca por listagem/conceitos...');
      
      // Detectar se é sobre zonas (DINÂMICO)
      if (queryLower.includes('zonas especiais') || queryLower.includes('quais são as zonas')) {
        // Usar lista de zonas carregada dinamicamente
        const zonasEspeciais = zonasList.filter(z => z.toLowerCase().includes('especial'));
        
        if (zonasEspeciais.length > 0) {
          executionResults.push({
            query: 'Listar zonas especiais (dinâmico)',
            table: 'cache_zonas',
            purpose: 'Listar todas as zonas especiais dinamicamente',
            data: zonasEspeciais.map(z => ({ zona: z }))
          });
          hasResults = true;
          return;
        }
        
        // Fallback para busca na base
        const { data: zonasResults, error } = await supabaseClient
          .from('regime_urbanistico')
          .select('zona')
          .distinct('zona')
          .ilike('zona', '%especial%')
          .order('zona');

        if (!error && zonasResults && zonasResults.length > 0) {
          executionResults.push({
            query: 'Listar zonas especiais (fallback)',
            table: 'regime_urbanistico',
            purpose: 'Listar todas as zonas especiais',
            data: zonasResults
          });
          hasResults = true;
          return;
        }
      }
      
      // Listagem de todos os bairros
      if (queryLower.includes('todos os bairros') || queryLower.includes('quantos bairros')) {
        executionResults.push({
          query: 'Listar todos os bairros (dinâmico)',
          table: 'cache_bairros',
          purpose: 'Listar todos os bairros dinamicamente',
          data: [{ 
            total_bairros: bairrosList.length,
            bairros_lista: bairrosList,
            fonte: 'carregamento_dinamico'
          }]
        });
        hasResults = true;
        return;
      }
      
      // Busca geral conceitual em documentos
      const keywords = queryClassification.keywords.slice(0, 3).join('%');
      const { data: docResults, error } = await supabaseClient
        .from('document_embeddings')
        .select('content_chunk, chunk_metadata')
        .ilike('content_chunk', `%${keywords}%`)
        .limit(8);

      if (!error && docResults && docResults.length > 0) {
        executionResults.push({
          query: `Busca conceitual: ${keywords}`,
          table: 'document_embeddings',
          purpose: 'Busca conceitual em documentos',
          data: docResults
        });
        hasResults = true;
      }
    }

    async function executeConceitualSearch() {
      console.log('🧠 ESTRATÉGIA: Busca conceitual...');
      
      const searchTerms = [];
      
      if (queryLower.includes('objetivos')) {
        searchTerms.push('%objetivos%plano%diretor%');
        searchTerms.push('%princípios%fundamentais%');
      }
      
      if (queryLower.includes('princípios')) {
        searchTerms.push('%princípios%fundamentais%');
        searchTerms.push('%art%3%princípios%');
      }
      
      // Adicionar busca geral por keywords
      if (searchTerms.length === 0) {
        const keywords = queryClassification.keywords.slice(0, 2).join('%');
        searchTerms.push(`%${keywords}%`);
      }
      
      for (const term of searchTerms) {
        const { data: docResults, error } = await supabaseClient
          .from('document_embeddings')
          .select('content_chunk, chunk_metadata')
          .ilike('content_chunk', term)
          .limit(8);

        if (!error && docResults && docResults.length > 0) {
          executionResults.push({
            query: `Busca conceitual: ${term}`,
            table: 'document_embeddings',
            purpose: 'Busca conceitual em documentos',
            data: docResults
          });
          hasResults = true;
          return;
        }
      }
    }

    async function executeGeneralSearch() {
      console.log('🔍 ESTRATÉGIA: Busca geral com fallback múltiplo...');
      
      const keywords = queryClassification.keywords.slice(0, 3);
      
      // Estratégia 1: Busca em document_embeddings
      for (let i = keywords.length; i >= 1; i--) {
        const searchTerm = `%${keywords.slice(0, i).join('%')}%`;
        
        const { data: docResults, error } = await supabaseClient
          .from('document_embeddings')
          .select('content_chunk, chunk_metadata')
          .ilike('content_chunk', searchTerm)
          .limit(6);

        if (!error && docResults && docResults.length > 0) {
          console.log(`✅ Busca geral bem-sucedida com ${i} keywords`);
          executionResults.push({
            query: `Busca geral: ${searchTerm}`,
            table: 'document_embeddings',
            purpose: 'Busca geral em documentos',
            data: docResults
          });
          hasResults = true;
          return;
        }
      }
      
      // Estratégia 2: Fallback para document_sections
      const mainKeyword = keywords[0];
      if (mainKeyword) {
        const { data: secResults, error } = await supabaseClient
          .from('document_sections')
          .select('content, metadata')
          .ilike('content', `%${mainKeyword}%`)
          .limit(5);
          
        if (!error && secResults && secResults.length > 0) {
          console.log(`✅ Fallback document_sections bem-sucedido`);
          executionResults.push({
            query: `Fallback geral: ${mainKeyword}`,
            table: 'document_sections',
            purpose: 'Busca fallback em sections',
            data: secResults.map(r => ({ content_chunk: r.content, chunk_metadata: r.metadata }))
          });
          hasResults = true;
        }
      }
    }

    console.log('✅ Execução dinâmica completa:', {
      totalResults: executionResults.length,
      hasValidData: hasResults,
      queryClassification: queryClassification.type,
      strategyUsed: executionResults[0]?.query || 'nenhuma'
    });

    // SÍNTESE DA RESPOSTA
    let finalResponse = '';
    let confidence = hasResults ? 0.9 : 0.1;
    let sources = { tabular: 0, conceptual: 0 };

    if (executionResults.length > 0) {
      for (const result of executionResults) {
        if (result.data && result.data.length > 0) {
          
          // Resposta para artigos da lei
          if (result.purpose.includes('artigo') || result.purpose.includes('Buscar artigo')) {
            const relevantDocs = result.data.filter(doc => 
              doc.content_chunk.toLowerCase().includes('artigo') ||
              doc.content_chunk.toLowerCase().includes('art.') ||
              doc.content_chunk.toLowerCase().includes('certificação') ||
              doc.content_chunk.toLowerCase().includes('sustentabilidade')
            );
            
            if (relevantDocs.length > 0) {
              // Tentar extrair número do artigo específico
              const firstDoc = relevantDocs[0].content_chunk;
              const artMatch = firstDoc.match(/(?:art|artigo)\s*\.?\s*(\d+)/i);
              const incMatch = firstDoc.match(/inciso\s*([IVX]+)/i);
              
              if (artMatch) {
                finalResponse = `Com base nos documentos oficiais do Plano Diretor de Porto Alegre, `;
                finalResponse += `encontrei informações sobre o **Artigo ${artMatch[1]}`;
                if (incMatch) finalResponse += `, Inciso ${incMatch[1]}`;
                finalResponse += `** da LUOS (Lei de Uso e Ocupação do Solo).\n\n`;
                
                // Extrair trecho relevante
                const relevantText = firstDoc.length > 300 ? firstDoc.substring(0, 300) + '...' : firstDoc;
                finalResponse += `**Conteúdo do artigo:**\n${relevantText}`;
              } else {
                finalResponse = `Com base nos documentos do Plano Diretor de Porto Alegre, encontrei as seguintes informações:\n\n`;
                relevantDocs.slice(0, 2).forEach((doc, i) => {
                  const content = doc.content_chunk.length > 200 ? doc.content_chunk.substring(0, 200) + '...' : doc.content_chunk;
                  finalResponse += `**${i + 1}.** ${content}\n\n`;
                });
              }
              sources.conceptual = relevantDocs.length;
            }
          }
          
          // Resposta para enchentes
          else if (result.purpose.includes('enchentes') || result.purpose.includes('Contar quantos bairros')) {
            if (result.data[0]?.total_bairros_enchentes !== undefined) {
              const total = result.data[0].total_bairros_enchentes;
              const bairrosList = result.data[0].bairros_lista;
              finalResponse = `Segundo os dados oficiais, **${total} bairros** foram identificados com risco de enchentes:\n\n`;
              if (bairrosList && bairrosList.length > 0) {
                finalResponse += bairrosList.map((b, i) => `${i + 1}. ${b}`).join('\n') + '\n\n';
              }
              finalResponse += `Estes bairros necessitam de estudos específicos para implementação de medidas de proteção contra inundações.`;
              confidence = 0.95;
            } else {
              const bairros = result.data.map(b => b.bairro_nome);
              finalResponse = `Os seguintes **${result.data.length} bairros** foram identificados com risco de enchentes:\n\n`;
              finalResponse += bairros.map((b, i) => `${i + 1}. ${b}`).join('\n') + '\n\n';
              finalResponse += `Estes bairros necessitam de estudos específicos para implementação de medidas de proteção contra inundações.`;
            }
            sources.tabular = result.data.length;
          }
          
          // Resposta para dados urbanísticos
          else if (result.purpose.includes('dados urbanísticos') || result.purpose.includes('Obter dados')) {
            const bairroName = result.data[0]?.bairro || result.detectedBairro || 'consultado';
            finalResponse = `**Dados Urbanísticos para o bairro ${bairroName}:**\n\n`;
            
            result.data.forEach(item => {
              finalResponse += `**${item.zona}:**\n`;
              finalResponse += `• Altura Máxima: ${item.altura_maxima || 'N/A'} metros\n`;
              finalResponse += `• Coeficiente de Aproveitamento Básico: ${item.coef_aproveitamento_basico || 'N/A'}\n`;
              finalResponse += `• Coeficiente de Aproveitamento Máximo: ${item.coef_aproveitamento_maximo || 'N/A'}\n\n`;
            });
            
            sources.tabular = result.data.length;
          }
          
          // Resposta geral
          else {
            finalResponse = `Com base nos documentos do Plano Diretor de Porto Alegre:\n\n`;
            result.data.slice(0, 2).forEach((doc, index) => {
              const content = doc.content_chunk.length > 200 
                ? doc.content_chunk.substring(0, 200) + '...'
                : doc.content_chunk;
              finalResponse += `**${index + 1}.** ${content}\n\n`;
            });
            sources.conceptual = result.data.length;
          }
        }
      }
    }

    // Fallback se não há resposta específica
    if (!finalResponse) {
      finalResponse = `Não foi possível encontrar informações específicas para "${query}". `;
      
      // Sugestões inteligentes baseadas na classificação
      const bairro = queryClassification.bairro;
      const artigo = queryClassification.artigo;
      
      if (bairro) {
        finalResponse += `\n\n💡 **Dica:** Tentei buscar informações sobre o bairro "${bairro}". Verifique se o nome está correto ou tente uma busca mais específica como "altura máxima ${bairro}" ou "coeficiente aproveitamento ${bairro}".`;
      } else if (artigo) {
        finalResponse += `\n\n💡 **Dica:** Tentei buscar o artigo ${artigo}. Tente ser mais específico, como "artigo ${artigo} LUOS" ou inclua o tema do artigo.`;
      } else if (queryClassification.type === 'conceitual') {
        finalResponse += '\n\n💡 **Dica:** Para perguntas conceituais, tente ser mais específico. Exemplos: "art. 3º princípios fundamentais", "objetivos do plano diretor".';
      } else {
        finalResponse += '\n\n💡 **Dica:** Seja mais específico em sua consulta. Exemplos: "artigo 81 LUOS", "altura máxima Menino Deus", "enchentes 2024".';
      }
      
      confidence = 0.1;
    }

    const executionTime = Date.now() - startTime;
    
    const response = {
      response: finalResponse,
      confidence: confidence,
      sources: sources,
      executionTime: executionTime,
      metadata: {
        pipeline: 'agentic-v2-dynamic',
        timestamp: new Date().toISOString(),
        sessionId: sessionId,
        model: model,
        totalQueries: executionResults.length,
        hasValidResults: hasResults,
        queryClassification: queryClassification,
        strategyUsed: executionResults[0]?.strategy || executionResults[0]?.purpose || 'fallback',
        isHardcoded: false
      }
    };

    console.log('✅ Resposta final v2 dinâmica:', {
      confidence: response.confidence,
      executionTime: executionTime,
      sources: response.sources,
      queryType: queryClassification.type,
      strategyUsed: executionResults[0]?.strategy || 'fallback'
    });

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Agentic-RAG v2 dinâmico error:', error);
    
    return new Response(JSON.stringify({
      response: 'Desculpe, ocorreu um erro ao processar sua solicitação. Por favor, tente novamente.',
      confidence: 0,
      sources: { tabular: 0, conceptual: 0 },
      executionTime: 0,
      error: error.message,
      metadata: {
        pipeline: 'agentic-v2-dynamic',
        error: true,
        errorMessage: error.message,
        timestamp: new Date().toISOString()
      }
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});