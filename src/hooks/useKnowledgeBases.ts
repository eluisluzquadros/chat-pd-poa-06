import { useState, useEffect } from 'react';
import { knowledgeBaseService, ExternalKnowledgeBase, AgentKnowledgeBase } from '@/services/knowledgeBaseService';
import { useToast } from '@/hooks/use-toast';

export function useKnowledgeBases() {
  const [knowledgeBases, setKnowledgeBases] = useState<ExternalKnowledgeBase[]>([]);
  const [agentKBLinks, setAgentKBLinks] = useState<Record<string, AgentKnowledgeBase[]>>({});
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const loadKnowledgeBases = async () => {
    setLoading(true);
    try {
      const data = await knowledgeBaseService.getActiveKnowledgeBases();
      setKnowledgeBases(data);
    } catch (error) {
      console.error('Error loading knowledge bases:', error);
      toast({
        variant: "destructive",
        title: "Erro ao carregar bases de conhecimento",
        description: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadAgentKBLinks = async (agentId: string) => {
    try {
      const links = await knowledgeBaseService.getAgentKnowledgeBases(agentId);
      setAgentKBLinks(prev => ({
        ...prev,
        [agentId]: links
      }));
      return links;
    } catch (error) {
      console.error('Error loading agent KB links:', error);
      return [];
    }
  };

  useEffect(() => {
    loadKnowledgeBases();
  }, []);

  return {
    knowledgeBases,
    agentKBLinks,
    loading,
    loadKnowledgeBases,
    loadAgentKBLinks
  };
}
