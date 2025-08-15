// Lista oficial de bairros válidos em Porto Alegre
// Fonte: regime_urbanistico table

export const VALID_BAIRROS = [
  "AGRONOMIA",
  "ANCHIETA", 
  "ARQUIPÉLAGO",
  "AUXILIADORA",
  "AZENHA",
  "BELA VISTA",
  "BELÉM NOVO",
  "BELÉM VELHO",
  "BOA VISTA",
  "BOM FIM",
  "BOM JESUS",
  "CAMAQUÃ",
  "CAMPO NOVO",
  "CASCATA",
  "CAVALHADA",
  "CENTRO HISTÓRICO",
  "CHÁCARA DAS PEDRAS",
  "CHAPÉU DO SOL",
  "CIDADE BAIXA",
  "CORONEL APARÍCIO BORGES",
  "CRISTAL",
  "CRISTO REDENTOR",
  "ESPÍRITO SANTO",
  "FARRAPOS",
  "FARROUPILHA",
  "FLORESTA",
  "GLÓRIA",
  "GUARUJÁ",
  "HIGIENÓPOLIS",
  "HIPICA",
  "HUMAITÁ",
  "INDEPENDÊNCIA",
  "IPANEMA",
  "JARDIM BOTÂNICO",
  "JARDIM CARVALHO",
  "JARDIM DO SALSO",
  "JARDIM EUROPA",
  "JARDIM FLORESTA",
  "JARDIM ISABEL",
  "JARDIM ITÚ",
  "JARDIM LEOPOLDINA",
  "JARDIM LINDÓIA",
  "JARDIM SABARÁ",
  "JARDIM SÃO PEDRO",
  "JARDIM VILA NOVA",
  "LAGEADO",
  "LAMI",
  "LOMBA DO PINHEIRO",
  "MARIO QUINTANA",
  "MEDIANEIRA",
  "MENINO DEUS",
  "MOINHOS DE VENTO",
  "MONT'SERRAT",
  "NAVEGANTES",
  "NONOAI",
  "PARTENON",
  "PASSO D'AREIA",
  "PASSO DAS PEDRAS",
  "PEDRA REDONDA",
  "PETRÓPOLIS",
  "PONTA GROSSA",
  "PRAIA DE BELAS",
  "RESTINGA",
  "RIO BRANCO",
  "RUBEM BERTA",
  "SANTA CECÍLIA",
  "SANTA MARIA GORETTI",
  "SANTA TEREZA",
  "SANTANA",
  "SANTO ANTÔNIO",
  "SÃO GERALDO",
  "SÃO JOÃO",
  "SÃO JOSÉ",
  "SÃO SEBASTIÃO",
  "SARANDI",
  "SERRARIA",
  "TERESÓPOLIS",
  "TRÊS FIGUEIRAS",
  "TRISTEZA",
  "VILA ASSUNÇÃO",
  "VILA CONCEIÇÃO",
  "VILA IPIRANGA",
  "VILA JARDIM",
  "VILA JOÃO PESSOA",
  "VILA NOVA"
];

// Bairros que NÃO existem mas são comumente confundidos
export const INVALID_BAIRROS = [
  "BOA VISTA DO SUL",
  "VILA NOVA DO SUL",
  "CENTRO",  // O correto é CENTRO HISTÓRICO
  "PORTO ALEGRE"  // É a cidade, não um bairro
];

// Bairros que podem causar confusão (necessitam matching exato)
export const AMBIGUOUS_BAIRROS = [
  { name: "BOA VISTA", notToBeMistakenWith: ["BOA VISTA DO SUL"] },
  { name: "VILA NOVA", notToBeMistakenWith: ["VILA NOVA DO SUL"] },
  { name: "CENTRO HISTÓRICO", notToBeMistakenWith: ["CENTRO"] }
];

/**
 * Valida se um bairro existe no banco de dados
 */
export function isValidBairro(bairroName: string): boolean {
  const normalized = bairroName.toUpperCase().trim();
  return VALID_BAIRROS.includes(normalized);
}

/**
 * Verifica se um nome é um bairro inválido conhecido
 */
export function isKnownInvalidBairro(bairroName: string): boolean {
  const normalized = bairroName.toUpperCase().trim();
  return INVALID_BAIRROS.includes(normalized);
}

/**
 * Encontra bairros similares para sugestão
 */
export function findSimilarBairros(bairroName: string, maxSuggestions = 3): string[] {
  const normalized = bairroName.toUpperCase().trim();
  const suggestions: string[] = [];
  
  // Busca por bairros que contêm o termo
  for (const bairro of VALID_BAIRROS) {
    if (bairro.includes(normalized) || normalized.includes(bairro)) {
      suggestions.push(bairro);
      if (suggestions.length >= maxSuggestions) break;
    }
  }
  
  // Se não encontrou, busca por início similar
  if (suggestions.length === 0) {
    const firstWord = normalized.split(' ')[0];
    for (const bairro of VALID_BAIRROS) {
      if (bairro.startsWith(firstWord)) {
        suggestions.push(bairro);
        if (suggestions.length >= maxSuggestions) break;
      }
    }
  }
  
  return suggestions;
}

/**
 * Retorna mensagem de erro apropriada para bairro inválido
 */
export function getBairroErrorMessage(bairroName: string): string {
  const normalized = bairroName.toUpperCase().trim();
  
  if (normalized === "BOA VISTA DO SUL" || normalized === "VILA NOVA DO SUL") {
    return `O bairro "${bairroName}" não existe em Porto Alegre. Você quis dizer "${normalized.replace(' DO SUL', '')}"?`;
  }
  
  if (normalized === "CENTRO") {
    return `O bairro correto é "Centro Histórico", não apenas "Centro".`;
  }
  
  if (normalized === "PORTO ALEGRE") {
    return `Porto Alegre é o nome da cidade, não de um bairro específico. Qual bairro você gostaria de consultar?`;
  }
  
  const suggestions = findSimilarBairros(bairroName);
  if (suggestions.length > 0) {
    return `O bairro "${bairroName}" não foi encontrado. Você quis dizer: ${suggestions.join(', ')}?`;
  }
  
  return `O bairro "${bairroName}" não existe no banco de dados de Porto Alegre.`;
}