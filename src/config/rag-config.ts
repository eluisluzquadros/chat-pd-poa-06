// Agent-Based RAG Configuration
import { agentsService } from '@/services/agentsService';

export const ragConfig = {
  // Use legacy chat edge function as fallback when no external agents
  defaultEndpoint: 'chat'
} as const;

// Cache para evitar múltiplas consultas de agentes
let cachedAgent: any = null;
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

// LEGACY: This function is deprecated - External agents now use External Agent Gateway
export const getEndpointFromAgentName = (agentName: string): string => {
  console.log(`🔄 [RAG Config] DEPRECATED: agente "${agentName}" should use External Agent Gateway, fallback to chat`);
  return ragConfig.defaultEndpoint;
};

export const getRagEndpoint = async (): Promise<string> => {
  // Verificar cache primeiro
  const now = Date.now();
  if (cachedAgent && (now - cacheTimestamp) < CACHE_TTL) {
    return getEndpointFromAgentName(cachedAgent.name);
  }

  try {
    // Buscar agente padrão ativo
    const defaultAgent = await getDefaultAgent();
    if (defaultAgent) {
      cachedAgent = defaultAgent;
      cacheTimestamp = now;
      return getEndpointFromAgentName(defaultAgent.name);
    }

    // Fallback se não houver agente padrão
    console.warn('[RAG Config] Nenhum agente padrão encontrado, usando endpoint de fallback');
    return ragConfig.defaultEndpoint;
  } catch (error) {
    console.error('Erro ao obter agente para RAG, usando fallback:', error);
    return ragConfig.defaultEndpoint;
  }
};

// Função síncrona para compatibilidade com código existente
export const getRagEndpointSync = () => {
  // Se existe cache válido, usar
  if (cachedAgent && (Date.now() - cacheTimestamp) < CACHE_TTL) {
    return getEndpointFromAgentName(cachedAgent.name);
  }
  
  // Fallback para endpoint padrão
  return ragConfig.defaultEndpoint;
};

// Limpar cache de agentes (útil após mudanças de configuração)
export const clearRagConfigCache = () => {
  cachedAgent = null;
  cacheTimestamp = 0;
  console.log('🧹 [RAG Config] Cache de agente limpo - próxima consulta buscará agente atualizado');
};