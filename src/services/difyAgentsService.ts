import { supabase } from '@/integrations/supabase/client';

export interface DifyAgent {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  provider: string;
  model: string;
  dify_config: any;
  parameters: any;
  is_active: boolean;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateDifyAgentData {
  name: string;
  display_name: string;
  description?: string;
  provider: string;
  model: string;
  dify_config?: any;
  parameters?: any;
  is_active?: boolean;
  is_default?: boolean;
}

export class DifyAgentsService {
  private static instance: DifyAgentsService;

  static getInstance(): DifyAgentsService {
    if (!DifyAgentsService.instance) {
      DifyAgentsService.instance = new DifyAgentsService();
    }
    return DifyAgentsService.instance;
  }

  async getAllAgents(): Promise<DifyAgent[]> {
    const { data, error } = await supabase
      .from('dify_agents')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar agentes:', error);
      throw error;
    }

    return data || [];
  }

  async getActiveAgents(): Promise<DifyAgent[]> {
    const { data, error } = await supabase
      .from('dify_agents')
      .select('*')
      .eq('is_active', true)
      .order('display_name', { ascending: true });

    if (error) {
      console.error('Erro ao buscar agentes ativos:', error);
      throw error;
    }

    return data || [];
  }

  async getDefaultAgent(): Promise<DifyAgent | null> {
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

    return data || null;
  }

  async createAgent(agentData: CreateDifyAgentData): Promise<DifyAgent> {
    // Se este agente está sendo marcado como padrão, desmarcar outros
    if (agentData.is_default) {
      await this.clearDefaultAgent();
    }

    const { data, error } = await supabase
      .from('dify_agents')
      .insert({
        ...agentData,
        dify_config: agentData.dify_config || {},
        parameters: agentData.parameters || {},
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar agente:', error);
      throw error;
    }

    return data;
  }

  async updateAgent(id: string, agentData: Partial<CreateDifyAgentData>): Promise<DifyAgent> {
    // Se este agente está sendo marcado como padrão, desmarcar outros
    if (agentData.is_default) {
      await this.clearDefaultAgent();
    }

    const { data, error } = await supabase
      .from('dify_agents')
      .update(agentData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar agente:', error);
      throw error;
    }

    return data;
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

  async toggleAgentStatus(id: string, is_active: boolean): Promise<DifyAgent> {
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

    return data;
  }

  async setAsDefault(id: string): Promise<DifyAgent> {
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

    return data;
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

  async getAgentByName(name: string): Promise<DifyAgent | null> {
    const { data, error } = await supabase
      .from('dify_agents')
      .select('*')
      .eq('name', name)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Erro ao buscar agente por nome:', error);
      throw error;
    }

    return data || null;
  }
}

export const difyAgentsService = DifyAgentsService.getInstance();