import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Settings, TestTube, Zap, Bot } from 'lucide-react';
import { useAdminTestMode, TestRAGMode, AdminTestConfig } from '@/hooks/useAdminTestMode';
import { LLMProvider } from '@/types/chat';

const AVAILABLE_MODELS = [
  { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo', provider: 'openai' },
  { value: 'gpt-4', label: 'GPT-4', provider: 'openai' },
  { value: 'gpt-4-turbo', label: 'GPT-4 Turbo', provider: 'openai' },
  { value: 'claude-3-sonnet', label: 'Claude 3 Sonnet', provider: 'anthropic' },
  { value: 'claude-3-haiku', label: 'Claude 3 Haiku', provider: 'anthropic' },
  { value: 'gemini-pro', label: 'Gemini Pro', provider: 'google' },
  { value: 'deepseek-chat', label: 'DeepSeek Chat', provider: 'deepseek' }
];

export function AdminTestToggle() {
  const {
    isTestMode,
    testConfig,
    globalConfig,
    loading,
    enableTestMode,
    disableTestMode,
    updateTestConfig,
    getEffectiveConfig
  } = useAdminTestMode();

  const [tempConfig, setTempConfig] = useState<AdminTestConfig>(testConfig);
  const effectiveConfig = getEffectiveConfig();

  if (loading) {
    return (
      <div className="px-1 py-2 mb-3">
        <div className="animate-pulse bg-muted rounded-lg h-16" />
      </div>
    );
  }

  const handleTestModeToggle = (enabled: boolean) => {
    if (enabled) {
      enableTestMode(tempConfig);
    } else {
      disableTestMode();
    }
  };

  const handleConfigChange = (field: keyof AdminTestConfig, value: any) => {
    const newConfig = { ...tempConfig, [field]: value };
    
    if (field === 'llmModel') {
      const model = AVAILABLE_MODELS.find(m => m.value === value);
      if (model) {
        newConfig.provider = model.provider as LLMProvider;
      }
    }
    
    setTempConfig(newConfig);
    
    if (isTestMode) {
      updateTestConfig(newConfig);
    }
  };

  return (
    <Card className="mx-1 mb-3">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Settings className="h-4 w-4 text-primary" />
          Admin Test Mode
          {isTestMode && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 h-auto flex items-center gap-1">
              <TestTube className="h-2.5 w-2.5" />
              ATIVO
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Test Mode Switch */}
        <div className="flex items-center justify-between">
          <Label htmlFor="test-mode" className="text-xs font-medium">
            Modo de Teste
          </Label>
          <Switch 
            id="test-mode"
            checked={isTestMode}
            onCheckedChange={handleTestModeToggle}
          />
        </div>

        {/* Configuration Options */}
        <div className="space-y-3">
          {/* RAG Mode Selection */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">
              RAG Mode {isTestMode ? '(Test)' : '(Global)'}
            </Label>
            <Select 
              value={isTestMode ? tempConfig.ragMode : globalConfig}
              onValueChange={(value: TestRAGMode) => handleConfigChange('ragMode', value)}
              disabled={!isTestMode}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="local">Local (agentic-rag)</SelectItem>
                <SelectItem value="dify">Dify (agentic-rag-v2)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* LLM Model Selection */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">
              LLM Model {isTestMode ? '(Test)' : '(Default)'}
            </Label>
            <Select 
              value={tempConfig.llmModel}
              onValueChange={(value) => handleConfigChange('llmModel', value)}
              disabled={!isTestMode}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AVAILABLE_MODELS.map((model) => (
                  <SelectItem key={model.value} value={model.value}>
                    {model.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Current Configuration Display */}
        <div className="pt-3 border-t border-border">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="h-3 w-3 text-primary" />
            <span className="text-xs font-medium">Configuração Ativa</span>
          </div>
          
          <div className="space-y-1 text-[10px] text-muted-foreground">
            <div className="flex justify-between">
              <span>RAG:</span>
              <Badge variant="outline" className="text-[9px] px-1 py-0">
                {effectiveConfig.ragMode === 'dify' ? 'agentic-rag-v2' : 'agentic-rag-v1'}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span>Model:</span>
              <span className="font-mono">{effectiveConfig.llmModel}</span>
            </div>
            {effectiveConfig.isTestMode && (
              <div className="flex justify-between">
                <span>Mode:</span>
                <Badge variant="secondary" className="text-[9px] px-1 py-0">
                  TEST
                </Badge>
              </div>
            )}
          </div>
        </div>

        {/* Reset Button */}
        {isTestMode && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={disableTestMode}
            className="w-full h-7 text-xs"
          >
            <Bot className="h-3 w-3 mr-1" />
            Voltar ao Global
          </Button>
        )}
      </CardContent>
    </Card>
  );
}