import { supabase } from '@/integrations/supabase/client';
import { AuthService } from '@/services/authService';

export interface ExternalKnowledgeBase {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  provider: 'llamacloud' | 'pinecone' | 'weaviate' | 'custom';
  config: Record<string, any>;
  retrieval_settings: {
    top_k: number;
    score_threshold: number;
    [key: string]: any;
  };
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AgentKnowledgeBase {
  id: string;
  agent_id: string;
  knowledge_base_id: string;
  priority: number;
  is_active: boolean;
  created_at: string;
  knowledge_base?: ExternalKnowledgeBase;
}

export interface CreateKnowledgeBaseData {
  name: string;
  display_name: string;
  description?: string;
  provider: 'llamacloud' | 'pinecone' | 'weaviate' | 'custom';
  config: Record<string, any>;
  retrieval_settings?: {
    top_k?: number;
    score_threshold?: number;
    [key: string]: any;
  };
  is_active?: boolean;
}

class KnowledgeBaseService {
  private static instance: KnowledgeBaseService;

  static getInstance(): KnowledgeBaseService {
    if (!KnowledgeBaseService.instance) {
      KnowledgeBaseService.instance = new KnowledgeBaseService();
    }
    return KnowledgeBaseService.instance;
  }

  async getAllKnowledgeBases(): Promise<ExternalKnowledgeBase[]> {
    const { data, error } = await supabase
      .from('external_knowledge_bases')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching knowledge bases:', error);
      throw error;
    }

    return data || [];
  }

  async getActiveKnowledgeBases(): Promise<ExternalKnowledgeBase[]> {
    const { data, error } = await supabase
      .from('external_knowledge_bases')
      .select('*')
      .eq('is_active', true)
      .order('display_name', { ascending: true });

    if (error) {
      console.error('Error fetching active knowledge bases:', error);
      throw error;
    }

    return data || [];
  }

  async createKnowledgeBase(kbData: CreateKnowledgeBaseData): Promise<ExternalKnowledgeBase> {
    // Refresh session if needed before critical operation
    await AuthService.refreshSessionIfNeeded();
    
    const cleanData = {
      name: kbData.name,
      display_name: kbData.display_name,
      description: kbData.description || null,
      provider: kbData.provider,
      config: kbData.config || {},
      retrieval_settings: kbData.retrieval_settings || { top_k: 5, score_threshold: 0.7 },
      is_active: kbData.is_active ?? true,
    };

    const { data, error } = await supabase
      .from('external_knowledge_bases')
      .insert(cleanData)
      .select()
      .single();

    if (error) {
      console.error('Error creating knowledge base:', error);
      throw error;
    }

    return data;
  }

  async updateKnowledgeBase(
    id: string,
    kbData: Partial<CreateKnowledgeBaseData>
  ): Promise<ExternalKnowledgeBase> {
    // Refresh session if needed before critical operation
    await AuthService.refreshSessionIfNeeded();
    
    const updateData: Record<string, any> = {};

    if (kbData.name !== undefined) updateData.name = kbData.name;
    if (kbData.display_name !== undefined) updateData.display_name = kbData.display_name;
    if (kbData.description !== undefined) updateData.description = kbData.description;
    if (kbData.provider !== undefined) updateData.provider = kbData.provider;
    if (kbData.config !== undefined) updateData.config = kbData.config;
    if (kbData.retrieval_settings !== undefined) updateData.retrieval_settings = kbData.retrieval_settings;
    if (kbData.is_active !== undefined) updateData.is_active = kbData.is_active;

    const { data, error } = await supabase
      .from('external_knowledge_bases')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating knowledge base:', error);
      throw error;
    }

    return data;
  }

  async deleteKnowledgeBase(id: string): Promise<void> {
    // Refresh session if needed before critical operation
    await AuthService.refreshSessionIfNeeded();
    
    const { error } = await supabase
      .from('external_knowledge_bases')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting knowledge base:', error);
      throw error;
    }
  }

  async toggleKnowledgeBaseStatus(id: string, is_active: boolean): Promise<ExternalKnowledgeBase> {
    const { data, error } = await supabase
      .from('external_knowledge_bases')
      .update({ is_active })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error toggling knowledge base status:', error);
      throw error;
    }

    return data;
  }

  // Agent-Knowledge Base links
  async getAgentKnowledgeBases(agentId: string): Promise<AgentKnowledgeBase[]> {
    const { data, error } = await supabase
      .from('agent_knowledge_bases')
      .select(`
        *,
        knowledge_base:external_knowledge_bases(*)
      `)
      .eq('agent_id', agentId)
      .eq('is_active', true)
      .order('priority', { ascending: true });

    if (error) {
      console.error('Error fetching agent knowledge bases:', error);
      throw error;
    }

    return data || [];
  }

  async linkAgentToKB(
    agentId: string,
    knowledgeBaseId: string,
    priority: number = 1
  ): Promise<AgentKnowledgeBase> {
    const { data, error } = await supabase
      .from('agent_knowledge_bases')
      .insert({
        agent_id: agentId,
        knowledge_base_id: knowledgeBaseId,
        priority,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error('Error linking agent to knowledge base:', error);
      throw error;
    }

    return data;
  }

  async unlinkAgentFromKB(agentId: string, knowledgeBaseId: string): Promise<void> {
    const { error } = await supabase
      .from('agent_knowledge_bases')
      .delete()
      .eq('agent_id', agentId)
      .eq('knowledge_base_id', knowledgeBaseId);

    if (error) {
      console.error('Error unlinking agent from knowledge base:', error);
      throw error;
    }
  }

  async updateAgentKBLinks(
    agentId: string,
    knowledgeBaseIds: string[]
  ): Promise<void> {
    // Remove existing links
    await supabase
      .from('agent_knowledge_bases')
      .delete()
      .eq('agent_id', agentId);

    // Create new links
    if (knowledgeBaseIds.length > 0) {
      const links = knowledgeBaseIds.map((kbId, index) => ({
        agent_id: agentId,
        knowledge_base_id: kbId,
        priority: index + 1,
        is_active: true,
      }));

      const { error } = await supabase
        .from('agent_knowledge_bases')
        .insert(links);

      if (error) {
        console.error('Error updating agent KB links:', error);
        throw error;
      }
    }
  }
}

export const knowledgeBaseService = KnowledgeBaseService.getInstance();
