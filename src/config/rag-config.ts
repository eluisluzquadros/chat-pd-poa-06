// Enhanced RAG Configuration with Agent Support
import { platformSettingsService } from '@/services/platformSettingsService';
import { agentsService } from '@/services/agentsService';

export const ragConfig = {
  useDify: import.meta.env.VITE_USE_DIFY_RAG === 'true',
  difyEndpoint: 'agentic-rag-dify',
  localEndpoint: 'agentic-rag'
} as const;

// Cache para evitar múltiplas consultas
let cachedMode: 'dify' | 'local' | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 60000; // 1 minuto

// Buscar agente padrão ativo
export const getDefaultAgent = async () => {
  try {
    const defaultAgent = await agentsService.getDefaultAgent();
    return defaultAgent;
  } catch (error) {
    console.error('Erro ao buscar agente padrão:', error);
    return null;
  }
};

// Mapear nome do agente para endpoint apropriado
export const getEndpointFromAgentName = (agentName: string): string => {
  // Mapear novos nomes para endpoints
  const endpointMapping: Record<string, string> = {
    'agentic-v1': 'agentic-rag',
    'agentic-claude_35_sonnet': 'agentic-rag-dify',
    'agentic-gpt_5_nano': 'agentic-rag-dify',
    // Compatibilidade com nomes antigos
    'agentic-rag': 'agentic-rag',
    'agentic-rag-dify': 'agentic-rag-dify',
  };

  return endpointMapping[agentName] || 'agentic-rag';
};

export const getRagEndpoint = async (): Promise<string> => {
  // Verificar cache primeiro
  const now = Date.now();
  if (cachedMode && (now - cacheTimestamp) < CACHE_TTL) {
    return cachedMode === 'dify' ? ragConfig.difyEndpoint : ragConfig.localEndpoint;
  }

  try {
    // Primeiro, tentar buscar agente padrão
    const defaultAgent = await getDefaultAgent();
    if (defaultAgent) {
      const endpoint = getEndpointFromAgentName(defaultAgent.name);
      
      // Atualizar cache baseado no endpoint
      cachedMode = endpoint === 'agentic-rag-dify' ? 'dify' : 'local';
      cacheTimestamp = now;
      
      return endpoint;
    }

    // Fallback para configuração tradicional
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