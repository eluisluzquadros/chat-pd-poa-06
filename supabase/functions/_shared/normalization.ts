/**
 * Módulo de normalização para tratar variações semânticas de termos
 */

/**
 * Normaliza nomes de zonas (ZOT 07, ZOT7, ZONA 07, etc)
 */
export function normalizeZoneName(input: string): string {
  if (!input) return '';
  
  // Remove espaços extras e converte para maiúsculas
  let normalized = input.trim().toUpperCase();
  
  // Substitui variações comuns
  normalized = normalized
    .replace(/\bZONA\s*/gi, 'ZOT ')
    .replace(/\bZOT\s*0?(\d+)/gi, 'ZOT $1') // Remove zeros à esquerda
    .replace(/\s+/g, ' ') // Normaliza espaços
    .trim();
  
  // Adiciona padding de zero se necessário (ZOT 7 -> ZOT 07)
  const zotMatch = normalized.match(/^ZOT\s+(\d+)$/);
  if (zotMatch) {
    const number = parseInt(zotMatch[1]);
    if (number < 10) {
      normalized = `ZOT 0${number}`;
    } else {
      normalized = `ZOT ${number}`;
    }
  }
  
  return normalized;
}

/**
 * Normaliza nomes de bairros (remove acentos, normaliza case)
 */
export function normalizeBairroName(input: string): string {
  if (!input) return '';
  
  // Remove texto desnecessário
  let normalized = input
    .replace(/\b(no|do|da|de|em)\s+bairro\s+/gi, '')
    .replace(/\bbairro\s+/gi, '')
    .trim();
  
  // Converte para maiúsculas e remove acentos
  normalized = removeAccents(normalized.toUpperCase());
  
  return normalized;
}

/**
 * Remove acentos e caracteres especiais
 */
export function removeAccents(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacríticos
    .replace(/ç/gi, 'C')
    .replace(/ñ/gi, 'N');
}

/**
 * Cria padrões SQL para busca flexível de zonas
 */
export function createZoneSearchPatterns(zoneName: string): string[] {
  const normalized = normalizeZoneName(zoneName);
  const patterns: string[] = [normalized];
  
  // Extrai o número da zona
  const match = normalized.match(/ZOT\s+0?(\d+)/);
  if (match) {
    const number = match[1];
    patterns.push(
      `ZOT ${number}`,
      `ZOT 0${number}`,
      `ZOT${number}`,
      `ZOT0${number}`,
      `ZONA ${number}`,
      `ZONA 0${number}`
    );
  }
  
  // Remove duplicatas
  return [...new Set(patterns)];
}

/**
 * Cria padrões SQL para busca flexível de bairros
 */
export function createBairroSearchPatterns(bairroName: string): string[] {
  const normalized = normalizeBairroName(bairroName);
  const patterns: string[] = [normalized];
  
  // Adiciona variações com e sem acentos
  const withAccents = restoreCommonAccents(normalized);
  if (withAccents !== normalized) {
    patterns.push(withAccents);
  }
  
  // Remove duplicatas
  return [...new Set(patterns)];
}

/**
 * Sistema Universal de Busca Multi-Layer para Bairros
 * Remove hardcodes e trata todos os 94 bairros de forma consistente
 */
export function createUniversalBairroSearch(bairroName: string): string[] {
  if (!bairroName) return [];
  
  const cleanName = bairroName.trim();
  const queries: string[] = [];
  
  // Layer 1: Busca exata (preserva case original)
  queries.push(`UPPER(bairro) = UPPER('${cleanName}')`);
  
  // Layer 2: Busca com normalização de acentos
  const normalized = removeAccents(cleanName.toUpperCase());
  if (normalized !== cleanName.toUpperCase()) {
    queries.push(`UPPER(bairro) = '${normalized}'`);
  }
  
  // Layer 3: Busca ILIKE flexível
  queries.push(`bairro ILIKE '%${cleanName}%'`);
  if (normalized !== cleanName.toUpperCase()) {
    queries.push(`bairro ILIKE '%${normalized}%'`);
  }
  
  // Layer 4: Busca por similarity (fuzzy)
  queries.push(`similarity(bairro, '${cleanName}') > 0.6`);
  
  // Layer 5: Busca por partes de nomes compostos
  const parts = cleanName.split(/\s+/);
  if (parts.length > 1) {
    for (const part of parts) {
      if (part.length > 2) { // Evita preposições
        queries.push(`bairro ILIKE '%${part}%'`);
      }
    }
  }
  
  return [...new Set(queries)]; // Remove duplicatas
}

