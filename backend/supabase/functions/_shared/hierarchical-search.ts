/**
 * HIERARCHICAL SEARCH MODULE
 * Melhora busca por estruturas hierárquicas (Título, Parte, Capítulo, Seção)
 * Resolve o problema de resumos hierárquicos
 */

export interface HierarchicalSearchOptions {
  query: string;
  documentType?: 'PDUS' | 'LUOS' | 'COE';
  limit?: number;
}

/**
 * Normaliza referências hierárquicas
 * Converte "Título 1", "Título I", "TÍTULO PRIMEIRO" para formato padrão
 */
function normalizeHierarchicalReference(text: string): string[] {
  const normalized = text.toLowerCase().trim();
  const variants: string[] = [];
  
  // Detectar tipo de hierarquia
  const hierarchyTypes = ['título', 'parte', 'capítulo', 'seção', 'subseção'];
  let detectedType = '';
  
  for (const type of hierarchyTypes) {
    if (normalized.includes(type)) {
      detectedType = type;
      break;
    }
  }
  
  if (!detectedType) return [normalized];
  
  // Extrair número (se houver)
  const numberMatch = normalized.match(/(\d+|i+|primeiro|segundo|terceiro|quarto|quinto)/i);
  
  if (numberMatch) {
    const number = numberMatch[1];
    
    // Adicionar variantes
    variants.push(`${detectedType} ${number}`);
    variants.push(`${detectedType.toUpperCase()} ${number.toUpperCase()}`);
    
    // Converter números arábicos para romanos e vice-versa
    const arabicToRoman: { [key: string]: string } = {
      '1': 'I', '2': 'II', '3': 'III', '4': 'IV', '5': 'V',
      '6': 'VI', '7': 'VII', '8': 'VIII', '9': 'IX', '10': 'X'
    };
    
    const romanToArabic: { [key: string]: string } = {
      'i': '1', 'ii': '2', 'iii': '3', 'iv': '4', 'v': '5',
      'vi': '6', 'vii': '7', 'viii': '8', 'ix': '9', 'x': '10'
    };
    
    if (arabicToRoman[number]) {
      variants.push(`${detectedType} ${arabicToRoman[number]}`);
      variants.push(`${detectedType.toUpperCase()} ${arabicToRoman[number]}`);
    }
    
    if (romanToArabic[number.toLowerCase()]) {
      variants.push(`${detectedType} ${romanToArabic[number.toLowerCase()]}`);
    }
    
    // Adicionar formas por extenso
    const extenso: { [key: string]: string } = {
      '1': 'primeiro', '2': 'segundo', '3': 'terceiro',
      '4': 'quarto', '5': 'quinto'
    };
    
    if (extenso[number]) {
      variants.push(`${detectedType} ${extenso[number]}`);
    }
  }
  
  // Adicionar forma sem espaço
  variants.forEach(v => {
    variants.push(v.replace(' ', ''));
  });
  
  return [...new Set(variants)];
}

/**
 * Busca conteúdo hierárquico
 */
export async function searchHierarchicalContent(
  supabase: any,
  options: HierarchicalSearchOptions
): Promise<any[]> {
  const { query, documentType, limit = 10 } = options;
  
  // Gerar variantes da busca
  const variants = normalizeHierarchicalReference(query);
  
  // Estratégia 1: Buscar em títulos de artigos
  const titleSearches = variants.map(variant =>
    supabase
      .from('legal_articles')
      .select('*')
      .ilike('title', `%${variant}%`)
      .eq(documentType ? 'document_type' : '', documentType || '')
      .limit(limit)
  );
  
  // Estratégia 2: Buscar no conteúdo completo
  const contentSearches = variants.map(variant =>
    supabase
      .from('legal_articles')
      .select('*')
      .ilike('full_content', `%${variant}%`)
      .eq(documentType ? 'document_type' : '', documentType || '')
      .limit(limit)
  );
  
  // Estratégia 3: Buscar na tabela de hierarquia
  const hierarchySearches = variants.map(variant =>
    supabase
      .from('legal_hierarchy')
      .select('*')
      .or(`hierarchy_name.ilike.%${variant}%,hierarchy_type.ilike.%${variant}%`)
      .eq(documentType ? 'document_type' : '', documentType || '')
      .limit(limit)
  );
  
  // Executar todas as buscas em paralelo
  const allSearches = [...titleSearches, ...contentSearches, ...hierarchySearches];
  const results = await Promise.all(allSearches.map(s => s.catch(() => ({ data: [] }))));
  
  // Combinar e deduplicar resultados
  const allData = results.flatMap(r => r.data || []);
  const uniqueResults = Array.from(
    new Map(allData.map(item => [item.id, item])).values()
  );
  
  return uniqueResults.slice(0, limit);
}

