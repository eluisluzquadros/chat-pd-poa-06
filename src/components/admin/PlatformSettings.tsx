import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Loader2, Save, RotateCcw, Settings, Brain, MessageSquare, Zap, Globe } from 'lucide-react';
import { platformSettingsService, PlatformSetting } from '@/services/platformSettingsService';
import { UPDATED_MODEL_CONFIGS } from '@/config/llm-models-2025';
import { TenantManagement } from './TenantManagement';

interface PlatformSettingsProps {
  onSettingsChange?: () => void;
}

export function PlatformSettings({ onSettingsChange }: PlatformSettingsProps) {
  const [settings, setSettings] = useState<PlatformSetting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setSaving] = useState(false);
  const [currentValues, setCurrentValues] = useState<Record<string, any>>({});

  // Generate available models from the config
  const availableModels = UPDATED_MODEL_CONFIGS
    .filter(config => config.available)
    .map(config => ({
      value: `${config.provider}/${config.model}`,
      label: config.displayName,
      provider: config.provider.charAt(0).toUpperCase() + config.provider.slice(1),
      description: config.description
    }));

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const allSettings = await platformSettingsService.getAllSettings();
      setSettings(allSettings);
      
      // Criar objeto com valores atuais
      const values: Record<string, any> = {};
      allSettings.forEach(setting => {
        values[setting.key] = setting.value;
      });
      setCurrentValues(values);
    } catch (error) {
      console.error('Error loading settings:', error);
      toast.error('Erro ao carregar configurações');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleValueChange = (key: string, value: any) => {
    setCurrentValues(prev => ({ ...prev, [key]: value }));
  };

  const saveSetting = async (key: string) => {
    try {
      setSaving(true);
      const success = await platformSettingsService.updateSetting(key, currentValues[key]);
      
      if (success) {
        toast.success(`Configuração "${key}" salva com sucesso`);
        await loadSettings(); // Recarregar para ter os dados mais recentes
        onSettingsChange?.(); // Notificar mudança
      } else {
        toast.error(`Erro ao salvar configuração "${key}"`);
      }
    } catch (error) {
      console.error('Error saving setting:', error);
      toast.error('Erro ao salvar configuração');
    } finally {
      setSaving(false);
    }
  };

  const resetToDefault = (key: string, originalValue: any) => {
    setCurrentValues(prev => ({ ...prev, [key]: originalValue }));
  };

  const getSettingsByCategory = (category: string) => {
    return settings.filter(setting => setting.category === category);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Carregando configurações...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Configurações da Plataforma</h2>
          <p className="text-muted-foreground">
            Configure o comportamento padrão da plataforma
          </p>
        </div>
        <Button variant="outline" onClick={loadSettings} disabled={isLoading}>
          <RotateCcw className="h-4 w-4 mr-2" />
          Recarregar
        </Button>
      </div>

      <Tabs defaultValue="llm" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="llm" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            Modelos LLM
          </TabsTrigger>
          <TabsTrigger value="chat" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Chat
          </TabsTrigger>
          <TabsTrigger value="performance" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Performance
          </TabsTrigger>
          <TabsTrigger value="domains" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Domínios
          </TabsTrigger>
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Geral
          </TabsTrigger>
        </TabsList>

        {/* Configurações de LLM */}
        <TabsContent value="llm" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configurações de Modelos LLM</CardTitle>
              <CardDescription>
                Configure o modelo padrão e permissões de seleção
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {getSettingsByCategory('llm').map((setting) => (
                <div key={setting.key} className="space-y-3 p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label className="text-sm font-medium capitalize">
                        {setting.key.replace(/_/g, ' ')}
                      </Label>
                      {setting.description && (
                        <p className="text-xs text-muted-foreground">
                          {setting.description}
                        </p>
                      )}
                    </div>
                    <Badge variant="outline">
                      {setting.category}
                    </Badge>
                  </div>

                  {setting.key === 'default_llm_model' && (
                    <div className="space-y-2">
                      <Select 
                        value={currentValues[setting.key] || setting.value}
                        onValueChange={(value) => handleValueChange(setting.key, value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um modelo padrão" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableModels.map((model) => (
                            <SelectItem key={model.value} value={model.value}>
                              <div className="flex flex-col">
                                <span className="font-medium">{model.label}</span>
                                <span className="text-xs text-muted-foreground">
                                  {model.provider} • {model.description}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {setting.key === 'allow_user_model_selection' && (
                    <div className="flex items-center space-x-2">
                      <Switch 
                        checked={currentValues[setting.key] === true || currentValues[setting.key] === 'true'}
                        onCheckedChange={(checked) => handleValueChange(setting.key, checked)}
                      />
                      <Label className="text-sm">
                        {currentValues[setting.key] === true || currentValues[setting.key] === 'true' 
                          ? 'Usuários podem selecionar modelos' 
                          : 'Apenas admins podem selecionar modelos'
                        }
                      </Label>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      onClick={() => saveSetting(setting.key)}
                      disabled={isSaving}
                    >
                      {isSaving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />}
                      Salvar
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => resetToDefault(setting.key, setting.value)}
                    >
                      <RotateCcw className="h-3 w-3 mr-1" />
                      Resetar
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Gerenciamento de Domínios */}
        <TabsContent value="domains" className="space-y-4">
          <TenantManagement />
        </TabsContent>

        {/* Outras categorias */}
        {['chat', 'performance', 'general'].map(category => (
          <TabsContent key={category} value={category} className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="capitalize">Configurações de {category}</CardTitle>
                <CardDescription>
                  Configure as opções de {category}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {getSettingsByCategory(category).map((setting) => (
                  <div key={setting.key} className="space-y-3 p-4 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label className="text-sm font-medium capitalize">
                          {setting.key.replace(/_/g, ' ')}
                        </Label>
                        {setting.description && (
                          <p className="text-xs text-muted-foreground">
                            {setting.description}
                          </p>
                        )}
                      </div>
                      <Badge variant="outline">
                        {setting.category}
                      </Badge>
                    </div>

                    <div className="text-sm font-mono p-2 bg-muted rounded">
                      Valor atual: {JSON.stringify(setting.value)}
                    </div>

                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        onClick={() => saveSetting(setting.key)}
                        disabled={isSaving}
                      >
                        {isSaving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />}
                        Salvar
                      </Button>
                    </div>
                  </div>
                ))}

                {getSettingsByCategory(category).length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhuma configuração encontrada para esta categoria
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}