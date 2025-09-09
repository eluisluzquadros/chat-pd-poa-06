
import { MessageList } from "@/components/chat/MessageList";
import { ChatInput } from "@/components/chat/ChatInput";
import { ModelSelector } from "@/components/chat/ModelSelector";
import { Message } from "@/types/chat";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/ui/theme-provider";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useAuth } from "@/context/AuthContext";

interface ChatMainProps {
  messages: Message[];
  input: string;
  setInput: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
  onNewChat: () => void;
  selectedModel: string;
  onModelSelect: (model: string) => void;
  currentSessionId?: string | null;
}

export function ChatMain({
  messages,
  input,
  setInput,
  onSubmit,
  isLoading,
  onNewChat,
  selectedModel,
  onModelSelect,
  currentSessionId
}: ChatMainProps) {
  
  const { theme } = useTheme();
  const { isAdmin } = useAuth();
  const hasMessages = messages.length > 0;
  
  const welcomeText = "Como posso ajudar você hoje?";

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-background via-background to-background/95">
      {/* Container principal do chat */}
      <div className="flex flex-col flex-1 min-h-0 relative overflow-hidden">
        {/* Floating controls */}
        <div className="absolute top-4 left-4 z-30">
          <SidebarTrigger className="text-foreground/80 hover:text-foreground hover:bg-accent/50 backdrop-blur-sm rounded-lg transition-all duration-200" />
        </div>
        
        {isAdmin && (
          <div className="absolute top-4 right-4 z-30">
            <div className="backdrop-blur-sm bg-background/30 rounded-lg p-1">
              <ModelSelector 
                selectedModel={selectedModel} 
                onModelSelect={onModelSelect}
              />
            </div>
          </div>
        )}
        
        {hasMessages ? (
          <>
            {/* Lista de mensagens com scroll próprio */}
            <div className="flex-1 min-h-0 overflow-hidden pt-16 pb-2">
              <MessageList 
                messages={messages} 
                isLoading={isLoading} 
                currentSessionId={currentSessionId}
                selectedModel={selectedModel}
              />
            </div>
            
            {/* Gradient overlay para transição suave */}
            <div className="h-8 bg-gradient-to-t from-background via-background/80 to-transparent pointer-events-none"></div>
            
            {/* Input com design elegante */}
            <div className="flex-shrink-0 relative bg-gradient-to-t from-background/98 via-background/95 to-background/90 backdrop-blur-xl">
              <div className="max-w-4xl mx-auto px-4 sm:px-6 pb-6 sm:pb-8 pt-4">
                <div className="relative">
                  <ChatInput 
                    input={input} 
                    setInput={setInput} 
                    onSubmit={onSubmit} 
                    isLoading={isLoading} 
                    centered={false} 
                  />
                </div>
              </div>
            </div>
          </>
        ) : (
          /* Tela de boas-vindas elegante com input centralizado */
          <div className="flex flex-col h-full">
            {/* Conteúdo centralizado */}
            <div className="flex-1 flex items-center justify-center p-6 pt-20">
              <div className="w-full max-w-3xl mx-auto flex flex-col items-center text-center space-y-12 animate-fade-in">
                {/* Logo com sombra sutil */}
                <div className="w-full max-w-[240px] sm:max-w-[320px] drop-shadow-lg">
                  <img 
                    src={theme === 'dark' 
                      ? "/lovable-uploads/9138fd22-514b-41ba-9317-fecb0bacad7d.png" 
                      : "/lovable-uploads/9c959472-19d4-4cc4-9f30-354a6c05be72.png"
                    } 
                    alt="Plano Diretor de Porto Alegre" 
                    className="w-full h-auto"
                  />
                </div>
                
                {/* Título elegante */}
                <div className="w-full space-y-4">
                  <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-foreground/90 leading-tight">
                    {welcomeText}
                  </h1>
                  <p className="text-muted-foreground text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed">
                    Faça perguntas sobre o Plano Diretor de Porto Alegre
                  </p>
                </div>
                
                {/* Input centralizado com design premium */}
                <div className="w-full max-w-2xl mx-auto pt-8">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20 rounded-2xl blur-xl"></div>
                    <div className="relative bg-background/80 backdrop-blur-xl rounded-2xl p-1 border border-border/50 shadow-2xl">
                      <ChatInput 
                        input={input} 
                        setInput={setInput} 
                        onSubmit={onSubmit} 
                        isLoading={isLoading} 
                        centered={true} 
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Espaço inferior para breathing room */}
            <div className="h-16 sm:h-20"></div>
          </div>
        )}
      </div>
    </div>
  );
}
