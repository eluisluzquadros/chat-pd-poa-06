import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Bot, Loader2 } from "lucide-react";

interface SecurityAgentSelectorProps {
  selectedAgentId: string | null;
  onAgentChange: (agentId: string | null) => void;
}

export function SecurityAgentSelector({ selectedAgentId, onAgentChange }: SecurityAgentSelectorProps) {
  const { data: agents, isLoading } = useQuery({
    queryKey: ['dify-agents-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dify_agents')
        .select('*')
        .eq('is_active', true)
        .order('display_name');
      
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Carregando agentes...
      </div>
    );
  }

  if (!agents || agents.length === 0) {
    return (
      <div className="text-sm text-destructive">
        Nenhum agente ativo encontrado. Configure um agente em Admin &gt; RAG Configuration.
      </div>
    );
  }

  const defaultAgent = agents.find(a => a.is_default);
  const currentValue = selectedAgentId || defaultAgent?.id || '';

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2">
        <Bot className="h-4 w-4" />
        Agente a Testar
      </Label>
      <Select
        value={currentValue}
        onValueChange={(value) => onAgentChange(value || null)}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Selecione o agente" />
        </SelectTrigger>
        <SelectContent>
          {agents.map((agent) => (
            <SelectItem key={agent.id} value={agent.id}>
              <div className="flex items-center gap-2">
                <span>{agent.display_name}</span>
                {agent.is_default && (
                  <span className="text-xs text-muted-foreground">(padrão)</span>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">
        Agente selecionado: {agents.find(a => a.id === currentValue)?.display_name || 'Nenhum'}
      </p>
    </div>
  );
}
