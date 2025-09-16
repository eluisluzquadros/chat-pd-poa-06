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

// Modelos disponíveis
const MODELS = [
  { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet' },
  { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku' },
  { id: 'gpt-5-nano-2025-08-07', name: 'GPT-5 Nano' },
  { id: 'gpt-4o', name: 'GPT-4o' },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
  { id: 'custom-workflow', name: 'Workflow Personalizado' },
  { id: 'custom-app', name: 'Aplicação Personalizada' },
];

interface AgentFormData {
  name: string;
  display_name: string;
  description: string;
  model: string;
  is_active: boolean;
  is_default: boolean;
  api_config: ApiConfig;
  parameters: ModelParameters;
}

const defaultApiConfig: ApiConfig = {
  base_url: 'https://api.dify.ai/v1',
  service_api_endpoint: '/chat-messages',
  api_key: '',
  app_id: '',
  public_url: '',
  server_url: '',
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
  model: '',
  is_active: true,
  is_default: false,
  api_config: defaultApiConfig,
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

    // Validação de configuração da API
    if (!formData.api_config.base_url || !formData.api_config.service_api_endpoint || 
        !formData.api_config.api_key || !formData.api_config.app_id) {
      setActiveTab('api');
      return;
    }

    try {
      const agentData: CreateAgentData = {
        name: formData.name,
        display_name: formData.display_name,
        description: formData.description || undefined,
        provider: 'api',
        model: formData.model,
        is_active: formData.is_active,
        is_default: formData.is_default,
        api_config: formData.api_config,
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
      api_config: agent.api_config || defaultApiConfig,
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

  const updateApiConfig = (field: keyof ApiConfig, value: string) => {
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
    
    setFormData(prev => ({
      ...prev,
      api_config: { ...prev.api_config, [field]: value }
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
      base_url: formData.api_config.base_url,
      api_key: formData.api_config.api_key,
      service_api_endpoint: formData.api_config.service_api_endpoint,
      app_id: formData.api_config.app_id,
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
          <h1 className="text-3xl font-bold">Configuração de Agentes</h1>
          <p className="text-muted-foreground mt-2">
            Gerencie os agentes de IA disponíveis no sistema
          </p>
        </div>
        <Button onClick={handleCreate} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Novo Agente
        </Button>
      </div>

      <div className="grid gap-4">
        {agents.map((agent) => (
          <Card key={agent.id} className="relative">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-lg">{agent.display_name}</CardTitle>
                  <Badge variant={getProviderBadgeVariant()}>
                    Agente IA
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
                    <strong>API URL:</strong> {agent.api_config.base_url}
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
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="general">Informações Gerais</TabsTrigger>
              <TabsTrigger value="api">Configuração de API</TabsTrigger>
              <TabsTrigger value="parameters">Parâmetros</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
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
                      <SelectValue placeholder="Selecione o modelo" />
                    </SelectTrigger>
                    <SelectContent>
                      {MODELS.map((model) => (
                        <SelectItem key={model.id} value={model.id}>
                          {model.name}
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
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-semibold text-blue-800 mb-2">💡 Configuração Dify Simplificada</h4>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• <strong>Base URL:</strong> https://api.dify.ai/v1 (padrão do Dify)</li>
                    <li>• <strong>Service Endpoint:</strong> /chat-messages (apenas o caminho, sem domínio)</li>
                    <li>• <strong>API Key:</strong> Formato app-xxxx (encontre em API Management → API Keys)</li>
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
                    { field: 'api_config.base_url', label: 'Base URL', required: true },
                    { field: 'api_config.service_api_endpoint', label: 'Service API Endpoint', required: true },
                    { field: 'api_config.api_key', label: 'API Key', required: true },
                    { field: 'api_config.app_id', label: 'App ID', required: true },
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
                      disabled={testing || !formData.api_config.base_url || !formData.api_config.api_key}
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
                          value={formData.api_config.base_url}
                          onChange={(e) => updateApiConfig('base_url', e.target.value)}
                          placeholder="https://api.dify.ai"
                          required
                          className={!formData.api_config.base_url && showValidation ? 'border-destructive' : ''}
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
                          value={formData.api_config.service_api_endpoint}
                          onChange={(e) => updateApiConfig('service_api_endpoint', e.target.value)}
                          placeholder="/chat-messages"
                          required
                          className={!formData.api_config.service_api_endpoint && showValidation ? 'border-destructive' : ''}
                        />
                        {formData.api_config.service_api_endpoint && formData.api_config.service_api_endpoint.includes('://') && (
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
                        value={formData.api_config.api_key}
                        onChange={(e) => updateApiConfig('api_key', e.target.value)}
                        placeholder="app-xxxxxxxxxxxxxxxxxxxxxxxx"
                        required
                        className={!formData.api_config.api_key && showValidation ? 'border-destructive' : ''}
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
                        value={formData.api_config.app_id}
                        onChange={(e) => updateApiConfig('app_id', e.target.value)}
                        placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                        required
                        className={!formData.api_config.app_id && showValidation ? 'border-destructive' : ''}
                      />
                    </div>
                  </TooltipProvider>

                  <Separator />

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="public_url">Public URL</Label>
                      <Input
                        id="public_url"
                        value={formData.api_config.public_url}
                        onChange={(e) => updateApiConfig('public_url', e.target.value)}
                        placeholder="https://api.example.com"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="server_url">Server URL</Label>
                      <Input
                        id="server_url"
                        value={formData.api_config.server_url}
                        onChange={(e) => updateApiConfig('server_url', e.target.value)}
                        placeholder="https://server.api.example.com"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="workflow_id">Workflow ID</Label>
                    <Input
                      id="workflow_id"
                      value={formData.api_config.workflow_id}
                      onChange={(e) => updateApiConfig('workflow_id', e.target.value)}
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