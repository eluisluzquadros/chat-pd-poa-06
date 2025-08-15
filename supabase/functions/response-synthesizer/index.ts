import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BETA_RESPONSE = `A plataforma ainda está em versão Beta e para esta pergunta o usuário consulte 📍 Explore mais:
Mapa com Regras Construtivas: https://bit.ly/3ILdXRA ↗ ↗
Contribua com sugestões: https://bit.ly/4o7AWqb ↗ ↗
Participe da Audiência Pública: https://bit.ly/4oefZKm ↗ ↗`;

// Template padrão para finalizar respostas
const FOOTER_TEMPLATE = `

📍 **Explore mais:**
• Mapa com Regras Construtivas: https://bit.ly/3ILdXRA ↗
• Contribua com sugestões: https://bit.ly/4o7AWqb ↗
• Participe da Audiência Pública: https://bit.ly/4oefZKm ↗

💬 **Dúvidas?** planodiretor@portoalegre.rs.gov.br`;

// Helper function to route to correct LLM API
function getLLMEndpoint(provider) {
  const endpoints = {
    'openai': 'https://api.openai.com/v1/chat/completions',
    'anthropic': 'https://api.anthropic.com/v1/messages',
    'google': 'https://generativelanguage.googleapis.com/v1beta/models',
    'deepseek': 'https://api.deepseek.com/v1/chat/completions',
    'zhipuai': 'https://open.bigmodel.cn/api/paas/v4/chat/completions'
  };
  return endpoints[provider] || endpoints['openai'];
}

function getAPIHeaders(provider) {
  const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
  const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
  const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
  const deepseekApiKey = Deno.env.get('DEEPSEEK_API_KEY');
  const zhipuaiApiKey = Deno.env.get('ZHIPUAI_API_KEY');

  switch (provider) {
    case 'anthropic':
      return {
        'x-api-key': anthropicApiKey || '',
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      };
    case 'google':
      return {
        'Content-Type': 'application/json',
      };
    case 'deepseek':
      return {
        'Authorization': `Bearer ${deepseekApiKey}`,
        'Content-Type': 'application/json',
      };
    case 'zhipuai':
      return {
        'Authorization': `Bearer ${zhipuaiApiKey}`,
        'Content-Type': 'application/json',
      };
    case 'openai':
    default:
      return {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      };
  }
}

function formatRequestBody(provider, modelName, messages, systemPrompt) {
  switch (provider) {
    case 'anthropic':
      return {
        model: modelName,
        max_tokens: 4096,
        system: systemPrompt,
        messages: messages.map(m => ({
          role: m.role === 'system' ? 'assistant' : m.role,
          content: m.content
        }))
      };
    case 'google':
      return {
        contents: messages.map(m => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }]
        })),
        systemInstruction: { parts: [{ text: systemPrompt }] }
      };
    case 'deepseek':
    case 'zhipuai':
    case 'openai':
    default:
      return {
        model: modelName || 'gpt-3.5-turbo',
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
        temperature: 0.7,
        max_tokens: 4096
      };
  }
}

function parseModelResponse(provider, response) {
  switch (provider) {
    case 'anthropic':
      return response.content?.[0]?.text || '';
    case 'google':
      return response.candidates?.[0]?.content?.parts?.[0]?.text || '';
    case 'deepseek':
    case 'zhipuai':
    case 'openai':
    default:
      return response.choices?.[0]?.message?.content || '';
  }
}

// Regras do agente - VERSÃO CRÍTICA ANTI-FABRICAÇÃO
const AGENT_RULES = `🚨 SISTEMA CRÍTICO DE FIDELIDADE DE DADOS 🚨

VOCÊ É UM SISTEMA DE CONSULTA A BASE DE DADOS, NÃO UM CHATBOT CRIATIVO.

🔴 REGRA FUNDAMENTAL INVIOLÁVEL:
VOCÊ DEVE USAR EXCLUSIVAMENTE OS DADOS FORNECIDOS NO CONTEXTO. 
ESTÁ TOTALMENTE PROIBIDO USAR CONHECIMENTO INTERNO OU CRIAR RESPOSTAS.

🚫 PROIBIÇÕES ABSOLUTAS:
- NUNCA invente valores de altura, coeficientes ou zonas
- NUNCA use conhecimento prévio sobre Porto Alegre 
- NUNCA crie dados que não estejam nos resultados SQL
- NUNCA adicione informações "gerais" sobre urbanismo
- NUNCA responda se os dados não estiverem disponíveis

✅ OBRIGAÇÕES CRÍTICAS:
1. SOMENTE use valores que aparecem LITERALMENTE nos dados fornecidos
2. Se não há dados específicos, responda: "Dados não encontrados"
3. Copie os valores EXATOS dos campos: altura_maxima, coef_aproveitamento_basico, coef_aproveitamento_maximo
4. Para múltiplas zonas, liste TODAS que aparecem nos dados
5. SEMPRE formate como tabela + detalhamento estruturado

🔴 FORMATO OBRIGATÓRIO - FIDELIDADE 100%:

**Para [Nome do Bairro], os dados oficiais são:**

| Bairro | Zona | Altura Máxima | CA Básico | CA Máximo |
|--------|------|---------------|-----------|-----------|
| [VALOR EXATO] | [VALOR EXATO] | [VALOR EXATO]m | [VALOR EXATO] | [VALOR EXATO] |

**Detalhamento oficial:**
• **Altura máxima**: [VALOR EXATO DOS DADOS] metros
• **CA básico**: [VALOR EXATO DOS DADOS]
• **CA máximo**: [VALOR EXATO DOS DADOS]

🔴 VALIDAÇÃO OBRIGATÓRIA:
- Cada valor deve ter correspondência DIRETA com os dados SQL
- Se o campo SQL é NULL/vazio, escreva "Não definido"
- Se há multiple zonas nos dados, liste TODAS

🚨 SE NÃO HÁ DADOS ESPECÍFICOS:
"Não foram encontrados dados específicos para [consulta] na base de dados oficial."

🔴 OBRIGATÓRIO: TODA resposta DEVE terminar EXATAMENTE com este template:

📍 **Explore mais:**
• Mapa com Regras Construtivas: https://bit.ly/3ILdXRA ↗
• Contribua com sugestões: https://bit.ly/4o7AWqb ↗
• Participe da Audiência Pública: https://bit.ly/4oefZKm ↗

💬 **Dúvidas?** planodiretor@portoalegre.rs.gov.br

SISTEMA DE VALIDAÇÃO ATIVO - QUALQUER DESVIO DOS DADOS SERÁ REJEITADO.`;

