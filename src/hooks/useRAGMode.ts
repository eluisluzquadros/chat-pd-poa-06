import { useState, useEffect } from 'react';
import { platformSettingsService } from '@/services/platformSettingsService';

export type RAGMode = 'local' | 'dify';

export const useRAGMode = () => {
  const [ragMode, setRagMode] = useState<RAGMode>('local');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadRAGMode = async () => {
      try {
        const mode = await platformSettingsService.getRagMode();
        setRagMode(mode);
      } catch (error) {
        console.error('Erro ao carregar modo RAG:', error);
        setRagMode('local'); // fallback
      } finally {
        setLoading(false);
      }
    };

    loadRAGMode();
  }, []);

  return { ragMode, loading };
};