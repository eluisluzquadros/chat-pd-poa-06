import { clearRagConfigCache } from '@/config/rag-config';
import { toast } from 'sonner';

/**
 * Utility functions for managing RAG configuration cache
 */

export const refreshRAGCache = () => {
  try {
    clearRagConfigCache();
    console.log('🧹 Cache RAG limpo com sucesso');
    return true;
  } catch (error) {
    console.error('❌ Erro ao limpar cache RAG:', error);
    return false;
  }
};

export const refreshRAGCacheWithToast = () => {
  const success = refreshRAGCache();
  if (success) {
    toast.success('Cache RAG atualizado');
  } else {
    toast.error('Erro ao atualizar cache RAG');
  }
  return success;
};