import { useState, useEffect } from 'react';
import { agentsService, Agent, CreateAgentData } from '@/services/agentsService';
import { toast } from 'sonner';

export const useAgents = () => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);

  const loadAgents = async () => {
    try {
      setLoading(true);
      const data = await agentsService.getAllAgents();
      setAgents(data);
    } catch (error) {
      console.error('Erro ao carregar agentes:', error);
      toast.error('Erro ao carregar agentes');
    } finally {
      setLoading(false);
    }
  };

  const createAgent = async (agentData: CreateAgentData) => {
    try {
      setCreating(true);
      const newAgent = await agentsService.createAgent(agentData);
      setAgents(prev => [newAgent, ...prev]);
      toast.success('Agente criado com sucesso');
      return newAgent;
    } catch (error) {
      console.error('Erro ao criar agente:', error);
      toast.error('Erro ao criar agente');
      throw error;
    } finally {
      setCreating(false);
    }
  };

  const updateAgent = async (id: string, agentData: Partial<CreateAgentData>) => {
    try {
      setUpdating(true);
      const updatedAgent = await agentsService.updateAgent(id, agentData);
      setAgents(prev => prev.map(agent => 
        agent.id === id ? updatedAgent : agent
      ));
      toast.success('Agente atualizado com sucesso');
      return updatedAgent;
    } catch (error) {
      console.error('Erro ao atualizar agente:', error);
      toast.error('Erro ao atualizar agente');
      throw error;
    } finally {
      setUpdating(false);
    }
  };

  const deleteAgent = async (id: string) => {
    try {
      await agentsService.deleteAgent(id);
      setAgents(prev => prev.filter(agent => agent.id !== id));
      toast.success('Agente removido com sucesso');
    } catch (error) {
      console.error('Erro ao remover agente:', error);
      toast.error('Erro ao remover agente');
    }
  };

  const toggleAgentStatus = async (id: string, is_active: boolean) => {
    try {
      const updatedAgent = await agentsService.toggleAgentStatus(id, is_active);
      setAgents(prev => prev.map(agent => 
        agent.id === id ? updatedAgent : agent
      ));
      toast.success(`Agente ${is_active ? 'ativado' : 'desativado'} com sucesso`);
    } catch (error) {
      console.error('Erro ao alterar status do agente:', error);
      toast.error('Erro ao alterar status do agente');
    }
  };

  const setAsDefault = async (id: string) => {
    try {
      const updatedAgent = await agentsService.setAsDefault(id);
      // Atualizar todos os agentes (remover padrão dos outros, definir no atual)
      setAgents(prev => prev.map(agent => ({
        ...agent,
        is_default: agent.id === id
      })));
      toast.success('Agente definido como padrão');
    } catch (error) {
      console.error('Erro ao definir agente como padrão:', error);
      toast.error('Erro ao definir agente como padrão');
    }
  };

  useEffect(() => {
    loadAgents();
  }, []);

  return {
    agents,
    loading,
    creating,
    updating,
    createAgent,
    updateAgent,
    deleteAgent,
    toggleAgentStatus,
    setAsDefault,
    refreshAgents: loadAgents,
  };
};