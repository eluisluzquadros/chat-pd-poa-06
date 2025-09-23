import { clearRagConfigCache } from '@/config/rag-config';
import { toast } from 'sonner';

/**
 * Utility functions for managing RAG configuration cache
 */

export const refreshRAGCache = () => {
  try {
    clearRagConfigCache();
    console.log('🧹 [RAG Cache] Cache limpo - sistema v3 ativo');
    return true;
  } catch (error) {
    console.error('❌ Erro ao limpar cache RAG:', error);
    return false;
  }
};

// Forçar limpeza do cache no carregamento para aplicar a correção v3
refreshRAGCache();

export const refreshRAGCacheWithToast = () => {
  const success = refreshRAGCache();
  if (success) {
    toast.success('Cache RAG atualizado');
  } else {
    toast.error('Erro ao atualizar cache RAG');
  }
  return success;
};