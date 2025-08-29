import { Message } from "@/types/chat";
import { Button } from "@/components/ui/button";
import { Code, Copy, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useRef, memo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageContent } from "./MessageContent";
import { cn } from "@/lib/utils";
interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
  currentSessionId?: string | null;
  selectedModel?: string;
}

export const MessageList = memo(function MessageList({
  messages,
  isLoading,
  currentSessionId,
  selectedModel
}: MessageListProps) {
  const { toast } = useToast();
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
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {messages.length > 0 ? (
          <>
            {messages.map((message) => (
              <div 
                key={message.id} 
                className={cn(
                  "flex w-full",
                  message.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                <div 
                  className={cn(
                    "group relative max-w-[95%] sm:max-w-[85%] md:max-w-[75%] lg:max-w-[70%]",
                    "rounded-2xl p-4 shadow-sm transition-all duration-200",
                    message.role === "user" 
                      ? "bg-primary text-primary-foreground" 
                      : "bg-card text-card-foreground border border-border"
                  )}
                >
                  {/* Avatar - apenas em telas maiores */}
                  <div className={cn(
                    "hidden sm:flex absolute top-2 w-7 h-7 rounded-full items-center justify-center",
                    "bg-background border border-border shadow-sm",
                    message.role === "user" ? "-right-9" : "-left-9"
                  )}>
                    {message.role === "user" 
                      ? <User className="h-4 w-4 text-primary" /> 
                      : <Code className="h-4 w-4 text-primary" />
                    }
                  </div>

                  {/* Botão de copiar */}
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className={cn(
                      "absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100",
                      "transition-opacity duration-200",
                      message.role === "user" 
                        ? "text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10" 
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                    onClick={() => copyMessage(message.content)}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>

                   {/* Conteúdo da mensagem */}
                   <div className="pr-8">
                     <MessageContent 
                       content={message.content} 
                       role={message.role}
                       messageId={message.role === "assistant" ? message.id : undefined}
                       sessionId={message.role === "assistant" && currentSessionId ? currentSessionId : undefined}
                       model={message.role === "assistant" ? (message.model || selectedModel) : undefined}
                     />
                   </div>

                  {/* Timestamp */}
                  <div className={cn(
                    "flex items-center justify-between mt-3 text-xs",
                    message.role === "user" 
                      ? "text-primary-foreground/70" 
                      : "text-muted-foreground"
                  )}>
                    <span>{message.timestamp.toLocaleTimeString('pt-BR')}</span>
                    {message.role === "assistant" && (
                      <span className="ml-2 hidden sm:inline">via Chat-PD-POA:</span>
                    )}
                  </div>
                </div>
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