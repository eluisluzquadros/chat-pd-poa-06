import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

export interface ApiConfig {
  base_url?: string;
  service_api_endpoint?: string;
  api_key?: string;
  app_id?: string;
  public_url?: string;
  server_url?: string;
  workflow_id?: string;
}

export interface ModelParameters {
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  stream?: boolean;
  timeout?: number;
  max_retries?: number;
  response_format?: 'text' | 'json';
}

export interface Agent {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  provider: string;
  model: string;
  api_config?: ApiConfig;
  parameters?: ModelParameters;
  is_active: boolean;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateAgentData {
  name: string;
  display_name: string;
  description?: string;
  provider: string;
  model: string;
  api_config?: ApiConfig;
  parameters?: ModelParameters;
  is_active?: boolean;
  is_default?: boolean;
}

export class AgentsService {
  private static instance: AgentsService;

  static getInstance(): AgentsService {
    if (!AgentsService.instance) {
      AgentsService.instance = new AgentsService();
    }
    return AgentsService.instance;
  }

  async getAllAgents(): Promise<Agent[]> {
    const { data, error } = await supabase
      .from('dify_agents')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar agentes:', error);
      throw error;
    }

    return (data || []).map(agent => ({
      ...agent,
      api_config: (agent.dify_config as unknown as ApiConfig) || {},
      parameters: (agent.parameters as unknown as ModelParameters) || {},
    }));
  }

  async getActiveAgents(): Promise<Agent[]> {
    const { data, error } = await supabase
      .from('dify_agents')
      .select('*')
      .eq('is_active', true)
      .order('display_name', { ascending: true });

    if (error) {
      console.error('Erro ao buscar agentes ativos:', error);
      throw error;
    }

    return (data || []).map(agent => ({
      ...agent,
      api_config: (agent.dify_config as unknown as ApiConfig) || {},
      parameters: (agent.parameters as unknown as ModelParameters) || {},
    }));
  }

  async getDefaultAgent(): Promise<Agent | null> {
    const { data, error } = await supabase
      .from('dify_agents')
      .select('*')
      .eq('is_default', true)
      .eq('is_active', true)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Erro ao buscar agente padrão:', error);
      throw error;
    }

    if (!data) return null;

    return {
      ...data,
      api_config: (data.dify_config as unknown as ApiConfig) || {},
      parameters: (data.parameters as unknown as ModelParameters) || {},
    };
  }

  async createAgent(agentData: CreateAgentData): Promise<Agent> {
    // Se este agente está sendo marcado como padrão, desmarcar outros
    if (agentData.is_default) {
      await this.clearDefaultAgent();
    }

    const { data, error } = await supabase
      .from('dify_agents')
      .insert({
        ...agentData,
        dify_config: (agentData.api_config || {}) as Json,
        parameters: (agentData.parameters || {}) as Json,
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar agente:', error);
      throw error;
    }

    return {
      ...data,
      api_config: (data.dify_config as unknown as ApiConfig) || {},
      parameters: (data.parameters as unknown as ModelParameters) || {},
    };
  }

  async updateAgent(id: string, agentData: Partial<CreateAgentData>): Promise<Agent> {
    // Se este agente está sendo marcado como padrão, desmarcar outros
    if (agentData.is_default) {
      await this.clearDefaultAgent();
    }

    const updateData = {
      ...agentData,
      ...(agentData.api_config && { dify_config: agentData.api_config as unknown as Json }),
      ...(agentData.parameters && { parameters: agentData.parameters as unknown as Json }),
    };

    const { data, error } = await supabase
      .from('dify_agents')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar agente:', error);
      throw error;
    }

    return {
      ...data,
      api_config: (data.dify_config as unknown as ApiConfig) || {},
      parameters: (data.parameters as unknown as ModelParameters) || {},
    };
  }

  async deleteAgent(id: string): Promise<void> {
    const { error } = await supabase
      .from('dify_agents')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao deletar agente:', error);
      throw error;
    }
  }

  async toggleAgentStatus(id: string, is_active: boolean): Promise<Agent> {
    const { data, error } = await supabase
      .from('dify_agents')
      .update({ is_active })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao alterar status do agente:', error);
      throw error;
    }

    return {
      ...data,
      api_config: (data.dify_config as unknown as ApiConfig) || {},
      parameters: (data.parameters as unknown as ModelParameters) || {},
    };
  }

  async setAsDefault(id: string): Promise<Agent> {
    // Primeiro, remover o padrão de outros agentes
    await this.clearDefaultAgent();

    // Depois, definir este como padrão
    const { data, error } = await supabase
      .from('dify_agents')
      .update({ is_default: true })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao definir agente como padrão:', error);
      throw error;
    }

    return {
      ...data,
      api_config: (data.dify_config as unknown as ApiConfig) || {},
      parameters: (data.parameters as unknown as ModelParameters) || {},
    };
  }

  private async clearDefaultAgent(): Promise<void> {
    const { error } = await supabase
      .from('dify_agents')
      .update({ is_default: false })
      .eq('is_default', true);

    if (error) {
      console.error('Erro ao limpar agente padrão:', error);
      throw error;
    }
  }

  async getAgentByName(name: string): Promise<Agent | null> {
    const { data, error } = await supabase
      .from('dify_agents')
      .select('*')
      .eq('name', name)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Erro ao buscar agente por nome:', error);
      throw error;
    }

    if (!data) return null;

    return {
      ...data,
      api_config: (data.dify_config as unknown as ApiConfig) || {},
      parameters: (data.parameters as unknown as ModelParameters) || {},
    };
  }
}

export const agentsService = AgentsService.getInstance();