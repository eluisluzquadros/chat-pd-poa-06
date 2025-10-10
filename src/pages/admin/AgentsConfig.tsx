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
import { refreshRAGCacheWithToast } from '@/utils/ragCacheUtils';
import { Separator } from '@/components/ui/separator';
import { AgentFormValidator } from '@/components/admin/AgentFormValidator';
import { AgentPreview } from '@/components/admin/AgentPreview';

// Plataformas e modelos disponíveis para agentes externos
const PLATFORMS = [
  { id: 'lovable', name: 'Lovable', description: '🚀 Agente nativo via Supabase Edge Functions (OpenAI, Gemini, etc.)' },
  { id: 'dify', name: 'Dify', description: 'Plataforma Dify para criação de aplicações AI' },
  { id: 'langflow', name: 'Langflow', description: 'Framework visual para criação de fluxos LangChain' },
  { id: 'crewai', name: 'CrewAI', description: 'Framework para múltiplos agentes AI colaborativos' },
  { id: 'custom', name: 'Personalizado', description: 'API personalizada ou outro provedor' }
];

const LOVABLE_MODELS = [
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', category: 'lovable', description: '⚡ Rápido e econômico (OpenAI)' },
  { id: 'gpt-4o', name: 'GPT-4o', category: 'lovable', description: '🧠 Mais poderoso (OpenAI)' },
  { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', category: 'lovable', description: '🚀 Turbo (OpenAI)' },
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', category: 'lovable', description: '⚡ Rápido e multimodal (Google)' },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', category: 'lovable', description: '🧠 Mais poderoso (Google)' },
];

const MODELS = [
  ...LOVABLE_MODELS,
  { id: 'dify-app', name: 'Aplicação Dify', category: 'dify', description: 'Aplicação customizada no Dify' },
  { id: 'dify-workflow', name: 'Workflow Dify', category: 'dify', description: 'Workflow automatizado no Dify' },
  { id: 'langflow-flow', name: 'Fluxo Langflow', category: 'langflow', description: 'Fluxo criado no Langflow' },
  { id: 'crewai-crew', name: 'Crew CrewAI', category: 'crewai', description: 'Múltiplos agentes do CrewAI' },
  { id: 'claude-3-5-sonnet', name: 'Claude 3.5 Sonnet', category: 'anthropic', description: 'Modelo avançado da Anthropic' },
  { id: 'gpt-4o', name: 'GPT-4o', category: 'openai', description: 'GPT-4 otimizado' },
  { id: 'custom-api', name: 'API Personalizada', category: 'custom', description: 'Endpoint personalizado' },
];

interface AgentFormData {
  name: string;
  display_name: string;
  description: string;
  provider: string;
  model: string;
  is_active: boolean;
  is_default: boolean;
  api_config: ApiConfig; // Configuração da API externa
  parameters: ModelParameters;
}

