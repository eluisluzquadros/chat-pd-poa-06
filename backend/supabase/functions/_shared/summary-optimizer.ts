/**
 * SUMMARY OPTIMIZER MODULE
 * Otimiza a geração de resumos com prompts específicos
 * Melhora a qualidade de resumos de conteúdo hierárquico
 */

export interface SummaryOptions {
  maxWords?: number;
  language?: 'pt' | 'en';
  style?: 'technical' | 'simple' | 'executive';
  includeArticles?: boolean;
}

/**
 * Gera prompt otimizado para resumos
 */
export function generateSummaryPrompt(
  content: string,
  query: string,
  options: SummaryOptions = {}
): string {
  const {
    maxWords = 100,
    language = 'pt',
    style = 'technical',
    includeArticles = true
  } = options;
  
  // Detectar tipo de resumo solicitado
  const isTitleSummary = query.toLowerCase().includes('título');
  const isPartSummary = query.toLowerCase().includes('parte');
  const isChapterSummary = query.toLowerCase().includes('capítulo');
  const isGeneralSummary = query.toLowerCase().includes('resuma') || 
                           query.toLowerCase().includes('resumo');
  
  // Construir prompt específico
  let prompt = '';
  
  if (language === 'pt') {
    if (isTitleSummary || isPartSummary || isChapterSummary) {
      prompt = `Analise o conteúdo a seguir e forneça um resumo estruturado.

INSTRUÇÕES ESPECÍFICAS:
1. Identifique os principais temas e objetivos
2. Liste os artigos mais importantes (se houver)
3. Destaque princípios e diretrizes fundamentais
4. Use linguagem técnica mas clara
5. Mantenha o resumo em até ${maxWords} palavras

CONTEÚDO A RESUMIR:
${content}

FORMATO DO RESUMO:
- Tema principal: [descreva em uma linha]
- Objetivos: [liste os principais]
- Artigos relevantes: [se aplicável]
- Pontos-chave: [destaque os mais importantes]

Gere o resumo agora:`;
    } else if (isGeneralSummary) {
      prompt = `Resuma o seguinte conteúdo em até ${maxWords} palavras, mantendo os pontos mais importantes:

${content}

Resumo:`;
    } else {
      // Query específica
      prompt = `Baseado no conteúdo a seguir, responda especificamente: "${query}"

${content}

Resposta:`;
    }
  } else {
    // English prompts
    prompt = `Summarize the following content in up to ${maxWords} words:

${content}

Summary:`;
  }
  
  return prompt;
}

/**
 * Processa e otimiza conteúdo antes de resumir
 */
export function preprocessContentForSummary(
  articles: any[],
  hierarchyType?: string
): string {
  if (!articles || articles.length === 0) {
    return '';
  }
  
  // Ordenar artigos por número
  const sorted = articles.sort((a, b) => {
    const numA = parseInt(a.article_number) || 0;
    const numB = parseInt(b.article_number) || 0;
    return numA - numB;
  });
  
  // Agrupar conteúdo de forma estruturada
  let structured = '';
  
  if (hierarchyType) {
    structured += `${hierarchyType.toUpperCase()}\n\n`;
  }
  
  // Adicionar artigos com contexto
  sorted.forEach(article => {
    if (article.article_number) {
      structured += `Art. ${article.article_number}`;
      
      if (article.title) {
        structured += ` - ${article.title}`;
      }
      
      structured += '\n';
      
      if (article.full_content) {
        // Pegar primeiro parágrafo ou primeiras 200 palavras
        const preview = article.full_content
          .split('\n')[0]
          .substring(0, 500);
        structured += `${preview}\n\n`;
      }
    }
  });
  
  return structured;
}

/**
 * Valida qualidade do resumo gerado
 */
export function validateSummaryQuality(
  summary: string,
  query: string,
  minLength: number = 50
): {
  isValid: boolean;
  issues: string[];
} {
  const issues: string[] = [];
  
  // Verificar comprimento mínimo
  if (summary.length < minLength) {
    issues.push('Resumo muito curto');
  }
  
  // Verificar se é resposta genérica
  const genericPhrases = [
    'não foi possível',
    'não há informações',
    'desculpe',
    'erro ao processar'
  ];
  
  const hasGenericContent = genericPhrases.some(phrase => 
    summary.toLowerCase().includes(phrase)
  );
  
  if (hasGenericContent) {
    issues.push('Contém resposta genérica');
  }
  
  // Verificar se responde à query
  const queryKeywords = query
    .toLowerCase()
    .split(' ')
    .filter(w => w.length > 3);
  
  const summaryLower = summary.toLowerCase();
  const matchedKeywords = queryKeywords.filter(kw => 
    summaryLower.includes(kw)
  );
  
  if (matchedKeywords.length < queryKeywords.length / 2) {
    issues.push('Não responde adequadamente à pergunta');
  }
  
  // Verificar estrutura (para resumos hierárquicos)
  if (query.includes('título') || query.includes('parte')) {
    const hasStructure = 
      summary.includes('Art.') || 
      summary.includes('Artigo') ||
      summary.includes('objetivo') ||
      summary.includes('princípio');
    
    if (!hasStructure) {
      issues.push('Falta estrutura adequada para conteúdo hierárquico');
    }
  }
  
  return {
    isValid: issues.length === 0,
    issues
  };
}

/**
 * Gera fallback para resumos que falharam
 */
export async function generateFallbackSummary(
  supabase: any,
  query: string,
  documentType: 'PDUS' | 'LUOS' | 'COE' = 'PDUS'
): Promise<string> {
  // Estratégia de fallback baseada no tipo de query
  const queryLower = query.toLowerCase();
  
  // Para Título 1 especificamente
  if (queryLower.includes('título 1') || queryLower.includes('título i')) {
    const { data: articles } = await supabase
      .from('legal_articles')
      .select('article_number, title, full_content')
      .eq('document_type', documentType)
      .gte('article_number', 1)
      .lte('article_number', 10)
      .order('article_number');
    
    if (articles && articles.length > 0) {
      let summary = `O Título I do ${documentType} estabelece os fundamentos e princípios gerais:\n\n`;
      
      articles.forEach(a => {
        summary += `• Art. ${a.article_number}: `;
        if (a.title) {
          summary += a.title;
        } else if (a.full_content) {
          summary += a.full_content.substring(0, 100) + '...';
        }
        summary += '\n';
      });
      
      return summary;
    }
  }
  
  // Para outros títulos/partes
  const hierarchyMap: { [key: string]: [number, number] } = {
    'título 2': [11, 20],
    'título ii': [11, 20],
    'título 3': [21, 30],
    'título iii': [21, 30],
    'parte 1': [1, 50],
    'parte i': [1, 50],
    'parte 2': [51, 100],
    'parte ii': [51, 100]
  };
  
  for (const [key, range] of Object.entries(hierarchyMap)) {
    if (queryLower.includes(key)) {
      const { data: articles } = await supabase
        .from('legal_articles')
        .select('article_number, title, full_content')
        .eq('document_type', documentType)
        .gte('article_number', range[0])
        .lte('article_number', range[1])
        .order('article_number')
        .limit(10);
      
      if (articles && articles.length > 0) {
        const structured = preprocessContentForSummary(articles, key);
        return `Resumo do ${key} do ${documentType}:\n\n${structured}`;
      }
    }
  }
  
  // Fallback genérico
  return `Para um resumo completo do conteúdo solicitado ("${query}"), consulte os artigos específicos do ${documentType}.`;
}