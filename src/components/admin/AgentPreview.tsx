import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ApiConfig, ModelParameters } from '@/services/agentsService';
import { Eye, Settings, Zap } from 'lucide-react';

interface AgentPreviewProps {
  formData: {
    name: string;
    display_name: string;
    description: string;
    provider: string;
    model: string;
    is_active: boolean;
    is_default: boolean;
    api_config: ApiConfig;
    parameters: ModelParameters;
  };
}

export function AgentPreview({ formData }: AgentPreviewProps) {
  const formatApiUrl = () => {
    if (!formData.api_config.base_url) {
      return 'URL não configurada';
    }
    
    // Para CrewAI, não precisa de service_api_endpoint
    if (formData.provider === 'crewai') {
      return formData.api_config.base_url;
    }
    
    // Para outros provedores, precisa de service_api_endpoint
    if (!formData.api_config.service_api_endpoint) {
      return 'Service endpoint não configurado';
    }
    
    try {
      return new URL(formData.api_config.service_api_endpoint, formData.api_config.base_url).toString();
    } catch {
      return `${formData.api_config.base_url}${formData.api_config.service_api_endpoint}`;
    }
  };

  const getModelDisplayName = () => {
    const modelMap: Record<string, string> = {
      'custom-app': '🤖 Aplicação Personalizada',
      'custom-workflow': '⚡ Workflow Automatizado',
      'claude-3-5-sonnet-20241022': 'Claude 3.5 Sonnet',
      'claude-3-5-haiku-20241022': 'Claude 3.5 Haiku',
      'gpt-5-nano-2025-08-07': 'GPT-5 Nano',
      'gpt-4o': 'GPT-4o',
      'gpt-4o-mini': 'GPT-4o Mini',
    };
    
    return modelMap[formData.model] || formData.model;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Eye className="h-4 w-4" />
        <span className="text-sm font-medium">Preview da Configuração</span>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">{formData.display_name || 'Nome não definido'}</CardTitle>
              <CardDescription className="mt-1">
                {formData.name || 'Nome técnico não definido'}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Badge variant={formData.is_active ? 'default' : 'secondary'}>
                {formData.is_active ? 'Ativo' : 'Inativo'}
              </Badge>
              {formData.is_default && (
                <Badge variant="default">
                  Padrão
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {formData.description && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-1">Descrição</h4>
              <p className="text-sm">{formData.description}</p>
            </div>
          )}

          <Separator />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-1">Modelo</h4>
              <p className="text-sm font-medium">{getModelDisplayName()}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-1">Provedor</h4>
              <p className="text-sm">
                {formData.provider === 'crewai' ? '🤖 CrewAI' : 
                 formData.provider === 'dify' ? '🔧 Dify' : 
                 formData.provider === 'langflow' ? '🌊 Langflow' : 
                 '🤖 API Externa'}
              </p>
            </div>
          </div>

          <Separator />

            <div>
              <div className="flex items-center gap-2 mb-3">
                <Settings className="h-4 w-4" />
                <h4 className="text-sm font-medium">Configuração da API</h4>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-muted-foreground">URL da API:</span>
                    <p className="font-mono text-xs break-all">{formatApiUrl()}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">
                      {formData.provider === 'crewai' ? 'Workflow ID:' : 'App ID:'}
                    </span>
                    <p className="font-mono text-xs">
                      {formData.api_config.app_id || 
                       (formData.provider === 'crewai' ? 'Opcional' : 'Não configurado')}
                    </p>
                  </div>
                </div>
                
                <div>
                  <span className="text-muted-foreground">API Key:</span>
                  <p className="font-mono text-xs">
                    {formData.api_config.api_key ? 
                      `${formData.api_config.api_key.substring(0, 8)}...${formData.api_config.api_key.slice(-4)}` : 
                      'Não configurada'
                    }
                  </p>
                </div>
              </div>
            </div>

          <Separator />

          <div>
            <div className="flex items-center gap-2 mb-3">
              <Zap className="h-4 w-4" />
              <h4 className="text-sm font-medium">Parâmetros do Modelo</h4>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Temperature:</span>
                <p>{formData.parameters.temperature || 0.7}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Max Tokens:</span>
                <p>{formData.parameters.max_tokens || 4000}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Top P:</span>
                <p>{formData.parameters.top_p || 1}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Streaming:</span>
                <p>{formData.parameters.stream ? 'Ativado' : 'Desativado'}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}