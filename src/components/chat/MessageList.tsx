import { Message } from "@/types/chat";
import { Button } from "@/components/ui/button";
import { Code, Copy, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useRef, memo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageContent } from "./MessageContent";
import { AgenticV2ResponseRenderer } from "./AgenticV2ResponseRenderer";
import { cn } from "@/lib/utils";
import { useAgents } from "@/hooks/useAgents";
import { useAuth } from "@/context/AuthContext";

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
  currentSessionId?: string | null;
}

export const MessageList = memo(function MessageList({
  messages,
  isLoading,
  currentSessionId
}: MessageListProps) {
  const { toast } = useToast();
  const { isAdmin } = useAuth();
  const { agents } = useAgents(); // Para buscar nomes dos agentes

  // Função para buscar nome do agente pelo ID/model
  const getAgentDisplayName = (model?: string) => {
    if (!model || !agents) return 'agentic-rag-v2';
    
    // Buscar agente pelo ID (model contém o ID do agente)
    const agent = agents.find(a => a.id === model);
    if (agent) {
      return agent.display_name || agent.name;
    }
    
    // Fallback para o valor original
    return 'agentic-rag-v2';
  };
  const scrollRef = useRef<HTMLDivElement>(null);
  const isAutoScrollEnabled = useRef(true);

  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    toast({
      description: "Mensagem copiada para a área de transferência"
    });
  };

  useEffect(() => {
    requestAnimationFrame(() => {
      if (scrollRef.current && isAutoScrollEnabled.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    });
  }, [messages, isLoading]);

  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const element = event.currentTarget;
    const isAtBottom = Math.abs(element.scrollHeight - element.scrollTop - element.clientHeight) < 100;
    isAutoScrollEnabled.current = isAtBottom;
  };

  return (
    <div 
      ref={scrollRef} 
      onScroll={handleScroll} 
      className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent"
    >
      <div className="max-w-4xl mx-auto px-2 sm:px-4 space-y-4 sm:space-y-6">
        {messages.length > 0 ? (
          <>
            {messages.map((message) => (
              <div 
                key={message.id} 
                className={cn(
                  "flex w-full gap-2 sm:gap-3",
                  message.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                {/* Avatar ANTES da mensagem (não absoluto) - apenas em desktop */}
                {message.role === "assistant" && (
                  <div className="hidden sm:flex w-8 h-8 rounded-full items-center justify-center bg-background border border-border shadow-sm flex-shrink-0 mt-1">
                    <Code className="h-4 w-4 text-primary" />
                  </div>
                )}
                
                {/* Mensagem */}
                <div 
                  className={cn(
                    "group relative flex-1 max-w-[90%] sm:max-w-[85%] md:max-w-[75%] lg:max-w-[70%]",
                    "rounded-2xl p-3 sm:p-4 shadow-sm transition-all duration-200",
                    message.role === "user" 
                      ? "bg-primary text-primary-foreground ml-auto" 
                      : "bg-card text-card-foreground border border-border"
                  )}
                >
                  {/* Botão de copiar - ajustado para mobile */}
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className={cn(
                      "absolute top-1 right-1 sm:top-2 sm:right-2",
                      "h-6 w-6 sm:h-7 sm:w-7",
                      "opacity-0 group-hover:opacity-100 transition-opacity duration-200",
                      message.role === "user" 
                        ? "text-primary-foreground/70 hover:bg-primary-foreground/10" 
                        : "text-muted-foreground hover:bg-muted"
                    )}
                    onClick={() => copyMessage(message.content)}
                  >
                    <Copy className="h-3 w-3 sm:h-4 sm:w-4" />
                  </Button>

                  {/* Conteúdo - com padding para botão de copiar */}
                  <div className="pr-7 sm:pr-8">
                    {message.role === "assistant" ? (
                      <AgenticV2ResponseRenderer 
                        content={message.content} 
                        isAgenticV2={true}
                        isAdmin={isAdmin}
                        isTestMode={false}
                        agentName={getAgentDisplayName(message.model)}
                      />
                    ) : (
                      <MessageContent 
                        content={message.content} 
                        role={message.role}
                      />
                    )}
                  </div>

                  {/* Timestamp */}
                  <div className={cn(
                    "flex items-center justify-between mt-2 sm:mt-3 text-xs",
                    message.role === "user" 
                      ? "text-primary-foreground/70" 
                      : "text-muted-foreground"
                  )}>
                    <span className="text-[10px] sm:text-xs">
                      {message.timestamp.toLocaleTimeString('pt-BR')}
                    </span>
                    {message.role === "assistant" && (
                      <span className="ml-2 text-[10px] sm:text-xs">via ChatPDPOA</span>
                    )}
                  </div>
                </div>

                {/* Avatar DEPOIS da mensagem - apenas em desktop */}
                {message.role === "user" && (
                  <div className="hidden sm:flex w-8 h-8 rounded-full items-center justify-center bg-background border border-border shadow-sm flex-shrink-0 mt-1">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                )}
              </div>
            ))}

            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-card text-card-foreground border border-border rounded-2xl p-4 max-w-[95%] sm:max-w-[85%] md:max-w-[75%] lg:max-w-[70%] shadow-sm relative">
                  {/* Avatar de loading */}
                  <div className="hidden sm:flex absolute -left-9 top-2 w-7 h-7 rounded-full items-center justify-center bg-background border border-border shadow-sm">
                    <Code className="h-4 w-4 text-primary" />
                  </div>

                  {/* Animação de typing */}
                  <div className="flex space-x-1 mb-2">
                    <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>

                  {/* Skeleton loaders */}
                  <div className="space-y-2">
                    <Skeleton className="h-3 w-[200px]" />
                    <Skeleton className="h-3 w-[150px]" />
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          /* Estado vazio - não deveria ser usado pois ChatMain gerencia isso */
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4 px-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Code className="h-6 w-6 text-primary" />
            </div>
            <div className="max-w-sm space-y-2">
              <h2 className="text-xl font-semibold">Bem-vindo ao ChatPDPOA</h2>
              <p className="text-sm text-muted-foreground">
                Tire suas dúvidas sobre o Plano Diretor de Porto Alegre. O assistente está pronto para ajudar!
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});