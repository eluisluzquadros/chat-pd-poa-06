// ===================================================
// DESCONTINUADO: Sistema hardcoded substituído por carregamento dinâmico
// ===================================================
// 
// Este arquivo foi substituído pelo sistema dinâmico em:
// supabase/functions/_shared/dynamic-bairros.ts
//
// O novo sistema carrega bairros diretamente da base de dados,
// eliminando inconsistências e garantindo dados sempre atualizados.
//
// MIGRAÇÃO AUTOMÁTICA:
// - VALID_BAIRROS → getBairrosList().validBairros  
// - isValidBairro() → isValidBairro() (async)
// - findSimilarBairros() → findSimilarBairros() (async)
// - getBairroErrorMessage() → getBairroErrorMessage() (async)
//
// ===================================================

// Re-export das funções dinâmicas para compatibilidade
export {
  getBairrosList,
  isValidBairro,
  isKnownInvalidBairro,
  findSimilarBairros,
  getBairroErrorMessage,
  refreshBairrosCache,
  getCacheStats
} from './dynamic-bairros.ts';

// Deprecated: Use getBairrosList() instead
export const VALID_BAIRROS = [];
export const INVALID_BAIRROS = [];
export const AMBIGUOUS_BAIRROS = [];