/**
 * Constrói resumo de conteúdo hierárquico
 */
export async function buildHierarchicalSummary(
  supabase: any,
  hierarchyReference: string,
  documentType: 'PDUS' | 'LUOS' | 'COE' = 'PDUS'
): Promise<string> {
  // Buscar conteúdo relacionado
  const results = await searchHierarchicalContent(supabase, {
    query: hierarchyReference,
    documentType,
    limit: 20
  });
  
  if (results.length === 0) {
    // Fallback: buscar por range de artigos
    // Título I geralmente corresponde aos primeiros artigos
    const rangeMap: { [key: string]: [number, number] } = {
      'título 1': [1, 10],
      'título i': [1, 10],
      'título 2': [11, 20],
      'título ii': [11, 20],
      'parte i': [1, 50],
      'parte 1': [1, 50]
    };
    
    const normalized = hierarchyReference.toLowerCase();
    const range = rangeMap[normalized];
    
    if (range) {
      const { data: articles } = await supabase
        .from('legal_articles')
        .select('article_number, title, full_content')
        .eq('document_type', documentType)
        .gte('article_number', range[0])
        .lte('article_number', range[1])
        .order('article_number');
      
      if (articles && articles.length > 0) {
        // Construir resumo baseado nos artigos encontrados
        const summary = articles.map(a => 
          `Art. ${a.article_number}: ${a.title || a.full_content?.substring(0, 100)}`
        ).join('\n');
        
        return `Resumo do ${hierarchyReference} do ${documentType}:\n\n${summary}`;
      }
    }
  }
  
  // Construir resumo com os resultados encontrados
  if (results.length > 0) {
    const content = results.map(r => {
      if (r.article_number) {
        return `Art. ${r.article_number}: ${r.title || r.full_content?.substring(0, 150)}`;
      } else if (r.hierarchy_name) {
        return `${r.hierarchy_type}: ${r.hierarchy_name}`;
      }
      return r.full_content?.substring(0, 200) || '';
    }).filter(c => c).join('\n\n');
    
    return `${hierarchyReference} do ${documentType}:\n\n${content}`;
  }
  
  return `Não foi possível localizar especificamente o "${hierarchyReference}" no ${documentType}.`;
}

/**
 * Detecta se a query é sobre conteúdo hierárquico
 */
export function isHierarchicalQuery(query: string): boolean {
  const hierarchicalTerms = [
    'título', 'titulo',
    'parte',
    'capítulo', 'capitulo',
    'seção', 'secao',
    'subseção', 'subsecao',
    'livro',
    'artigos de', 'artigos do'
  ];
  
  const queryLower = query.toLowerCase();
  return hierarchicalTerms.some(term => queryLower.includes(term));
}

/**
 * Extrai referência hierárquica da query
 */
export function extractHierarchicalReference(query: string): {
  type: string;
  number: string;
  documentType?: string;
} | null {
  const patterns = [
    /(?:resuma?|resumo|conteúdo|o que diz)\s+(?:o\s+)?(\w+)\s+(\d+|[ivx]+|primeiro|segundo|terceiro)\s+(?:do\s+|da\s+)?(pdus|luos|coe)?/i,
    /(\w+)\s+(\d+|[ivx]+)\s+(?:do\s+|da\s+)?(pdus|luos|coe)?/i
  ];
  
  for (const pattern of patterns) {
    const match = query.match(pattern);
    if (match) {
      return {
        type: match[1].toLowerCase(),
        number: match[2].toLowerCase(),
        documentType: match[3]?.toUpperCase() as 'PDUS' | 'LUOS' | 'COE' | undefined
      };
    }
  }
  
  return null;
}