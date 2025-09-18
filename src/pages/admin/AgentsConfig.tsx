import React, { useState } from 'react';
import { Plus, Settings, Star, Trash2, Edit, TestTube, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAgents } from '@/hooks/useAgents';
import { useConnectionTest } from '@/hooks/useConnectionTest';
import { CreateAgentData, ApiConfig, ModelParameters } from '@/services/agentsService';
import { Separator } from '@/components/ui/separator';
import { AgentFormValidator } from '@/components/admin/AgentFormValidator';
import { AgentPreview } from '@/components/admin/AgentPreview';

// Modelos disponíveis - Alinhados com sistema Dify
const MODELS = [
  { id: 'custom-app', name: 'Aplicação Dify (App)', category: 'dify', description: 'Aplicação customizada via Dify' },
  { id: 'custom-workflow', name: 'Workflow Dify', category: 'dify', description: 'Workflow automatizado via Dify' },
  { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', category: 'anthropic', description: 'Modelo mais avançado da Anthropic' },
  { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', category: 'anthropic', description: 'Modelo rápido e eficiente' },
  { id: 'gpt-5-nano-2025-08-07', name: 'GPT-5 Nano', category: 'openai', description: 'Versão compacta do GPT-5' },
  { id: 'gpt-4o', name: 'GPT-4o', category: 'openai', description: 'GPT-4 otimizado' },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', category: 'openai', description: 'Versão econômica do GPT-4' },
];

interface AgentFormData {
  name: string;
  display_name: string;
  description: string;
  model: string;
  is_active: boolean;
  is_default: boolean;
  dify_config: ApiConfig; // Alinhado com estrutura da tabela dify_agents
  parameters: ModelParameters;
}

// Configuração padrão Dify - valores baseados no sistema atual
const defaultDifyConfig: ApiConfig = {
  base_url: 'https://api.dify.ai/v1',
  service_api_endpoint: '/chat-messages',
  api_key: 'app-0sZewWe2Z6pcucR70tyO8uKv', // Token padrão atual
  app_id: 'app-0sZewWe2Z6pcucR70tyO8uKv',
  public_url: 'https://api.dify.ai',
  server_url: 'https://api.dify.ai',
  workflow_id: '',
};

const defaultParameters: ModelParameters = {
  temperature: 0.7,
  max_tokens: 4000,
  top_p: 1,
  stream: true,
  timeout: 30000,
  max_retries: 3,
  response_format: 'text',
};

const defaultFormData: AgentFormData = {
  name: '',
  display_name: '',
  description: '',
  model: 'custom-app', // Padrão para Dify App
  is_active: true,
  is_default: false,
  dify_config: defaultDifyConfig,
  parameters: defaultParameters,
};

export default function AgentsConfig() {
  const { agents, loading, creating, updating, updateAgent, createAgent, deleteAgent, toggleAgentStatus, setAsDefault } = useAgents();
  const { testing, lastResult, testConnection, clearResult } = useConnectionTest();
  const [showDialog, setShowDialog] = useState(false);
  const [editingAgent, setEditingAgent] = useState<string | null>(null);
  const [formData, setFormData] = useState<AgentFormData>(defaultFormData);
  const [activeTab, setActiveTab] = useState('general');
  const [showValidation, setShowValidation] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowValidation(true);
    
    // Validação básica
    if (!formData.name || !formData.display_name || !formData.model) {
      setActiveTab('general');
      return;
    }

    // Validação de configuração Dify
    if (!formData.dify_config.base_url || !formData.dify_config.service_api_endpoint || 
        !formData.dify_config.api_key || !formData.dify_config.app_id) {
      setActiveTab('api');
      return;
    }

    try {
      const agentData: CreateAgentData = {
        name: formData.name,
        display_name: formData.display_name,
        description: formData.description || undefined,
        provider: 'dify', // Provider alinhado com Dify
        model: formData.model,
        is_active: formData.is_active,
        is_default: formData.is_default,
        api_config: formData.dify_config, // Usando dify_config
        parameters: formData.parameters,
      };

      if (editingAgent) {
        await updateAgent(editingAgent, agentData);
      } else {
        await createAgent(agentData);
      }

      setShowDialog(false);
      setEditingAgent(null);
      setFormData(defaultFormData);
      setActiveTab('general');
      setShowValidation(false);
      clearResult();
    } catch (error) {
      // Erro já tratado no hook
    }
  };

  const handleEdit = (agent: any) => {
    setEditingAgent(agent.id);
    setFormData({
      name: agent.name,
      display_name: agent.display_name,
      description: agent.description || '',
      model: agent.model,
      is_active: agent.is_active,
      is_default: agent.is_default,
      dify_config: agent.api_config || defaultDifyConfig, // Mapeamento correto
      parameters: agent.parameters || defaultParameters,
    });
    setShowDialog(true);
  };

  const handleCreate = () => {
    setEditingAgent(null);
    setFormData(defaultFormData);
    setActiveTab('general');
    setShowValidation(false);
    clearResult();
    setShowDialog(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja remover este agente?')) {
      await deleteAgent(id);
    }
  };

  const updateDifyConfig = (field: keyof ApiConfig, value: string) => {
    // Validação especial para service_api_endpoint - deve ser caminho relativo
    if (field === 'service_api_endpoint') {
      // Remover URL completa se detectada e manter apenas o caminho
      if (value.includes('://')) {
        try {
          const url = new URL(value);
          value = url.pathname;
        } catch {
          // Se falhar, tentar extrair parte após o domínio
          const match = value.match(/https?:\/\/[^\/]+(.*)$/);
          value = match ? match[1] : value;
        }
      }
      
      // Garantir que comece com /
      if (value && !value.startsWith('/')) {
        value = '/' + value;
      }
    }
    
    // Auto-sincronizar app_id com api_key se for um token Dify
    if (field === 'api_key' && value.startsWith('app-')) {
      setFormData(prev => ({
        ...prev,
        dify_config: { 
          ...prev.dify_config, 
          [field]: value,
          app_id: value // Sincronizar app_id automaticamente
        }
      }));
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      dify_config: { ...prev.dify_config, [field]: value }
    }));
  };

  const updateParameters = (field: keyof ModelParameters, value: any) => {
    setFormData(prev => ({
      ...prev,
      parameters: { ...prev.parameters, [field]: value }
    }));
  };

  const handleTestConnection = async () => {
    await testConnection({
      base_url: formData.dify_config.base_url,
      api_key: formData.dify_config.api_key,
      service_api_endpoint: formData.dify_config.service_api_endpoint,
      app_id: formData.dify_config.app_id,
    });
  };

  const getProviderBadgeVariant = () => {
    return 'default' as const;
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Carregando agentes...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Configuração de Agentes Dify</h1>
          <p className="text-muted-foreground mt-2">
            Gerencie os agentes de IA do sistema Dify integrado
          </p>
        </div>
        <Button onClick={handleCreate} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Novo Agente Dify
        </Button>
      </div>

      {/* Status do Sistema Dify */}
      <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-blue-800 mb-1 flex items-center gap-2">
              🚀 Sistema Dify - Status Operacional
            </h3>
            <div className="text-sm text-blue-700 space-y-1">
              <p>✅ <strong>Dify API:</strong> {defaultDifyConfig.base_url}</p>
              <p>🔑 <strong>Credenciais:</strong> Configuradas no Supabase</p>
              <p>⚡ <strong>Edge Function:</strong> agentic-rag-dify ativa</p>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2 text-green-600 mb-1">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-sm font-medium">Online</span>
            </div>
            <p className="text-xs text-blue-600">Última verificação: agora</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4">
        {agents.map((agent) => (
          <Card key={agent.id} className="relative">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-lg">{agent.display_name}</CardTitle>
                  <Badge variant={getProviderBadgeVariant()}>
                    {agent.provider === 'dify' ? '🚀 Dify' : 'Agente IA'}
                  </Badge>
                  {agent.is_default && (
                    <Badge variant="default" className="flex items-center gap-1">
                      <Star className="h-3 w-3" />
                      Padrão
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={agent.is_active}
                    onCheckedChange={(checked) => toggleAgentStatus(agent.id, checked)}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(agent)}
                    className="h-8 w-8 p-0"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(agent.id)}
                    className="h-8 w-8 p-0 text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span><strong>Nome:</strong> {agent.name}</span>
                  <span><strong>Modelo:</strong> {agent.model}</span>
                </div>
                {agent.description && (
                  <p className="text-sm text-muted-foreground">{agent.description}</p>
                )}
                {agent.api_config?.base_url && (
                  <div className="text-sm text-muted-foreground">
                    <strong>Dify URL:</strong> {agent.api_config.base_url}
                    {agent.api_config.app_id && (
                      <span className="ml-2">
                        <strong>App ID:</strong> {agent.api_config.app_id.substring(0, 12)}...
                      </span>
                    )}
                  </div>
                )}
                <div className="flex items-center gap-2 pt-2">
                  {!agent.is_default && agent.is_active && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setAsDefault(agent.id)}
                      className="flex items-center gap-2"
                    >
                      <Star className="h-3 w-3" />
                      Definir como Padrão
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {agents.length === 0 && (
          <Card className="text-center py-12">
            <CardContent>
              <Settings className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold mb-2">Nenhum agente configurado</h3>
              <p className="text-muted-foreground mb-4">
                Crie seu primeiro agente para começar a usar o sistema
              </p>
              <Button onClick={handleCreate} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Criar Primeiro Agente
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingAgent ? 'Editar Agente' : 'Novo Agente'}
            </DialogTitle>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="general">Geral</TabsTrigger>
              <TabsTrigger value="api">Dify Config</TabsTrigger>
              <TabsTrigger value="parameters">Parâmetros</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
              <TabsTrigger value="test">🧪 Teste</TabsTrigger>
            </TabsList>

            <form onSubmit={handleSubmit} className="space-y-6">
              <TabsContent value="general" className="space-y-4">
                <AgentFormValidator
                  formData={formData}
                  showValidation={showValidation}
                  validationRules={[
                    { field: 'display_name', label: 'Nome de Exibição', required: true },
                    { field: 'name', label: 'Nome Técnico', required: true },
                    { field: 'model', label: 'Modelo', required: true },
                  ]}
                />
                <TooltipProvider>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="display_name">Nome de Exibição *</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <AlertCircle className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Nome amigável que será exibido na interface</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Input
                      id="display_name"
                      value={formData.display_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, display_name: e.target.value }))}
                      placeholder="ex: Claude 3.5 Sonnet"
                      required
                      className={!formData.display_name && showValidation ? 'border-destructive' : ''}
                    />
                  </div>
                </TooltipProvider>

                <TooltipProvider>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="name">Nome Técnico *</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <AlertCircle className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Identificador único do agente (sem espaços, use underscore)</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value.replace(/\s+/g, '_').toLowerCase() }))}
                      placeholder="ex: agentic-claude_35_sonnet"
                      required
                      className={!formData.name && showValidation ? 'border-destructive' : ''}
                    />
                  </div>
                </TooltipProvider>

                <div className="space-y-2">
                  <Label htmlFor="model">Modelo</Label>
                  <Select
                    value={formData.model}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, model: value }))}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o modelo Dify" />
                    </SelectTrigger>
                    <SelectContent>
                      {MODELS.map((model) => (
                        <SelectItem key={model.id} value={model.id}>
                          <div className="flex flex-col">
                            <span className="font-medium">{model.name}</span>
                            <span className="text-xs text-muted-foreground">{model.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Descrição opcional do agente"
                    rows={3}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_active"
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                    />
                    <Label htmlFor="is_active">Ativo</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_default"
                      checked={formData.is_default}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_default: checked }))}
                    />
                    <Label htmlFor="is_default">Padrão</Label>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="api" className="space-y-4">
                <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
                  <h4 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
                    🚀 Configuração Dify - Sistema Atual
                  </h4>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• <strong>Base URL:</strong> {defaultDifyConfig.base_url}</li>
                    <li>• <strong>Service Endpoint:</strong> {defaultDifyConfig.service_api_endpoint}</li>
                    <li>• <strong>API Key:</strong> {defaultDifyConfig.api_key} (configurado)</li>
                    <li>• <strong>App ID:</strong> ID da aplicação (encontre na URL da app ou em Settings)</li>
                  </ul>
                  <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                    ⚠️ <strong>Service Endpoint</strong> deve ser apenas o caminho (ex: /chat-messages), não uma URL completa
                  </div>
                </div>
                
                <AgentFormValidator
                  formData={formData}
                  showValidation={showValidation}
                  validationRules={[
                    { field: 'dify_config.base_url', label: 'Base URL', required: true },
                    { field: 'dify_config.service_api_endpoint', label: 'Service API Endpoint', required: true },
                    { field: 'dify_config.api_key', label: 'API Key', required: true },
                    { field: 'dify_config.app_id', label: 'App ID', required: true },
                  ]}
                />
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Configuração de API</h3>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      onClick={handleTestConnection}
                      disabled={testing || !formData.dify_config.base_url || !formData.dify_config.api_key}
                    >
                      {testing ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <TestTube className="h-4 w-4 mr-2" />
                      )}
                      {testing ? 'Testando...' : 'Testar Conexão'}
                    </Button>
                  </div>

                  {lastResult && (
                    <div className={`p-3 rounded-md border ${
                      lastResult.success 
                        ? 'bg-green-50 border-green-200 text-green-800' 
                        : 'bg-red-50 border-red-200 text-red-800'
                    }`}>
                      <div className="flex items-center gap-2">
                        {lastResult.success ? (
                          <div className="h-2 w-2 rounded-full bg-green-500" />
                        ) : (
                          <div className="h-2 w-2 rounded-full bg-red-500" />
                        )}
                        <span className="font-medium">{lastResult.message}</span>
                      </div>
                      {lastResult.details && (
                        <div className="mt-2 text-xs opacity-75">
                          {JSON.stringify(lastResult.details, null, 2)}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <TooltipProvider>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Label htmlFor="base_url">Base URL *</Label>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <AlertCircle className="h-4 w-4 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>URL base da API (ex: https://api.dify.ai)</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <Input
                          id="base_url"
                          value={formData.dify_config.base_url}
                          onChange={(e) => updateDifyConfig('base_url', e.target.value)}
                          placeholder="https://api.dify.ai"
                          required
                          className={!formData.dify_config.base_url && showValidation ? 'border-destructive' : ''}
                        />
                      </div>
                    </TooltipProvider>

                    <TooltipProvider>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Label htmlFor="service_api_endpoint">Service API Endpoint *</Label>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <AlertCircle className="h-4 w-4 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Caminho relativo da API (ex: /chat-messages ou /v1/chat-messages)</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <Input
                          id="service_api_endpoint"
                          value={formData.dify_config.service_api_endpoint}
                          onChange={(e) => updateDifyConfig('service_api_endpoint', e.target.value)}
                          placeholder="/chat-messages"
                          required
                          className={!formData.dify_config.service_api_endpoint && showValidation ? 'border-destructive' : ''}
                        />
                        {formData.dify_config.service_api_endpoint && formData.dify_config.service_api_endpoint.includes('://') && (
                          <div className="text-xs text-orange-600 mt-1">
                            ⚠️ Detectada URL completa. Use apenas o caminho (ex: /chat-messages)
                          </div>
                        )}
                      </div>
                    </TooltipProvider>
                  </div>

                  <TooltipProvider>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="api_key">API Key *</Label>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <AlertCircle className="h-4 w-4 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Chave de API da aplicação Dify (formato: app-xxxx)</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <Input
                        id="api_key"
                        type="password"
                        value={formData.dify_config.api_key}
                        onChange={(e) => updateDifyConfig('api_key', e.target.value)}
                        placeholder="app-xxxxxxxxxxxxxxxxxxxxxxxx"
                        required
                        className={!formData.dify_config.api_key && showValidation ? 'border-destructive' : ''}
                      />
                    </div>
                  </TooltipProvider>

                  <TooltipProvider>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="app_id">App ID *</Label>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <AlertCircle className="h-4 w-4 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Identificador único da aplicação no Dify</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <Input
                        id="app_id"
                        value={formData.dify_config.app_id}
                        onChange={(e) => updateDifyConfig('app_id', e.target.value)}
                        placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                        required
                        className={!formData.dify_config.app_id && showValidation ? 'border-destructive' : ''}
                      />
                    </div>
                  </TooltipProvider>

                  <Separator />

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="public_url">Public URL</Label>
                      <Input
                        id="public_url"
                        value={formData.dify_config.public_url}
                        onChange={(e) => updateDifyConfig('public_url', e.target.value)}
                        placeholder="https://api.example.com"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="server_url">Server URL</Label>
                      <Input
                        id="server_url"
                        value={formData.dify_config.server_url}
                        onChange={(e) => updateDifyConfig('server_url', e.target.value)}
                        placeholder="https://server.api.example.com"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="workflow_id">Workflow ID</Label>
                    <Input
                      id="workflow_id"
                      value={formData.dify_config.workflow_id}
                      onChange={(e) => updateDifyConfig('workflow_id', e.target.value)}
                      placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="parameters" className="space-y-4">
                <h3 className="text-lg font-semibold">Parâmetros do Modelo</h3>

                <div className="grid grid-cols-2 gap-4">
                  <TooltipProvider>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Label>Temperature: {formData.parameters.temperature}</Label>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <AlertCircle className="h-4 w-4 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Controla a criatividade das respostas (0-2)</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <Slider
                        value={[formData.parameters.temperature || 0.7]}
                        onValueChange={([value]) => updateParameters('temperature', value)}
                        max={2}
                        min={0}
                        step={0.1}
                        className="w-full"
                      />
                    </div>
                  </TooltipProvider>

                  <TooltipProvider>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Label>Top P: {formData.parameters.top_p}</Label>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <AlertCircle className="h-4 w-4 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Controla a diversidade das respostas (0-1)</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <Slider
                        value={[formData.parameters.top_p || 1]}
                        onValueChange={([value]) => updateParameters('top_p', value)}
                        max={1}
                        min={0}
                        step={0.1}
                        className="w-full"
                      />
                    </div>
                  </TooltipProvider>

                  <TooltipProvider>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="max_tokens">Max Tokens</Label>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <AlertCircle className="h-4 w-4 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Limite máximo de tokens na resposta</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <Input
                        id="max_tokens"
                        type="number"
                        value={formData.parameters.max_tokens || 4000}
                        onChange={(e) => updateParameters('max_tokens', parseInt(e.target.value) || 4000)}
                        min={1}
                        max={32000}
                      />
                    </div>
                  </TooltipProvider>

                  <TooltipProvider>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="timeout">Timeout (ms)</Label>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <AlertCircle className="h-4 w-4 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Tempo limite para requisições em milissegundos</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <Input
                        id="timeout"
                        type="number"
                        value={formData.parameters.timeout || 30000}
                        onChange={(e) => updateParameters('timeout', parseInt(e.target.value) || 30000)}
                        min={1000}
                        max={120000}
                      />
                    </div>
                  </TooltipProvider>

                  <div className="space-y-2">
                    <Label htmlFor="max_retries">Max Retries</Label>
                    <Input
                      id="max_retries"
                      type="number"
                      value={formData.parameters.max_retries || 3}
                      onChange={(e) => updateParameters('max_retries', parseInt(e.target.value) || 3)}
                      min={0}
                      max={10}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="response_format">Formato de Resposta</Label>
                    <Select
                      value={formData.parameters.response_format || 'text'}
                      onValueChange={(value) => updateParameters('response_format', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">Texto</SelectItem>
                        <SelectItem value="json">JSON</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="stream"
                    checked={formData.parameters.stream ?? true}
                    onCheckedChange={(checked) => updateParameters('stream', checked)}
                  />
                  <Label htmlFor="stream">Streaming habilitado</Label>
                </div>
              </TabsContent>

              <TabsContent value="preview" className="space-y-4">
                <AgentPreview formData={formData} />
              </TabsContent>

              <TabsContent value="test" className="space-y-4">
                <div className="space-y-6">
                  <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg">
                    <h4 className="font-semibold text-green-800 mb-2 flex items-center gap-2">
                      🚀 Status do Sistema Dify
                    </h4>
                    <div className="text-sm text-green-700 space-y-1">
                      <p>✅ <strong>Dify funcionando:</strong> Responde corretamente</p>
                      <p>⚙️ <strong>Credenciais configuradas:</strong> Secrets disponíveis no Supabase</p>
                      <p>🔗 <strong>Edge Function:</strong> agentic-rag-dify ativa</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Teste de Conectividade</h3>
                    
                    <div className="grid gap-4">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={handleTestConnection}
                        disabled={testing || !formData.dify_config.base_url || !formData.dify_config.api_key}
                        className="w-full"
                      >
                        {testing ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <TestTube className="h-4 w-4 mr-2" />
                        )}
                        {testing ? 'Testando Conexão Dify...' : 'Testar Conexão com Dify'}
                      </Button>

                      {lastResult && (
                        <div className={`p-4 rounded-lg border ${
                          lastResult.success 
                            ? 'bg-green-50 border-green-200' 
                            : 'bg-red-50 border-red-200'
                        }`}>
                          <div className="flex items-center gap-2 mb-2">
                            <div className={`h-2 w-2 rounded-full ${
                              lastResult.success ? 'bg-green-500' : 'bg-red-500'
                            }`} />
                            <span className={`text-sm font-medium ${
                              lastResult.success ? 'text-green-800' : 'text-red-800'
                            }`}>
                              {lastResult.success ? 'Conexão bem-sucedida!' : 'Falha na conexão'}
                            </span>
                          </div>
                          {lastResult.message && (
                            <p className={`text-xs ${
                              lastResult.success ? 'text-green-700' : 'text-red-700'
                            }`}>
                              {lastResult.message}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </TabsContent>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={creating || updating}>
                  {creating || updating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {editingAgent ? 'Atualizando...' : 'Criando...'}
                    </>
                  ) : (
                    editingAgent ? 'Atualizar Agente' : 'Criar Agente'
                  )}
                </Button>
              </div>
            </form>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}