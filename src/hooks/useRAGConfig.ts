import { useState, useEffect, useCallback } from 'react';
import { platformSettingsService } from '@/services/platformSettingsService';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type RAGMode = 'local' | 'dify';

export interface RAGStatus {
  currentMode: RAGMode;
  isConfigured: boolean;
  difySecretsAvailable: boolean;
  lastTested?: Date;
  testResult?: 'success' | 'error';
  testMessage?: string;
}

export const useRAGConfig = () => {
  const [status, setStatus] = useState<RAGStatus>({
    currentMode: 'local',
    isConfigured: false,
    difySecretsAvailable: false,
  });
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  // Carregar status atual do RAG
  const loadRAGStatus = useCallback(async () => {
    try {
      setLoading(true);
      
      // Obter configuração atual
      const ragMode = await platformSettingsService.getSetting('rag_mode');
      const currentMode: RAGMode = ragMode === 'dify' ? 'dify' : 'local';
      
      // Verificar se secrets do Dify estão disponíveis
      const { data: secrets, error } = await supabase.functions.invoke('test-rag-config', {
        body: { mode: 'dify', action: 'check_secrets' }
      });
      
      const difySecretsAvailable = !error && secrets?.available === true;
      
      setStatus({
        currentMode,
        isConfigured: currentMode === 'local' || (currentMode === 'dify' && difySecretsAvailable),
        difySecretsAvailable,
      });
    } catch (error) {
      console.error('Erro ao carregar status RAG:', error);
      toast.error('Erro ao carregar configuração RAG');
    } finally {
      setLoading(false);
    }
  }, []);

  // Alternar modo RAG
  const switchRAGMode = useCallback(async (newMode: RAGMode) => {
    if (newMode === status.currentMode) {
      return;
    }

    // Validar se o Dify está configurado antes de alternar
    if (newMode === 'dify' && !status.difySecretsAvailable) {
      toast.error('Secrets do Dify não estão configurados. Configure os secrets primeiro.');
      return;
    }

    try {
      setUpdating(true);
      
      // Atualizar no banco de dados
      const success = await platformSettingsService.updateSetting(
        'rag_mode', 
        newMode,
        `Modo de operação do sistema RAG: ${newMode}`
      );

      if (!success) {
        throw new Error('Falha ao atualizar configuração no banco');
      }

      // Atualizar estado local
      setStatus(prev => ({
        ...prev,
        currentMode: newMode,
        isConfigured: newMode === 'local' || (newMode === 'dify' && prev.difySecretsAvailable),
      }));

      toast.success(`RAG alternado para modo ${newMode.toUpperCase()}`);
      
    } catch (error) {
      console.error('Erro ao alternar modo RAG:', error);
      toast.error('Erro ao alternar modo RAG');
    } finally {
      setUpdating(false);
    }
  }, [status.currentMode, status.difySecretsAvailable]);

  // Testar configuração atual
  const testConfiguration = useCallback(async () => {
    try {
      setUpdating(true);
      
      const { data, error } = await supabase.functions.invoke('test-rag-config', {
        body: { 
          mode: status.currentMode,
          action: 'test',
          query: 'teste de configuração'
        }
      });

      const testResult = error ? 'error' : 'success';
      const testMessage = error?.message || data?.message || 
        (testResult === 'success' ? 'Configuração testada com sucesso' : 'Erro no teste');

      setStatus(prev => ({
        ...prev,
        lastTested: new Date(),
        testResult,
        testMessage,
      }));

      if (testResult === 'success') {
        toast.success('Teste realizado com sucesso!');
      } else {
        toast.error(`Erro no teste: ${testMessage}`);
      }

    } catch (error) {
      console.error('Erro ao testar configuração:', error);
      setStatus(prev => ({
        ...prev,
        lastTested: new Date(),
        testResult: 'error',
        testMessage: 'Erro interno no teste',
      }));
      toast.error('Erro ao testar configuração');
    } finally {
      setUpdating(false);
    }
  }, [status.currentMode]);

  // Carregar status na inicialização
  useEffect(() => {
    loadRAGStatus();
  }, [loadRAGStatus]);

  return {
    status,
    loading,
    updating,
    switchRAGMode,
    testConfiguration,
    refreshStatus: loadRAGStatus,
  };
};