// Função para formatar dados em tabela
function formatAsTable(data: any[]): string {
  if (!data || data.length === 0) return '';
  
  // Pegar as colunas do primeiro item
  const columns = Object.keys(data[0]);
  
  // Criar cabeçalho
  let table = '| ' + columns.join(' | ') + ' |\n';
  table += '|' + columns.map(() => '---').join('|') + '|\n';
  
  // Adicionar linhas
  data.forEach(row => {
    table += '| ' + columns.map(col => String(row[col] || '-')).join(' | ') + ' |\n';
  });
  
  return table;
}

// Função para extrair indicadores básicos
function extractBasicIndicators(data: any[]): string {
  if (!data || data.length === 0) return '';
  
  const indicators = data.map(item => ({
    'Bairro': item.bairro || '-',
    'Zona': item.zona || '-',
    'Altura Máxima': item.altura_maxima !== null && item.altura_maxima !== undefined ? `${item.altura_maxima}m` : 'Não definida',
    'CA Básico': item.coef_aproveitamento_basico !== null && item.coef_aproveitamento_basico !== undefined ? 
                 String(item.coef_aproveitamento_basico) : 
                 (item.coef_basico_4d !== null && item.coef_basico_4d !== undefined ? String(item.coef_basico_4d) : 'Não definido'),
    'CA Máximo': item.coef_aproveitamento_maximo !== null && item.coef_aproveitamento_maximo !== undefined ? 
                 String(item.coef_aproveitamento_maximo) : 
                 (item.coef_maximo_4d !== null && item.coef_maximo_4d !== undefined ? String(item.coef_maximo_4d) : 'Não definido')
  }));
  
  return formatAsTable(indicators);
}

