import { useState, useCallback, useEffect } from 'react';
import { useAgents } from '@/hooks/useAgents';

export function useAgentSelection() {
  const { agents, loading: agentsLoading } = useAgents();
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  // Set default agent when agents are loaded
  useEffect(() => {
    if (!agentsLoading && agents.length > 0 && !selectedAgent) {
      const defaultAgent = agents.find(agent => agent.is_default && agent.is_active);
      const firstActiveAgent = agents.find(agent => agent.is_active);
      
      if (defaultAgent) {
        setSelectedAgent(defaultAgent.id);
      } else if (firstActiveAgent) {
        setSelectedAgent(firstActiveAgent.id);
      }
    }
  }, [agents, agentsLoading, selectedAgent]);

  const switchAgent = useCallback(async (agentId: string) => {
    setIsLoading(true);
    try {
      setSelectedAgent(agentId);
    } catch (error) {
      console.error('Error switching agent:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getSelectedAgentData = useCallback(() => {
    return agents.find(agent => agent.id === selectedAgent);
  }, [agents, selectedAgent]);

  return {
    selectedAgent,
    isLoading: isLoading || agentsLoading,
    switchAgent,
    getSelectedAgentData,
    agents
  };
}