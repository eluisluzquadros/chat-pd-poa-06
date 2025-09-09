import { useState, useEffect } from 'react';
import { platformSettingsService } from '@/services/platformSettingsService';
import { LLMProvider } from '@/types/chat';

export type TestRAGMode = 'local' | 'dify';

export interface AdminTestConfig {
  ragMode: TestRAGMode;
  llmModel: string;
  provider: LLMProvider;
}

const DEFAULT_TEST_CONFIG: AdminTestConfig = {
  ragMode: 'local',
  llmModel: 'gpt-3.5-turbo',
  provider: 'openai'
};

export const useAdminTestMode = () => {
  const [isTestMode, setIsTestMode] = useState(false);
  const [testConfig, setTestConfig] = useState<AdminTestConfig>(DEFAULT_TEST_CONFIG);
  const [globalConfig, setGlobalConfig] = useState<TestRAGMode>('local');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadGlobalConfig = async () => {
      try {
        const mode = await platformSettingsService.getRagMode();
        setGlobalConfig(mode);
      } catch (error) {
        console.error('Erro ao carregar configuração global:', error);
        setGlobalConfig('local');
      } finally {
        setLoading(false);
      }
    };

    loadGlobalConfig();
  }, []);

  const enableTestMode = (config: AdminTestConfig) => {
    setTestConfig(config);
    setIsTestMode(true);
  };

  const disableTestMode = () => {
    setIsTestMode(false);
    setTestConfig(DEFAULT_TEST_CONFIG);
  };

  const updateTestConfig = (config: Partial<AdminTestConfig>) => {
    setTestConfig(prev => ({ ...prev, ...config }));
  };

  // Get the effective configuration (test mode takes precedence)
  const getEffectiveConfig = () => {
    if (isTestMode) {
      return {
        ragMode: testConfig.ragMode,
        llmModel: testConfig.llmModel,
        provider: testConfig.provider,
        isTestMode: true
      };
    }
    
    return {
      ragMode: globalConfig,
      llmModel: 'gpt-3.5-turbo',
      provider: 'openai' as LLMProvider,
      isTestMode: false
    };
  };

  return {
    isTestMode,
    testConfig,
    globalConfig,
    loading,
    enableTestMode,
    disableTestMode,
    updateTestConfig,
    getEffectiveConfig
  };
};