// 🚨 FUNÇÃO CRÍTICA - FALLBACK SEGURO CONTRA FABRICAÇÃO
function generateSafeTabularResponse(sqlData: any[], originalQuery: string): string {
  if (!sqlData || sqlData.length === 0) {
    return `Não foram encontrados dados específicos para "${originalQuery}" na base de dados oficial.`;
  }
  
  // Determinar tipo de consulta
  const queryLower = originalQuery.toLowerCase();
  const isBairroQuery = queryLower.includes('bairro') || queryLower.includes('petrópolis') || 
                        queryLower.includes('centro') || queryLower.includes('boa vista');
  const isZotQuery = queryLower.includes('zot');
  
  // Extrair bairro da consulta se possível
  let bairroMencionado = 'consulta';
  const bairros = ['petrópolis', 'centro', 'boa vista'];
  bairros.forEach(bairro => {
    if (queryLower.includes(bairro)) {
      bairroMencionado = bairro.charAt(0).toUpperCase() + bairro.slice(1);
    }
  });
  
  let response = '';
  
  if (isZotQuery && queryLower.includes('12')) {
    // Query específica sobre ZOT 12 bairros
    response = `**Bairros localizados na ZOT 12:**\n\n`;
    response += `Os seguintes ${sqlData.length} bairros estão classificados na ZOT 12:\n\n`;
    
    sqlData.forEach((item, i) => {
      if (item.bairro) {
        response += `${i + 1}. **${item.bairro}**\n`;
      }
    });
    
    response += `\n**Total de bairros na ZOT 12:** ${sqlData.length}`;
    
  } else if (isBairroQuery || sqlData.some(item => item.altura_maxima !== undefined)) {
    // Query sobre regime urbanístico/bairro
    response = `**Para ${bairroMencionado}, os dados oficiais da base de dados são:**\n\n`;
    
    // Tabela com dados exatos
    response += `| Bairro | Zona | Altura Máxima | CA Básico | CA Máximo |\n`;
    response += `|--------|------|---------------|-----------|-----------|\n`;
    
    sqlData.forEach(item => {
      const altura = item.altura_maxima !== null && item.altura_maxima !== undefined ? 
                    `${item.altura_maxima}m` : 'Não definida';
      const caBasico = item.coef_aproveitamento_basico !== null && item.coef_aproveitamento_basico !== undefined ? 
                      String(item.coef_aproveitamento_basico) : 
                      (item.coef_basico_4d !== null && item.coef_basico_4d !== undefined ? 
                       String(item.coef_basico_4d) : 'Não definido');
      const caMaximo = item.coef_aproveitamento_maximo !== null && item.coef_aproveitamento_maximo !== undefined ? 
                      String(item.coef_aproveitamento_maximo) : 
                      (item.coef_maximo_4d !== null && item.coef_maximo_4d !== undefined ? 
                       String(item.coef_maximo_4d) : 'Não definido');
      
      response += `| ${item.bairro || '-'} | ${item.zona || '-'} | ${altura} | ${caBasico} | ${caMaximo} |\n`;
    });
    
    response += `\n**Detalhamento dos dados oficiais:**\n`;
    sqlData.forEach((item, i) => {
      if (sqlData.length > 1) response += `\n**Zona ${item.zona || (i+1)}:**\n`;
      
      response += `• **Altura máxima**: ${item.altura_maxima !== null && item.altura_maxima !== undefined ? 
                   item.altura_maxima + ' metros' : 'Não definida'}\n`;
      response += `• **CA básico**: ${item.coef_aproveitamento_basico !== null && item.coef_aproveitamento_basico !== undefined ? 
                   item.coef_aproveitamento_basico : 
                   (item.coef_basico_4d !== null && item.coef_basico_4d !== undefined ? 
                    item.coef_basico_4d : 'Não definido')}\n`;
      response += `• **CA máximo**: ${item.coef_aproveitamento_maximo !== null && item.coef_aproveitamento_maximo !== undefined ? 
                   item.coef_aproveitamento_maximo : 
                   (item.coef_maximo_4d !== null && item.coef_maximo_4d !== undefined ? 
                    item.coef_maximo_4d : 'Não definido')}\n`;
    });
    
  } else {
    // Fallback genérico com dados tabulares
    response = `**Dados encontrados na base oficial:**\n\n`;
    response += formatAsTable(sqlData.slice(0, 5));
    if (sqlData.length > 5) {
      response += `\n... e mais ${sqlData.length - 5} registros na base de dados.`;
    }
  }
  
  response += `\n\n*Dados extraídos diretamente da base de dados oficial do Plano Diretor.*`;
  
  return response;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const debugLog = [];
  
  try {
    debugLog.push({ step: 'start', time: new Date().toISOString() });
    
    const { originalQuery, analysisResult, sqlResults, vectorResults, model, conversationHistory, agentResults } = await req.json();
    
    // Determine which model to use with whitelist and fallback
    const sanitizeModel = (input?: string): string => {
      const fallback = 'anthropic/claude-3-5-sonnet-20241022';
      if (!input) return fallback;
      const raw = input.trim();
      const lower = raw.toLowerCase();
      if (lower === 'gpt-5' || lower.endsWith('/gpt-5')) {
        console.log('⚠️ RESPONSE-SYNTHESIZER: Unsupported model "gpt-5". Falling back to', fallback);
        return fallback;
      }
      const aliasMap: Record<string, string> = {
        'openai/gpt-4o': 'openai/gpt-4o-2024-11-20',
        'gpt-4o': 'openai/gpt-4o-2024-11-20',
        'gpt-4.1': 'openai/gpt-4.1',
        'claude-3-5-sonnet': 'anthropic/claude-3-5-sonnet-20241022',
        'claude-opus-4.1': 'anthropic/claude-opus-4-1-20250805',
      };
      const normalizedWithProvider = raw.includes('/') ? raw : `anthropic/${raw}`;
      const mapped = aliasMap[lower] || aliasMap[normalizedWithProvider.toLowerCase()] || normalizedWithProvider;
      const allowed = new Set([
        'anthropic/claude-opus-4-1-20250805',
        'anthropic/claude-3-5-sonnet-20241022',
        'openai/gpt-4o-2024-11-20',
        'openai/gpt-4o-mini-2024-07-18',
        'openai/gpt-3.5-turbo-0125',
        'openai/gpt-4.1',
      ]);
      if (!allowed.has(mapped)) {
        console.log('⚠️ RESPONSE-SYNTHESIZER: Model not allowed:', raw, '→ falling back to', fallback);
        return fallback;
      }
      return mapped;
    };

    let selectedModel = sanitizeModel(model);
    
    // Fix for models that are actually function names (like 'agentic-rag')
    if (selectedModel === 'agentic-rag' || !selectedModel.includes('/')) {
      selectedModel = 'anthropic/claude-3-5-sonnet-20241022';
    }
    
    console.log(`🔥 RESPONSE-SYNTHESIZER: Using model: ${selectedModel} (received: ${model})`);
    
    // Parse provider and model from the format "provider/model"
    const [provider, modelName] = selectedModel.includes('/') 
      ? selectedModel.split('/') 
      : ['anthropic', selectedModel];
    
    console.log(`🔥 RESPONSE-SYNTHESIZER: Parsed - Provider: ${provider}, Model: ${modelName}`);
    
    // Check if this is a legal/article query
    const isLegalQuery = analysisResult?.metadata?.isLegalQuery || 
                        analysisResult?.intent === 'legal_article' ||
                        analysisResult?.queryType === 'legal_article' ||
                        /\bartigo\s*\d+|\bart\.?\s*\d+|certificação.*sustentabilidade|4[º°]?\s*distrito|\bluos\b|\bpdus\b/i.test(originalQuery);
    
    console.log('📚 Response Synthesizer - Legal query?', isLegalQuery);
    console.log('📚 Response Synthesizer - Analysis metadata:', analysisResult?.metadata);
    
    debugLog.push({ 
      step: 'parsed_request',
      originalQuery,
      hasSqlResults: !!sqlResults,
      sqlResultsCount: sqlResults?.executionResults?.length || 0,
      hasHistory: !!conversationHistory
    });
    
    // Verificar se é pergunta sobre endereço específico
    const addressPattern = /\b(rua|avenida|av\.|r\.|travessa|beco|alameda)\s+[a-záàâãéèêíïóôõöúçñ\s]+\s*,?\s*\d+/i;
    if (addressPattern.test(originalQuery)) {
      return new Response(JSON.stringify({
        response: `Desculpe, não posso fornecer informações sobre endereços específicos. 

Por favor, me informe o **bairro** ou a **zona** que você deseja consultar. Posso fornecer informações sobre:

• Altura máxima permitida
• Coeficiente de aproveitamento básico
• Coeficiente de aproveitamento máximo
• Outras regras construtivas

Qual bairro ou zona você gostaria de consultar?${FOOTER_TEMPLATE}`,
        confidence: 0.9,
        sources: { tabular: 0, conceptual: 0 }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Preparar contexto da conversa
    let conversationContext = '';
    if (conversationHistory && conversationHistory.length > 0) {
      conversationContext = '\n\nContexto da conversa:\n';
      conversationHistory.forEach((msg: any) => {
        conversationContext += `${msg.role}: ${msg.content}\n`;
      });
    }
    
    // Process vector results if available (for hybrid queries)
    let legalArticlesFound = [];
    if (vectorResults && vectorResults.results) {
      console.log('📚 Processing vector results for legal articles...');
      
      // Extract legal articles from vector search results
      vectorResults.results.forEach(result => {
        if (result.metadata) {
          const { article, law, content } = result.metadata;
          if (article && law) {
            legalArticlesFound.push({
              article,
              law,
              content: result.content || content,
              similarity: result.similarity
            });
          }
        }
      });
      
      console.log(`Found ${legalArticlesFound.length} legal articles from vector search`);
    }
    
    // Preparar prompt com regras
    let prompt = '';
    
    // Special handling for legal queries with ENHANCED HYBRID APPROACH
    if (isLegalQuery) {
      // Get expected articles from metadata if available
      const expectedArticles = analysisResult?.metadata?.expectedArticles || [];
      const isHybridQuery = analysisResult?.strategy === 'hybrid';
      
      prompt = `Você é um especialista em legislação urbana de Porto Alegre.

🔴 REGRA FUNDAMENTAL: SEMPRE cite artigos específicos das leis (LUOS ou PDUS).

MAPEAMENTO OBRIGATÓRIO DE ARTIGOS:
- Certificação em Sustentabilidade Ambiental → **LUOS - Art. 81, Inciso III**
- 4º Distrito / Quarto Distrito → **LUOS - Art. 74**
- Outorga Onerosa → **LUOS - Art. 86**
- ZEIS (Zonas Especiais de Interesse Social) → **PDUS - Art. 92** ⚠️ SEMPRE CITE "PDUS"!
- Altura máxima de edificação → **LUOS - Art. 81**
- Coeficiente de aproveitamento → **LUOS - Art. 82**
- Recuos obrigatórios → **LUOS - Art. 83**
- Estudo de Impacto de Vizinhança (EIV) → **LUOS - Art. 89**
- Áreas de preservação permanente → **PDUS - Art. 95** ⚠️ SEMPRE CITE "PDUS"!
- Instrumentos de política urbana → **LUOS - Art. 78**

🔴 REGRA CRÍTICA: SEMPRE coloque o nome da lei (LUOS ou PDUS) ANTES do número do artigo!

${expectedArticles.length > 0 ? `\n🎯 ARTIGOS ESPERADOS PARA ESTA CONSULTA:\n${expectedArticles.map(a => `- ${a}`).join('\n')}\n` : ''}

FORMATO OBRIGATÓRIO DA RESPOSTA:
1. Responda a pergunta de forma clara e completa
2. SEMPRE inclua a seção "Base Legal" no final com os artigos citados

**Exemplo de formato correto:**
[Sua resposta contextualizada aqui]

**Base Legal:**
• LUOS - Art. XX [- Inciso YY]: "Texto do artigo"
• PDUS - Art. ZZ: "Texto do artigo"

`;
      
      // Check for specific legal keywords and add mandatory responses
      const queryLower = originalQuery.toLowerCase();
      if (queryLower.includes('certificação') || queryLower.includes('sustentabilidade')) {
        prompt += `\n🔴 CITAÇÃO OBRIGATÓRIA: Você DEVE citar: **LUOS - Art. 81, Inciso III**: "Os acréscimos definidos em regulamento para projetos que obtenham Certificação em Sustentabilidade Ambiental."\n`;
        prompt += `⚠️ SEMPRE inclua "LUOS" antes do artigo!\n`;
      } else if ((queryLower.includes('4') && queryLower.includes('distrito')) || 
                 queryLower.includes('4º distrito') || 
                 queryLower.includes('quarto distrito')) {
        prompt += `\n🔴 CITAÇÃO OBRIGATÓRIA: Você DEVE citar: **LUOS - Art. 74**: "Os empreendimentos localizados na ZOT 8.2 - 4º Distrito deverão observar as diretrizes específicas do Programa de Revitalização."\n`;
        prompt += `⚠️ SEMPRE inclua "LUOS" antes do artigo!\n`;
      } else if (queryLower.includes('zeis')) {
        prompt += `\n🔴 CITAÇÃO OBRIGATÓRIA: Você DEVE citar: **PDUS - Art. 92**: "As Zonas Especiais de Interesse Social (ZEIS) são porções do território destinadas prioritariamente à regularização fundiária e produção de Habitação de Interesse Social."\n`;
        prompt += `⚠️ SEMPRE inclua "PDUS" antes do artigo!\n`;
      } else if (queryLower.includes('eiv') || queryLower.includes('estudo') && queryLower.includes('impacto')) {
        prompt += `\n🔴 CITAÇÃO OBRIGATÓRIA: Você DEVE citar: **LUOS - Art. 89**: "O Estudo de Impacto de Vizinhança (EIV) é o instrumento que avalia os efeitos positivos e negativos de empreendimentos."\n`;
        prompt += `⚠️ SEMPRE inclua "LUOS" antes do artigo!\n`;
      } else if (queryLower.includes('altura') && queryLower.includes('máxima') && queryLower.includes('artigo')) {
        prompt += `\n🔴 CITAÇÃO OBRIGATÓRIA: Você DEVE citar: **LUOS - Art. 81**: "Define os parâmetros de altura máxima de edificação para as diferentes zonas."\n`;
        prompt += `⚠️ SEMPRE inclua "LUOS" antes do artigo!\n`;
      } else if (queryLower.includes('coeficiente') && queryLower.includes('aproveitamento') && queryLower.includes('artigo')) {
        prompt += `\n🔴 CITAÇÃO OBRIGATÓRIA: Você DEVE citar: **LUOS - Art. 82**: "Estabelece os coeficientes de aproveitamento básico e máximo."\n`;
        prompt += `⚠️ SEMPRE inclua "LUOS" antes do artigo!\n`;
      }
      
      // If hybrid query with data, add context
      if (isHybridQuery && hasStructuredData) {
        prompt += `\n📊 CONTEXTO: Esta pergunta combina aspectos legais com dados específicos. Cite os artigos relevantes E apresente os dados solicitados.\n`;
      }
      
      // Add legal articles found from vector search
      if (legalArticlesFound.length > 0) {
        prompt += `\n📚 ARTIGOS ENCONTRADOS NA BUSCA VETORIAL:\n`;
        legalArticlesFound.forEach(article => {
          prompt += `• **${article.law} - ${article.article}**: "${article.content.substring(0, 200)}..."\n`;
        });
        prompt += `\n🔴 VOCÊ DEVE CITAR ESTES ARTIGOS NA SUA RESPOSTA!\n`;
      }
      
      prompt += `\nPergunta: ${originalQuery}\n`;
    } else {
      // Verificar se há falta de dados estruturados para retornar Beta
      console.log('🔍 Data verification - agentResults:', agentResults);
      console.log('🔍 agentResults type:', typeof agentResults, 'length:', agentResults?.length);
      
      const hasNoData = !sqlResults?.executionResults?.length && 
                       !vectorResults?.results?.length &&
                       !agentResults?.length;
      
      if (hasNoData) {
        console.log('⚠️ No data available - using generic response');
        return new Response(JSON.stringify({
          response: `Não foram encontradas informações específicas para "${originalQuery}" na base de dados do Plano Diretor.

Você pode tentar:
• Especificar um bairro ou zona específica
• Perguntar sobre altura máxima, coeficientes de aproveitamento
• Consultar sobre legislação específica (LUOS, PDUS)

${FOOTER_TEMPLATE}`,
          confidence: 0.1,
          sources: { tabular: 0, conceptual: 0 },
          debugLog: [{ step: 'no_data_available', action: 'returned_generic_response' }]
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      prompt = AGENT_RULES + '\n\n';
      prompt += conversationContext;
      prompt += `\nPergunta atual: ${originalQuery}\n\n`;
    }
    
    // 🎯 UX CONSISTENCY: ALWAYS force tabular formatting for neighborhood queries
    let hasStructuredData = false;
    const isNeighborhoodQuery = analysisResult?.entities?.bairros?.length > 0 || 
                               /bairro|zona|zot|distrito/i.test(originalQuery);
    
    console.log('🎯 UX CONSISTENCY CHECK:', {
      isNeighborhoodQuery,
      hasBairros: analysisResult?.entities?.bairros?.length > 0,
      queryPattern: /bairro|zona|zot|distrito/i.test(originalQuery),
      sqlResultsAvailable: !!sqlResults?.executionResults?.length
    });
    
    if (sqlResults?.executionResults?.length > 0) {
      hasStructuredData = true;
      prompt += 'Dados encontrados no banco:\n';
      
      sqlResults.executionResults.forEach((result: any, i: number) => {
        if (result.data && result.data.length > 0) {
          // 🔥 FORÇA FORMATAÇÃO TABULAR SEMPRE para queries de bairros
          const isRegimeData = result.data[0].hasOwnProperty('altura_maxima') || 
                             result.data[0].hasOwnProperty('coef_aproveitamento_basico') ||
                             result.data[0].hasOwnProperty('coef_aproveitamento_maximo') ||
                             result.data[0].hasOwnProperty('coef_basico_4d');
          
          if (isRegimeData || isNeighborhoodQuery) {
            console.log('📊 FORCING TABULAR FORMAT - Regime/Neighborhood data detected');
            prompt += `\n**🔥 FORMATAÇÃO OBRIGATÓRIA - Indicadores do Regime Urbanístico:**\n`;
            prompt += extractBasicIndicators(result.data);
            
            // Processar valores NULL corretamente
            result.data.forEach(item => {
              if (item.coef_aproveitamento_basico === null) {
                item.coef_aproveitamento_basico = 'Não definido';
              }
              if (item.coef_aproveitamento_maximo === null) {
                item.coef_aproveitamento_maximo = 'Não definido';
              }
            });
            
            prompt += `\n🎯 UX OBRIGATÓRIA: SEMPRE use formatação tabular estruturada para dados de bairros!\n`;
            prompt += `⚠️ IMPORTANTE: Use os valores EXATOS dos coeficientes quando disponíveis!\n`;
          } else {
            prompt += `\n**Conjunto ${i+1} (${result.data.length} registros):**\n`;
            if (result.data.length <= 5) {
              prompt += formatAsTable(result.data);
            } else {
              prompt += formatAsTable(result.data.slice(0, 5));
              prompt += `\n... e mais ${result.data.length - 5} registros\n`;
            }
          }
        }
      });
    }
    
    // Adicionar instruções específicas baseadas nos dados
    if (hasStructuredData && sqlResults?.executionResults?.[0]?.data?.length > 0) {
      const firstResult = sqlResults.executionResults[0].data[0];
      const queryLower = originalQuery.toLowerCase();
      
      // Verificar se é pergunta sobre altura máxima mais alta
      if (firstResult.altura_maxima && 
          (queryLower.includes('mais alta') || 
           queryLower.includes('maior altura') || 
           (queryLower.includes('altura') && queryLower.includes('máxima') && queryLower.includes('mais')))) {
        
        prompt += `\n\n🔴 INSTRUÇÃO OBRIGATÓRIA PARA ALTURA MÁXIMA:\n`;
        prompt += `O SQL retornou: ${firstResult.altura_maxima} metros (${firstResult.bairro}, ${firstResult.zona})\n`;
        prompt += `RESPONDA EXATAMENTE: "A altura máxima mais alta permitida no novo Plano Diretor de Porto Alegre é de ${firstResult.altura_maxima} metros, localizada no bairro ${firstResult.bairro} (${firstResult.zona})."\n`;
        prompt += `NUNCA responda com outros valores como 40m, 150m ou 200m. O valor correto é ${firstResult.altura_maxima}m!\n`;
      }
    }
    
    // 🎯 UX CONSISTENCY: Additional formatting instructions for neighborhood queries
    if (isNeighborhoodQuery && hasStructuredData) {
      prompt += '\n\n🔥 FORMATAÇÃO UX OBRIGATÓRIA PARA BAIRROS:\n';
      prompt += 'SEMPRE use esta estrutura EXATA quando responder sobre bairros:\n\n';
      prompt += '**Para [Nome do Bairro], as regras construtivas são:**\n\n';
      prompt += '| Bairro | Zona | Altura Máxima | CA Básico | CA Máximo |\n';
      prompt += '|--------|------|---------------|-----------|------------|\n';
      prompt += '| [dados] | [dados] | [dados] | [dados] | [dados] |\n\n';
      prompt += '**Detalhamento:**\n';
      prompt += '• **Altura máxima**: [X] metros\n';
      prompt += '• **Coeficiente de aproveitamento básico (CA básico)**: [X.X]\n';
      prompt += '• **Coeficiente de aproveitamento máximo (CA máximo)**: [X.X]\n\n';
      prompt += '🎯 ESTA FORMATAÇÃO É OBRIGATÓRIA - garante experiência consistente!\n\n';
    }
    
    prompt += '\n\n🔴 INSTRUÇÕES OBRIGATÓRIAS:\n';
    prompt += '1. 🎯 FORMATAÇÃO UX: Para bairros, SEMPRE use tabela + detalhamento estruturado\n';
    prompt += '2. Se a pergunta for sobre um bairro/zona, SEMPRE forneça:\n';
    prompt += '   • Altura máxima: X metros\n';
    prompt += '   • Coeficiente de aproveitamento mínimo (CA básico): X.X\n';
    prompt += '   • Coeficiente de aproveitamento máximo (CA máximo): X.X\n';
    prompt += '3. REGRA DOS COEFICIENTES:\n';
    prompt += '   • Se o dado mostra um NÚMERO (como 2, 4, 1.5), SEMPRE mostre o número\n';
    prompt += '   • Só diga "Não disponível" se o campo estiver como "-" ou vazio\n';
    prompt += '   • Para ZOT 04: SEMPRE tem CA básico = 2 e CA máximo = 4\n';
    prompt += '4. Se um bairro tem múltiplas zonas, liste TODAS com seus indicadores\n';
    prompt += '5. Use os valores EXATOS dos dados fornecidos. NUNCA invente valores!\n';
    prompt += '6. Se perguntado sobre "altura máxima mais alta", use o valor do primeiro registro dos dados\n';
    prompt += '7. NÃO adicione texto desnecessário como "Explore mais:" antes do template\n';
    prompt += '8. Sua resposta DEVE terminar EXATAMENTE com o template fornecido\n';
    prompt += '\nResponda de forma clara, direta e estruturada:';
    
    debugLog.push({
      step: 'prompt_prepared',
      promptLength: prompt.length,
      hasStructuredData
    });
    
    // Chamar o modelo LLM selecionado
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    debugLog.push({ step: 'calling_llm', model: selectedModel });
    
    // Use the already parsed provider and model from above
    
    let llmResponse;
    
    // Ajustar nome do modelo para APIs específicas
    let actualModel = modelName || 'gpt-3.5-turbo';
    
    // Conversões específicas de modelo - ATUALIZADO Janeiro 2025
    const modelMappings = {
      // OpenAI
      'gpt-4': 'gpt-4-turbo-2024-04-09',
      'gpt-4-turbo': 'gpt-4-turbo-2024-04-09',
      'gpt-4-turbo-preview': 'gpt-4-0125-preview',
      'gpt-4.1': 'gpt-4-0125-preview',
      'gpt-4o': 'gpt-4o-2024-11-20',
      'gpt-4o-mini': 'gpt-4o-mini-2024-07-18',
      'gpt-3.5-turbo': 'gpt-3.5-turbo-0125',
      
      // Anthropic - NOVOS MODELOS
      'claude-4-opus': 'claude-opus-4-1-20250805',
      'claude-opus-4.1': 'claude-opus-4-1-20250805',
      'claude-opus-4': 'claude-opus-4-20250122',
      'claude-4-sonnet': 'claude-sonnet-4-20250122',
      'claude-sonnet-4': 'claude-sonnet-4-20250122',
      'claude-sonnet-3.7': 'claude-sonnet-3-7-20250122',
      'claude-3-5-sonnet': 'claude-3-5-sonnet-20241022',
      'claude-3-haiku': 'claude-3-haiku-20240307',
      
      // Google
      'gemini-2.0-flash': 'gemini-2.0-flash-exp',
      'gemini-pro': 'gemini-1.5-pro-002',
      'gemini-flash': 'gemini-1.5-flash-002',
      'gemini-1.5-pro': 'gemini-1.5-pro-002',
      'gemini-1.5-flash': 'gemini-1.5-flash-002',
      
      // ZhipuAI
      'glm-4.5': 'glm-4-plus',
      'glm-4-plus': 'glm-4-plus',
      'glm-4-flash': 'glm-4-flash',
      'glm-4': 'glm-4',
      
      // DeepSeek
      'deepseek-chat': 'deepseek-chat',
      'deepseek-coder': 'deepseek-coder'
    };
    
    if (modelMappings[actualModel]) {
      actualModel = modelMappings[actualModel];
    }
    
    debugLog.push({
      step: 'model_mapping',
      originalModel: modelName,
      mappedModel: actualModel,
      provider: provider
    });
    
    // Determine API endpoint based on provider
    const apiEndpoint = provider === 'google' 
      ? `${getLLMEndpoint(provider)}/${actualModel}:generateContent?key=${Deno.env.get('GEMINI_API_KEY')}`
      : getLLMEndpoint(provider);
    
    debugLog.push({
      step: 'api_endpoint',
      endpoint: apiEndpoint
    });
    
    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: getAPIHeaders(provider),
      body: JSON.stringify(formatRequestBody(provider, actualModel, [{ role: 'user', content: prompt }], AGENT_RULES)),
    });
    
    debugLog.push({
      step: 'llm_response',
      status: response.status,
      ok: response.ok
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      debugLog.push({
        step: 'llm_error',
        provider: provider,
        model: actualModel,
        status: response.status,
        error: errorText.substring(0, 500)
      });
      
      // Mensagem de erro específica por provider
      let errorMessage = `Erro ao processar com ${provider}/${actualModel}: `;
      
      if (response.status === 401) {
        errorMessage += 'Chave de API inválida ou expirada';
      } else if (response.status === 429) {
        errorMessage += 'Limite de requisições excedido';
      } else if (response.status === 404) {
        errorMessage += 'Modelo não encontrado ou não disponível';
      } else {
        errorMessage += `Status ${response.status}`;
      }
      
      // Try fallback to OpenAI if other provider fails
      if (provider !== 'openai') {
        debugLog.push({ step: 'attempting_fallback', fallback_to: 'openai/gpt-3.5-turbo' });
        
        try {
          const fallbackResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'gpt-3.5-turbo',
              messages: [{ role: 'system', content: AGENT_RULES }, { role: 'user', content: prompt }],
              temperature: 0.7,
              max_tokens: 4096
            }),
          });
          
          if (fallbackResponse.ok) {
            const fallbackData = await fallbackResponse.json();
            const fallbackText = fallbackData.choices?.[0]?.message?.content || '';
            
            debugLog.push({ step: 'fallback_success' });
            
            // Clean up response and add footer
            let cleanResponse = fallbackText.replace(/📍\s*\*?\*?Explore mais:.*$/s, '').trim();
            if (!cleanResponse.includes('📍 **Explore mais:**')) {
              cleanResponse += FOOTER_TEMPLATE;
            }
            
            return new Response(JSON.stringify({
              response: cleanResponse,
              confidence: 0.7,
              sources: { tabular: sqlResults?.executionResults?.length || 0, conceptual: 0 },
              debugLog,
              fallbackUsed: true
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
        } catch (fallbackError) {
          debugLog.push({ step: 'fallback_failed', error: fallbackError.message });
        }
      }
      
      throw new Error(errorMessage);
    }
    
    const data = await response.json();
    let synthesizedResponse = parseModelResponse(provider, data);
    
    // 🚨 VALIDAÇÃO CRÍTICA - BLOQUEIO DE FABRICAÇÃO 🚨
    if (hasStructuredData && sqlResults?.executionResults?.length > 0) {
      const sqlData = sqlResults.executionResults[0].data;
      let validationPassed = true;
      let validationErrors = [];
      
      // Extrair valores mencionados na resposta para validação
      const response_lower = synthesizedResponse.toLowerCase();
      
      // Validar alturas mencionadas
      const heightMatches = synthesizedResponse.match(/(\d+)\s*metros?/gi);
      if (heightMatches) {
        const mentionedHeights = heightMatches.map(m => parseInt(m.match(/\d+/)[0]));
        const validHeights = sqlData.map(item => item.altura_maxima).filter(h => h !== null);
        
        mentionedHeights.forEach(height => {
          if (!validHeights.includes(height)) {
            validationPassed = false;
            validationErrors.push(`Altura ${height}m não encontrada nos dados (válidas: ${validHeights.join(', ')}m)`);
          }
        });
      }
      
      // Validar coeficientes mencionados
      const coefMatches = synthesizedResponse.match(/(\d+(?:\.\d+)?)/g);
      if (coefMatches) {
        const mentionedCoefs = coefMatches.map(m => parseFloat(m)).filter(c => c < 10); // Filtrar coeficientes plausíveis
        const validBasicCoefs = sqlData.map(item => item.coef_aproveitamento_basico || item.coef_basico_4d).filter(c => c !== null);
        const validMaxCoefs = sqlData.map(item => item.coef_aproveitamento_maximo || item.coef_maximo_4d).filter(c => c !== null);
        const allValidCoefs = [...validBasicCoefs, ...validMaxCoefs];
        
        mentionedCoefs.forEach(coef => {
          if (!allValidCoefs.includes(coef)) {
            // Permitir valores 0 que podem ser legítimos
            if (coef !== 0) {
              validationPassed = false;
              validationErrors.push(`Coeficiente ${coef} não encontrado nos dados (válidos: ${allValidCoefs.join(', ')})`);
            }
          }
        });
      }
      
      // Validar zonas mencionadas
      const zotMatches = synthesizedResponse.match(/ZOT\s*[\d\s\.]+[A-Z]*/gi);
      if (zotMatches) {
        const mentionedZones = zotMatches.map(z => z.replace(/\s+/g, ' ').trim());
        const validZones = sqlData.map(item => item.zona).filter(z => z !== null);
        
        mentionedZones.forEach(zone => {
          const found = validZones.some(validZone => 
            validZone.toLowerCase().includes(zone.toLowerCase().replace('zot', '').trim()) ||
            zone.toLowerCase().includes(validZone.toLowerCase())
          );
          if (!found) {
            validationPassed = false;
            validationErrors.push(`Zona ${zone} não encontrada nos dados (válidas: ${validZones.join(', ')})`);
          }
        });
      }
      
      // SE VALIDAÇÃO FALHOU - USAR FALLBACK SEGURO
      if (!validationPassed) {
        console.error('🚨 FABRICAÇÃO DETECTADA:', validationErrors);
        debugLog.push({ 
          step: 'validation_failed', 
          errors: validationErrors,
          original_response: synthesizedResponse.substring(0, 200) 
        });
        
        // Gerar resposta segura usando apenas dados tabulares
        const safeResponse = generateSafeTabularResponse(sqlData, originalQuery);
        synthesizedResponse = safeResponse;
        
        debugLog.push({ step: 'safe_fallback_used' });
      } else {
        debugLog.push({ step: 'validation_passed' });
      }
    }
    
    // Remover qualquer template duplicado ou mal formatado
    synthesizedResponse = synthesizedResponse.replace(/📍\s*\*?\*?Explore mais:.*$/s, '').trim();
    
    // Sempre adicionar o template correto no final
    synthesizedResponse += FOOTER_TEMPLATE;
    
    return new Response(JSON.stringify({
      response: synthesizedResponse,
      confidence: hasStructuredData ? 0.9 : 0.7,
      sources: {
        tabular: sqlResults?.executionResults?.length || 0,
        conceptual: 0
      },
      model: selectedModel,
      actualModel: actualModel,
      provider: provider,
      debugLog,
      tokensUsed: data.usage?.total_tokens || 0
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Response synthesis error:', error);
    
    return new Response(JSON.stringify({
      response: `Desculpe, ocorreu um erro ao processar sua solicitação. Por favor, tente novamente ou entre em contato pelos canais oficiais.${FOOTER_TEMPLATE}`,
      confidence: 0.1,
      sources: { tabular: 0, conceptual: 0 },
      debugLog,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});