import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

// Regras do agente
const AGENT_RULES = `Você é o assistente oficial do Plano Diretor de Porto Alegre. Siga estas regras OBRIGATORIAMENTE:

🔴 REGRA FUNDAMENTAL: Ao responder sobre qualquer bairro ou zona, SEMPRE forneça os TRÊS indicadores básicos:
1. **Altura máxima**: X metros
2. **Coeficiente de aproveitamento mínimo (CA básico)**: X.X
3. **Coeficiente de aproveitamento máximo (CA máximo)**: X.X

⚠️ ATENÇÃO ESPECIAL PARA COEFICIENTES:
- Se o valor do coeficiente for um NÚMERO (2, 4, etc), SEMPRE mostre o número
- Se o campo estiver vazio ou for "-", indique como "Não disponível"
- NUNCA diga "Não disponível" quando houver um valor numérico
- Para ZOT 04: CA básico = 2.0, CA máximo = 4.0 (SEMPRE mostre esses valores)

OUTRAS REGRAS IMPORTANTES:

• **Endereços específicos**: NUNCA responda sobre endereços específicos. Sempre pergunte sobre o bairro ou zona.

• **Múltiplas zonas**: Se um bairro tem múltiplas zonas, liste TODAS com seus respectivos indicadores.

• **Formatação clara**: Use listas numeradas e organize as informações de forma clara.

• **Dados corretos**: Use APENAS os dados fornecidos. NUNCA invente valores.

• **Neutralidade**: Mantenha foco técnico, sem posições políticas.

🔴 OBRIGATÓRIO: TODA resposta DEVE terminar EXATAMENTE com este template:

📍 **Explore mais:**
• Mapa com Regras Construtivas: https://bit.ly/3ILdXRA ↗
• Contribua com sugestões: https://bit.ly/4o7AWqb ↗
• Participe da Audiência Pública: https://bit.ly/4oefZKm ↗

💬 **Dúvidas?** planodiretor@portoalegre.rs.gov.br

NÃO ALTERE O TEMPLATE ACIMA. Use-o EXATAMENTE como está.`;

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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const debugLog = [];
  
  try {
    debugLog.push({ step: 'start', time: new Date().toISOString() });
    
    const { originalQuery, analysisResult, sqlResults, vectorResults, model, conversationHistory } = await req.json();
    
    // Determine which model to use for synthesis
    const selectedModel = model || 'openai/gpt-3.5-turbo';
    console.log(`Using model for synthesis: ${selectedModel}`);
    
    // Check if this is a legal/article query
    const isLegalQuery = analysisResult?.metadata?.isLegalQuery || 
                        analysisResult?.intent === 'legal_article' ||
                        /\bartigo\s*\d+|\bart\.?\s*\d+|certificação.*sustentabilidade|4[º°]?\s*distrito|\bluos\b/i.test(originalQuery);
    
    console.log('📚 Response Synthesizer - Legal query?', isLegalQuery);
    
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
    
    // Preparar prompt com regras
    let prompt = '';
    
    // Special handling for legal queries
    if (isLegalQuery) {
      prompt = `Você é um especialista em legislação urbana que SEMPRE cita artigos específicos da LUOS.

MAPEAMENTO OBRIGATÓRIO DE ARTIGOS:
- Certificação em Sustentabilidade Ambiental → Art. 81 - III
- 4º Distrito / Quarto Distrito → Art. 74
- Outorga Onerosa → Art. 86
- ZEIS (Zonas Especiais de Interesse Social) → Art. 92
- Altura máxima de edificação → Art. 81
- Coeficiente de aproveitamento → Art. 82
- Recuos obrigatórios → Art. 83
- Estudo de Impacto de Vizinhança (EIV) → Art. 89
- Áreas de preservação permanente → Art. 95
- Instrumentos de política urbana → Art. 78

FORMATO OBRIGATÓRIO DA RESPOSTA:
**Art. XX [- Inciso se aplicável]**: [Descrição completa do artigo]

`;
      
      // Check for specific legal keywords
      const queryLower = originalQuery.toLowerCase();
      if (queryLower.includes('certificação') || queryLower.includes('sustentabilidade')) {
        prompt += `\n🔴 RESPOSTA OBRIGATÓRIA: **Art. 81 - III**: Os acréscimos definidos em regulamento para projetos que obtenham Certificação em Sustentabilidade Ambiental.\n`;
      } else if ((queryLower.includes('4') && queryLower.includes('distrito')) || 
                 queryLower.includes('4º distrito') || 
                 queryLower.includes('quarto distrito')) {
        prompt += `\n🔴 RESPOSTA OBRIGATÓRIA: **Art. 74**: Os empreendimentos localizados na ZOT 8.2 - 4º Distrito deverão observar as diretrizes específicas do Programa de Revitalização.\n`;
      } else if (queryLower.includes('empreendiment') && (queryLower.includes('4') || queryLower.includes('distrito'))) {
        prompt += `\n🔴 RESPOSTA OBRIGATÓRIA: **Art. 74**: Os empreendimentos localizados na ZOT 8.2 - 4º Distrito deverão observar as diretrizes específicas.\n`;
      }
      
      prompt += `\nPergunta: ${originalQuery}\n`;
    } else {
      prompt = AGENT_RULES + '\n\n';
      prompt += conversationContext;
      prompt += `\nPergunta atual: ${originalQuery}\n\n`;
    }
    
    // Adicionar dados SQL se disponíveis
    let hasStructuredData = false;
    if (sqlResults?.executionResults?.length > 0) {
      hasStructuredData = true;
      prompt += 'Dados encontrados no banco:\n';
      
      sqlResults.executionResults.forEach((result: any, i: number) => {
        if (result.data && result.data.length > 0) {
          // Verificar se são dados de regime urbanístico
          const isRegimeData = result.data[0].hasOwnProperty('altura_maxima') || 
                             result.data[0].hasOwnProperty('coef_aproveitamento_basico') ||
                             result.data[0].hasOwnProperty('coef_aproveitamento_maximo') ||
                             result.data[0].hasOwnProperty('coef_basico_4d');
          
          if (isRegimeData) {
            prompt += `\n**Indicadores do Regime Urbanístico:**\n`;
            prompt += extractBasicIndicators(result.data);
            
            // Adicionar instrução específica para dados com coeficientes
            const hasCoeficients = result.data.some(d => 
              d.coef_aproveitamento_basico !== null || 
              d.coef_aproveitamento_maximo !== null
            );
            
            // Processar valores NULL corretamente
            result.data.forEach(item => {
              if (item.coef_aproveitamento_basico === null) {
                item.coef_aproveitamento_basico = 'Não definido';
              }
              if (item.coef_aproveitamento_maximo === null) {
                item.coef_aproveitamento_maximo = 'Não definido';
              }
            });
            
            if (hasCoeficients) {
              prompt += `\n⚠️ IMPORTANTE: Use os valores EXATOS dos coeficientes quando disponíveis. Só use "Não definido" quando o valor for NULL!\n`;
            }
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
    
    prompt += '\n\n🔴 INSTRUÇÕES OBRIGATÓRIAS:\n';
    prompt += '1. Se a pergunta for sobre um bairro/zona, SEMPRE forneça:\n';
    prompt += '   • Altura máxima: X metros\n';
    prompt += '   • Coeficiente de aproveitamento mínimo (CA básico): X.X\n';
    prompt += '   • Coeficiente de aproveitamento máximo (CA máximo): X.X\n';
    prompt += '2. REGRA DOS COEFICIENTES:\n';
    prompt += '   • Se o dado mostra um NÚMERO (como 2, 4, 1.5), SEMPRE mostre o número\n';
    prompt += '   • Só diga "Não disponível" se o campo estiver como "-" ou vazio\n';
    prompt += '   • Para ZOT 04: SEMPRE tem CA básico = 2 e CA máximo = 4\n';
    prompt += '3. Se um bairro tem múltiplas zonas, liste TODAS com seus indicadores\n';
    prompt += '4. Use os valores EXATOS dos dados fornecidos. NUNCA invente valores!\n';
    prompt += '4. Se perguntado sobre "altura máxima mais alta", use o valor do primeiro registro dos dados\n';
    prompt += '5. NÃO adicione texto desnecessário como "Explore mais:" antes do template\n';
    prompt += '6. Sua resposta DEVE terminar EXATAMENTE com o template fornecido\n';
    prompt += '\nResponda de forma clara, direta e estruturada:';
    
    debugLog.push({
      step: 'prompt_prepared',
      promptLength: prompt.length,
      hasStructuredData
    });
    
    // Chamar o modelo LLM selecionado
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    debugLog.push({ step: 'calling_llm', model: selectedModel });
    
    // Extrair provider e modelo
    const [provider, modelName] = selectedModel.includes('/') 
      ? selectedModel.split('/') 
      : ['openai', selectedModel];
    
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
      
      throw new Error(errorMessage);
    }
    
    const data = await response.json();
    let synthesizedResponse = parseModelResponse(provider, data);
    
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