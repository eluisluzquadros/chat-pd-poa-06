// RAG Configuration for Dify Integration
import { platformSettingsService } from '@/services/platformSettingsService';

export const ragConfig = {
  useDify: import.meta.env.VITE_USE_DIFY_RAG === 'true',
  difyEndpoint: 'agentic-rag-dify',
  localEndpoint: 'agentic-rag'
} as const;

// Cache para evitar múltiplas consultas
let cachedMode: 'dify' | 'local' | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 60000; // 1 minuto

export const getRagEndpoint = async (): Promise<string> => {
  // Verificar cache primeiro
  const now = Date.now();
  if (cachedMode && (now - cacheTimestamp) < CACHE_TTL) {
    return cachedMode === 'dify' ? ragConfig.difyEndpoint : ragConfig.localEndpoint;
  }

  try {
    // Consultar configuração do banco
    const mode = await platformSettingsService.getRagMode();
    
    // Atualizar cache
    cachedMode = mode;
    cacheTimestamp = now;
    
    return mode === 'dify' ? ragConfig.difyEndpoint : ragConfig.localEndpoint;
  } catch (error) {
    console.error('Erro ao obter configuração RAG, usando fallback:', error);
    
    // Fallback para variável de ambiente
    const useDify = import.meta.env.VITE_USE_DIFY_RAG === 'true';
    return useDify ? ragConfig.difyEndpoint : ragConfig.localEndpoint;
  }
};

// Função síncrona para compatibilidade com código existente
export const getRagEndpointSync = () => {
  // Se existe cache válido, usar
  if (cachedMode && (Date.now() - cacheTimestamp) < CACHE_TTL) {
    return cachedMode === 'dify' ? ragConfig.difyEndpoint : ragConfig.localEndpoint;
  }
  
  // Fallback para variável de ambiente
  return ragConfig.useDify ? ragConfig.difyEndpoint : ragConfig.localEndpoint;
};

// Limpar cache (útil após mudanças de configuração)
export const clearRagConfigCache = () => {
  cachedMode = null;
  cacheTimestamp = 0;
};