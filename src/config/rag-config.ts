// Agent-Based RAG Configuration
import { agentsService } from '@/services/agentsService';

export const ragConfig = {
  difyEndpoint: 'agentic-rag-dify',
  localEndpoint: 'agentic-rag'
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

// Mapear nome do agente para endpoint apropriado
export const getEndpointFromAgentName = (agentName: string): string => {
  // Mapear novos nomes para endpoints
  const endpointMapping: Record<string, string> = {
    // Agentes v3 (API externa)
    'chatpdpoa-assistent-deepseek-chat': 'agentic-rag-dify',
    'agentic-claude_35_sonnet': 'agentic-rag-dify',
    'agentic-gpt_5_nano': 'agentic-rag-dify',
    
    // Agentes v2 (local)
    'agentic_openai_gpt_4.1-mini': 'agentic-rag',
    'agentic-v1': 'agentic-rag',
    
    // Compatibilidade com nomes antigos
    'agentic-rag': 'agentic-rag',
    'agentic-rag-dify': 'agentic-rag-dify',
  };

  console.log(`🎯 [RAG Config] Mapeando agente "${agentName}" para endpoint:`, endpointMapping[agentName] || 'agentic-rag');
  return endpointMapping[agentName] || 'agentic-rag';
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
    console.warn('[RAG Config] Nenhum agente padrão encontrado, usando endpoint local');
    return ragConfig.localEndpoint;
  } catch (error) {
    console.error('Erro ao obter agente para RAG, usando fallback:', error);
    return ragConfig.localEndpoint;
  }
};

// Função síncrona para compatibilidade com código existente
export const getRagEndpointSync = () => {
  // Se existe cache válido, usar
  if (cachedAgent && (Date.now() - cacheTimestamp) < CACHE_TTL) {
    return getEndpointFromAgentName(cachedAgent.name);
  }
  
  // Fallback para endpoint local
  return ragConfig.localEndpoint;
};

// Limpar cache de agentes (útil após mudanças de configuração)
export const clearRagConfigCache = () => {
  cachedAgent = null;
  cacheTimestamp = 0;
  console.log('🧹 [RAG Config] Cache de agente limpo - próxima consulta buscará agente atualizado');
};