/**
 * Gera SQL completo com busca multi-layer para bairros
 * Combina múltiplas estratégias em uma única query com UNION
 */
export function generateUniversalBairroSQL(bairroName: string, limit: number = 20): string {
  const searchConditions = createUniversalBairroSearch(bairroName);
  
  const baseQuery = `
    SELECT DISTINCT bairro, zona, altura_max_m, ca_max, ca_basico, to_max, taxa_permeabilidade,
           recuo_jardim_m, recuo_lateral_m, recuo_fundos_m
    FROM regime_urbanistico 
    WHERE `;
  
  // Combina condições com OR para máxima flexibilidade
  const combinedConditions = searchConditions.join(' OR ');
  
  return `${baseQuery}(${combinedConditions}) ORDER BY bairro, zona LIMIT ${limit}`;
}

/**
 * Função de validação para testar cobertura de todos os bairros
 * Identifica padrões de falha automaticamente
 */
export function validateBairroSearch(bairroName: string): {
  searchQueries: string[];
  expectedMatches: string[];
  debugInfo: any;
} {
  const queries = createUniversalBairroSearch(bairroName);
  const normalized = removeAccents(bairroName.toUpperCase());
  
  return {
    searchQueries: queries,
    expectedMatches: [bairroName, normalized],
    debugInfo: {
      originalName: bairroName,
      normalizedName: normalized,
      queryCount: queries.length,
      timestamp: new Date().toISOString()
    }
  };
}

/**
 * Extrai termos relacionados a zonas de uma query
 */
export function extractZoneTerms(query: string): string[] {
  const zonePatterns = [
    /\b(?:ZOT|ZONA)\s*0?\d+/gi,
    /\bZOT\d+/gi,
    /\bZONA\d+/gi
  ];
  
  const matches: string[] = [];
  
  for (const pattern of zonePatterns) {
    const found = query.match(pattern);
    if (found) {
      matches.push(...found);
    }
  }
  
  return matches.map(m => normalizeZoneName(m));
}

/**
 * Extrai termos relacionados a bairros de uma query
 * Sistema universal sem hardcodes específicos
 */
export function extractBairroTerms(query: string): string[] {
  const normalizedQuery = removeAccents(query.toUpperCase());
  const found: string[] = [];
  
  // Busca por padrões "bairro X"
  const bairroPattern = /\b(?:no|do|da|de|em)?\s*bairro\s+([A-ZÁÀÂÃÉÊÍÓÔÕÚÇ\s]+)/gi;
  const matches = query.matchAll(bairroPattern);
  
  for (const match of matches) {
    const bairroName = match[1].trim();
    if (bairroName) {
      found.push(bairroName);
    }
  }
  
  // Busca por nomes isolados que possam ser bairros (queries curtas)
  const words = query.trim().split(/\s+/);
  if (words.length <= 3) {
    const potentialBairro = words.join(' ').replace(/[.?!]$/, '').trim();
    if (potentialBairro.length > 2) {
      found.push(potentialBairro);
    }
  }
  
  return [...new Set(found)];
}

/**
 * Cria função de teste para validar todos os 94 bairros
 * Identifica quais bairros não estão sendo encontrados
 */
export function createBairroValidationSQL(): string {
  return `
    WITH test_bairros AS (
      SELECT DISTINCT bairro FROM regime_urbanistico ORDER BY bairro
    ),
    search_tests AS (
      SELECT 
        bairro,
        -- Teste 1: Busca exata
        (SELECT COUNT(*) FROM regime_urbanistico r1 WHERE UPPER(r1.bairro) = UPPER(test_bairros.bairro)) as exact_match,
        -- Teste 2: Busca normalizada
        (SELECT COUNT(*) FROM regime_urbanistico r2 WHERE bairro ILIKE '%' || test_bairros.bairro || '%') as ilike_match,
        -- Teste 3: Busca fuzzy
        (SELECT COUNT(*) FROM regime_urbanistico r3 WHERE similarity(r3.bairro, test_bairros.bairro) > 0.6) as fuzzy_match
      FROM test_bairros
    )
    SELECT 
      bairro,
      exact_match > 0 as exact_works,
      ilike_match > 0 as ilike_works, 
      fuzzy_match > 0 as fuzzy_works,
      CASE 
        WHEN exact_match = 0 AND ilike_match = 0 AND fuzzy_match = 0 THEN 'FAILING'
        WHEN exact_match = 0 AND ilike_match = 0 THEN 'FUZZY_ONLY'
        WHEN exact_match = 0 THEN 'ILIKE_ONLY'
        ELSE 'WORKING'
      END as status
    FROM search_tests
    ORDER BY status DESC, bairro;
  `;
}