import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { platformSettingsService } from '@/services/platformSettingsService';

export function useModelSelection() {
  const [selectedModel, setSelectedModel] = useState<string>('anthropic/claude-3-5-sonnet-20241022');
  const [isLoading, setIsLoading] = useState(false);
  const [defaultModel, setDefaultModel] = useState<string>('anthropic/claude-3-5-sonnet-20241022');
  const { isAdmin } = useAuth();

  // Carregar modelo padrão na inicialização
  useEffect(() => {
    const loadDefaultModel = async () => {
      try {
        const model = await platformSettingsService.getDefaultLLMModel();
        const resolvedModel = model || 'anthropic/claude-3-5-sonnet-20241022'; // fallback hardcoded
        
        setDefaultModel(resolvedModel);
        
        // Se o usuário não é admin, sempre usar o modelo padrão
        if (!isAdmin) {
          setSelectedModel(resolvedModel);
        }
      } catch (error) {
        console.error('Error loading default model:', error);
        
        // Usar fallback hardcoded em caso de erro
        const fallbackModel = 'anthropic/claude-3-5-sonnet-20241022';
        setDefaultModel(fallbackModel);
        
        if (!isAdmin) {
          setSelectedModel(fallbackModel);
        }
      }
    };

    loadDefaultModel();
  }, [isAdmin]);

  // Se o usuário não é admin e o modelo padrão muda, atualizar o modelo selecionado
  useEffect(() => {
    if (!isAdmin) {
      setSelectedModel(defaultModel);
    }
  }, [isAdmin, defaultModel]);

  const switchModel = useCallback(async (modelString: string) => {
    // Apenas admins podem trocar de modelo
    if (!isAdmin) {
      console.warn('Usuário não-admin tentou trocar modelo. Usando modelo padrão.');
      setSelectedModel(defaultModel);
      return;
    }

    setIsLoading(true);
    try {
      setSelectedModel(modelString);
    } catch (error) {
      console.error('Error switching model:', error);
      // Em caso de erro, voltar para o modelo padrão
      setSelectedModel(defaultModel);
    } finally {
      setIsLoading(false);
    }
  }, [isAdmin, defaultModel]);

  return {
    selectedModel,
    isLoading,
    switchModel,
    defaultModel
  };
}