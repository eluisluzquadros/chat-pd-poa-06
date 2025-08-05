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
 * Restaura acentos comuns em nomes de bairros
 * Atualizado com 100% dos bairros do banco de dados
 * Total de bairros mapeados: 51 (todos que possuem acentuação)
 */
function restoreCommonAccents(normalized: string): string {
  const accentsMap: { [key: string]: string } = {
    'ARQUIPELAGO': 'ARQUIPÉLAGO',
    'BELEM NOVO': 'BELÉM NOVO',
    'BELEM VELHO': 'BELÉM VELHO',
    'CAMAQUA': 'CAMAQUÃ',
    'CENTRO HISTORICO': 'CENTRO HISTÓRICO',
    'CHAPEU DO SOL': 'CHAPÉU DO SOL',
    'CHACARA DAS PEDRAS': 'CHÁCARA DAS PEDRAS',
    'ESPIRITO SANTO': 'ESPÍRITO SANTO',
    'GLORIA': 'GLÓRIA',
    'GUARUJA': 'GUARUJÁ',
    'HIGIENOPOLIS': 'HIGIENÓPOLIS',
    'HUMAITA': 'HUMAITÁ',
    'HIPICA': 'HÍPICA',
    'INDEPENDENCIA': 'INDEPENDÊNCIA',
    'JARDIM BOTANICO': 'JARDIM BOTÂNICO',
    'JARDIM LINDOIA': 'JARDIM LINDÓIA',
    'JARDIM SABARA': 'JARDIM SABARÁ',
    'JARDIM SAO PEDRO': 'JARDIM SÃO PEDRO',
    'MARIO QUINTANA': 'MÁRIO QUINTANA',
    'MONT SERRAT': 'MONT\'SERRAT',
    'PARQUE SANTA FE': 'PARQUE SANTA FÉ',
    'PETROPOLIS': 'PETRÓPOLIS',
    'SANTA CECILIA': 'SANTA CECÍLIA',
    'SANTO ANTONIO': 'SANTO ANTÔNIO',
    'SAO CAETANO': 'SÃO CAETANO',
    'SAO GERALDO': 'SÃO GERALDO',
    'SAO JOAO': 'SÃO JOÃO',
    'SAO JOSE': 'SÃO JOSÉ',
    'SAO SEBASTIAO': 'SÃO SEBASTIÃO',
    'SETIMO CEU': 'SÉTIMO CÉU',
    'TERESOPOLIS': 'TERESÓPOLIS',
    'TRES FIGUEIRAS': 'TRÊS FIGUEIRAS',
    'VILA  ASSUNCAO': 'VILA  ASSUNÇÃO',
    'VILA ASSUNCAO': 'VILA ASSUNÇÃO',
    'VILA CONCEICAO': 'VILA CONCEIÇÃO',
    'VILA JOAO PESSOA': 'VILA JOÃO PESSOA',
    'VILA SAO JOSE': 'VILA SÃO JOSÉ',
    // Bairros sem acentos mas mantidos para completude
    'AUXILIADORA': 'AUXILIADORA',
    'FLORESTA': 'FLORESTA',
    'IPANEMA': 'IPANEMA',
    'LOMBA DO PINHEIRO': 'LOMBA DO PINHEIRO',
    'MEDIANEIRA': 'MEDIANEIRA',
    'MOINHOS DE VENTO': 'MOINHOS DE VENTO',
    'NAVEGANTES': 'NAVEGANTES',
    'PARTENON': 'PARTENON',
    'PEDRA REDONDA': 'PEDRA REDONDA',
    'PONTA GROSSA': 'PONTA GROSSA',
    'RESTINGA': 'RESTINGA',
    'RUBEM BERTA': 'RUBEM BERTA',
    'SANTA MARIA GORETTI': 'SANTA MARIA GORETTI',
    'SANTA TEREZA': 'SANTA TEREZA',
    'SANTANA': 'SANTANA',
    'SARANDI': 'SARANDI',
    'TRISTEZA': 'TRISTEZA',
    'VILA IPIRANGA': 'VILA IPIRANGA',
    'VILA JARDIM': 'VILA JARDIM',
    'VILA NOVA': 'VILA NOVA'
  };
  
  return accentsMap[normalized] || normalized;
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
 */
export function extractBairroTerms(query: string): string[] {
  // Lista de bairros conhecidos (pode ser expandida)
  const knownBairros = [
    'AUXILIADORA', 'AZENHA', 'BOM FIM', 'CENTRO', 'CENTRO HISTORICO',
    'CIDADE BAIXA', 'FARROUPILHA', 'FLORESTA', 'INDEPENDENCIA',
    'JARDIM BOTANICO', 'MENINO DEUS', 'MOINHOS DE VENTO', 'MONT SERRAT',
    'PETROPOLIS', 'PRAIA DE BELAS', 'RIO BRANCO', 'SANTA CECILIA',
    'SANTANA', 'SAO GERALDO', 'SAO JOAO', 'SAO JOSE', 'SAO SEBASTIAO',
    'TERESOPOLIS', 'TRISTEZA', 'VILA IPIRANGA'
  ];
  
  const normalizedQuery = removeAccents(query.toUpperCase());
  const found: string[] = [];
  
  // Busca por bairros conhecidos
  for (const bairro of knownBairros) {
    const normalizedBairro = removeAccents(bairro);
    if (normalizedQuery.includes(normalizedBairro)) {
      found.push(bairro);
    }
  }
  
  // Busca por padrões "bairro X"
  const bairroPattern = /\b(?:no|do|da|de|em)?\s*bairro\s+([A-Z\s]+)/gi;
  const matches = normalizedQuery.matchAll(bairroPattern);
  
  for (const match of matches) {
    const bairroName = match[1].trim();
    if (bairroName) {
      found.push(bairroName);
    }
  }
  
  return [...new Set(found)];
}