// Configuração padrão da API externa (sem credenciais por segurança)
const defaultApiConfig: ApiConfig = {
  base_url: 'https://cloud.dify.ai',
  service_api_endpoint: '/api/chat-messages',
  api_key: '',
  app_id: '',
  public_url: 'https://cloud.dify.ai',
  server_url: 'https://cloud.dify.ai',
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
  provider: 'dify',
  model: 'dify-app',
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
    const isCrewAI = formData.provider === 'crewai';
    const isLovable = formData.provider === 'lovable';

    // Para Lovable, nenhum campo de API é obrigatório (usa secrets do Supabase)
    const requiredFields = isLovable ? [] : ['base_url', 'api_key'];
    if (!isCrewAI && !isLovable) {
      requiredFields.push('service_api_endpoint', 'app_id');
    }

    const missingFields = requiredFields.filter(field => !formData.api_config[field as keyof typeof formData.api_config]);

    if (missingFields.length > 0) {
      setActiveTab('api');
      return;
    }

    try {
      const agentData: CreateAgentData = {
        name: formData.name,
        display_name: formData.display_name,
        description: formData.description || undefined,
        provider: formData.provider,
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
      
      // Limpar cache se agente foi definido como padrão
      if (formData.is_default) {
        refreshRAGCacheWithToast();
      }
    } catch (error) {
      // Erro já tratado no hook
    }
  };

  const handlePlatformChange = (provider: string) => {
    setFormData(prev => {
      // Atualizar configuração padrão baseada na plataforma
      let newApiConfig = { ...defaultApiConfig };
      let newModel = '';

    switch (provider) {
      case 'lovable':
        newApiConfig = {
          base_url: '',
          service_api_endpoint: '',
          api_key: '',
          app_id: '',
          server_url: ''
        };
        newModel = 'gpt-4o-mini';
        break;
      case 'dify':
          newApiConfig = {
            base_url: 'https://cloud.dify.ai',
            service_api_endpoint: '/api/chat-messages',
            api_key: '',
            app_id: '',
            public_url: 'https://cloud.dify.ai',
            server_url: 'https://cloud.dify.ai'
          };
          newModel = 'dify-app';
          break;
        case 'langflow':
          newApiConfig = {
            base_url: 'https://api.langflow.org',
            api_key: '',
            workflow_id: '',
            server_url: 'https://api.langflow.org'
          };
          newModel = 'langflow-flow';
          break;
        case 'crewai':
          newApiConfig = {
            base_url: 'https://your-crew-id.crewai.com',
            service_api_endpoint: '', // Opcional para CrewAI
            api_key: '',
            app_id: '', // Opcional para CrewAI (pode ser usado como workflow_id)
            workflow_id: '',
            server_url: 'https://your-crew-id.crewai.com'
          };
          newModel = 'crewai-crew';
          break;
        default:
          newModel = 'custom-api';
          break;
      }

      return {
        ...prev,
        provider,
        model: newModel,
        api_config: newApiConfig
      };
    });
  };

  const handleEdit = (agent: any) => {
    setEditingAgent(agent.id);
    setFormData({
      name: agent.name,
      display_name: agent.display_name,
      description: agent.description || '',
      provider: agent.provider || 'dify',
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
    
    // Auto-sincronizar app_id com api_key se necessário
    if (field === 'api_key' && value.startsWith('app-')) {
      setFormData(prev => ({
        ...prev,
        api_config: { 
          ...prev.api_config, 
          [field]: value,
          app_id: value // Sincronizar app_id automaticamente
        }
      }));
      return;
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
    const isCrewAI = formData.provider === 'crewai';
    
    await testConnection({
      base_url: formData.api_config.base_url,
      api_key: formData.api_config.api_key,
      service_api_endpoint: formData.api_config.service_api_endpoint || (isCrewAI ? '' : undefined),
      app_id: formData.api_config.app_id || (isCrewAI ? formData.api_config.workflow_id : undefined),
      provider: formData.provider, // Passar provedor para teste usar adaptador correto
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
          <h1 className="text-3xl font-bold">Configuração de Agentes IA</h1>
          <p className="text-muted-foreground mt-2">
            Gerencie os agentes de IA conectados a plataformas externas
          </p>
        </div>
        <Button onClick={handleCreate} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Novo Agente IA
        </Button>
      </div>

      {/* Status do Sistema */}
      <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-blue-800 mb-1 flex items-center gap-2">
              🤖 Sistema de Agentes IA - Status Operacional
            </h3>
            <div className="text-sm text-blue-700 space-y-1">
              <p>✅ <strong>API Externa:</strong> {defaultApiConfig.base_url}</p>
              <p>🔑 <strong>Credenciais:</strong> Configure manualmente por segurança</p>
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
                    🤖 Agente IA
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
                    <strong>API Externa:</strong> {agent.api_config.base_url}
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
                      onClick={async () => {
                        await setAsDefault(agent.id);
                        refreshRAGCacheWithToast();
                      }}
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
              <TabsList className={`grid w-full ${formData.provider === 'lovable' ? 'grid-cols-2' : 'grid-cols-3'}`}>
                <TabsTrigger value="general">Geral</TabsTrigger>
                {formData.provider !== 'lovable' && (
                  <TabsTrigger value="api">Conexão API</TabsTrigger>
                )}
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

                {formData.provider === 'lovable' && (
                  <div className="p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <div className="flex items-start gap-3">
                      <div className="text-2xl">🚀</div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">Agente Nativo Lovable</h4>
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                          Este agente usa Supabase Edge Functions. A API Key está armazenada com segurança nos secrets do Supabase.
                          Não é necessário configurar campos de API externa.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

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

                <TooltipProvider>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="provider">Plataforma *</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <AlertCircle className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Plataforma externa do agente (Dify, Langflow, CrewAI, etc.)</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Select value={formData.provider} onValueChange={handlePlatformChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a plataforma" />
                      </SelectTrigger>
                      <SelectContent>
                        {PLATFORMS.map(platform => (
                          <SelectItem key={platform.id} value={platform.id}>
                            <div className="flex flex-col">
                              <span className="font-medium">{platform.name}</span>
                              <span className="text-xs text-muted-foreground">{platform.description}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </TooltipProvider>

                <div className="space-y-2">
                  <Label htmlFor="model">Modelo/Tipo</Label>
                  <Select
                    value={formData.model}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, model: value }))}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o modelo" />
                    </SelectTrigger>
                    <SelectContent>
                      {MODELS
                        .filter(m => m.category === formData.provider || m.category === 'custom')
                        .map((model) => (
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
                    🤖 Configuração da API Externa
                  </h4>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• <strong>Base URL:</strong> {defaultApiConfig.base_url}</li>
                    <li>• <strong>Service Endpoint:</strong> {defaultApiConfig.service_api_endpoint}</li>
                    <li>• <strong>API Key:</strong> Configure manualmente por segurança</li>
                    <li>• <strong>App ID:</strong> ID da aplicação externa</li>
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
                    ...(formData.provider !== 'crewai' ? [
                      { field: 'api_config.service_api_endpoint', label: 'Service API Endpoint', required: true },
                      { field: 'api_config.app_id', label: 'App ID', required: true }
                    ] : []),
                    { field: 'api_config.api_key', label: 'API Key', required: true },
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

                    {formData.provider !== 'crewai' && (
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
                    )}

                    {formData.provider === 'crewai' && (
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="text-sm text-blue-700">
                          <strong>ℹ️ CrewAI:</strong> O Service API Endpoint não é necessário. 
                          O sistema usa automaticamente os endpoints padrão (/inputs, /kickoff, /status).
                        </div>
                      </div>
                    )}
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
                        <Label htmlFor="app_id">
                          {formData.provider === 'crewai' ? 'Workflow ID (Opcional)' : 'App ID *'}
                        </Label>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <AlertCircle className="h-4 w-4 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>
                              {formData.provider === 'crewai' 
                                ? 'ID do workflow do CrewAI (opcional para referência)'
                                : 'Identificador único da aplicação no Dify'
                              }
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <Input
                        id="app_id"
                        value={formData.api_config.app_id}
                        onChange={(e) => updateApiConfig('app_id', e.target.value)}
                        placeholder={formData.provider === 'crewai' 
                          ? 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx (opcional)'
                          : 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
                        }
                        required={formData.provider !== 'crewai'}
                        className={!formData.api_config.app_id && showValidation && formData.provider !== 'crewai' ? 'border-destructive' : ''}
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
                        disabled={testing || !formData.api_config.base_url || !formData.api_config.api_key}
                        className="w-full"
                      >
                        {testing ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <TestTube className="h-4 w-4 mr-2" />
                        )}
                        {testing ? 'Testando Conexão...' : 'Testar Conexão API'}
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