import React, { useState } from 'react';
import { Plus, Settings, Power, Star, Trash2, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDifyAgents } from '@/hooks/useDifyAgents';
import { CreateDifyAgentData } from '@/services/difyAgentsService';
import { Separator } from '@/components/ui/separator';

// Modelos disponíveis por provedor
const PROVIDERS = {
  anthropic: {
    name: 'Anthropic',
    models: [
      { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet' },
      { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku' },
    ]
  },
  openai: {
    name: 'OpenAI',
    models: [
      { id: 'gpt-5-nano-2025-08-07', name: 'GPT-5 Nano' },
      { id: 'gpt-4o', name: 'GPT-4o' },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
    ]
  },
  legacy: {
    name: 'Sistema Legado',
    models: [
      { id: 'supabase-rag', name: 'Supabase RAG' },
    ]
  }
};

interface AgentFormData {
  name: string;
  display_name: string;
  description: string;
  provider: string;
  model: string;
  is_active: boolean;
  is_default: boolean;
}

const defaultFormData: AgentFormData = {
  name: '',
  display_name: '',
  description: '',
  provider: '',
  model: '',
  is_active: true,
  is_default: false,
};

export default function AgentsConfig() {
  const { agents, loading, creating, updateAgent, createAgent, deleteAgent, toggleAgentStatus, setAsDefault } = useDifyAgents();
  const [showDialog, setShowDialog] = useState(false);
  const [editingAgent, setEditingAgent] = useState<string | null>(null);
  const [formData, setFormData] = useState<AgentFormData>(defaultFormData);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validação básica
    if (!formData.name || !formData.display_name || !formData.provider || !formData.model) {
      return;
    }

    try {
      const agentData: CreateDifyAgentData = {
        name: formData.name,
        display_name: formData.display_name,
        description: formData.description || undefined,
        provider: formData.provider,
        model: formData.model,
        is_active: formData.is_active,
        is_default: formData.is_default,
      };

      if (editingAgent) {
        await updateAgent(editingAgent, agentData);
      } else {
        await createAgent(agentData);
      }

      setShowDialog(false);
      setEditingAgent(null);
      setFormData(defaultFormData);
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
      provider: agent.provider,
      model: agent.model,
      is_active: agent.is_active,
      is_default: agent.is_default,
    });
    setShowDialog(true);
  };

  const handleCreate = () => {
    setEditingAgent(null);
    setFormData(defaultFormData);
    setShowDialog(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja remover este agente?')) {
      await deleteAgent(id);
    }
  };

  const getProviderBadgeVariant = (provider: string) => {
    switch (provider) {
      case 'anthropic': return 'default';
      case 'openai': return 'secondary';
      case 'legacy': return 'outline';
      default: return 'outline';
    }
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
                  <Badge variant={getProviderBadgeVariant(agent.provider)}>
                    {PROVIDERS[agent.provider as keyof typeof PROVIDERS]?.name || agent.provider}
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingAgent ? 'Editar Agente' : 'Novo Agente'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="display_name">Nome de Exibição</Label>
              <Input
                id="display_name"
                value={formData.display_name}
                onChange={(e) => setFormData(prev => ({ ...prev, display_name: e.target.value }))}
                placeholder="ex: Claude 3.5 Sonnet"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Nome Técnico</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="ex: agentic-claude_35_sonnet"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="provider">Provedor</Label>
              <Select
                value={formData.provider}
                onValueChange={(value) => setFormData(prev => ({ ...prev, provider: value, model: '' }))}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o provedor" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PROVIDERS).map(([key, provider]) => (
                    <SelectItem key={key} value={key}>
                      {provider.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="model">Modelo</Label>
              <Select
                value={formData.model}
                onValueChange={(value) => setFormData(prev => ({ ...prev, model: value }))}
                required
                disabled={!formData.provider}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o modelo" />
                </SelectTrigger>
                <SelectContent>
                  {formData.provider && PROVIDERS[formData.provider as keyof typeof PROVIDERS]?.models.map((model) => (
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

            <div className="flex gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)} className="flex-1">
                Cancelar
              </Button>
              <Button type="submit" disabled={creating} className="flex-1">
                {editingAgent ? 'Atualizar' : 'Criar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}