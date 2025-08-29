
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
    <div className="flex flex-col h-full bg-background">
      {/* Container principal do chat */}
      <div className="flex flex-col flex-1 min-h-0 relative">
        {/* Floating controls */}
        <div className="absolute top-4 left-4 z-30">
          <SidebarTrigger className="text-foreground hover:bg-accent" />
        </div>
        
        <div className="absolute top-4 right-4 z-30">
          <ModelSelector 
            selectedModel={selectedModel} 
            onModelSelect={onModelSelect}
          />
        </div>
        {hasMessages ? (
          <>
            {/* Lista de mensagens com scroll próprio */}
            <div className="flex-1 min-h-0 overflow-hidden pt-16">
              <MessageList 
                messages={messages} 
                isLoading={isLoading} 
                currentSessionId={currentSessionId}
                selectedModel={selectedModel}
              />
            </div>
            
            {/* Input sempre presente */}
            <div className="flex-shrink-0 border-t border-border bg-background/95 backdrop-blur">
              <div className="max-w-4xl mx-auto p-4">
                <ChatInput 
                  input={input} 
                  setInput={setInput} 
                  onSubmit={onSubmit} 
                  isLoading={isLoading} 
                  centered={false} 
                />
              </div>
            </div>
          </>
        ) : (
          /* Tela de boas-vindas com input sempre visível */
          <>
            <div className="flex-1 flex items-center justify-center p-4 overflow-y-auto pt-16">
              <div className="w-full max-w-2xl mx-auto flex flex-col items-center text-center space-y-8">
                {/* Logo */}
                <div className="w-full max-w-[200px] sm:max-w-[280px]">
                  <img 
                    src={theme === 'dark' 
                      ? "/lovable-uploads/9138fd22-514b-41ba-9317-fecb0bacad7d.png" 
                      : "/lovable-uploads/9c959472-19d4-4cc4-9f30-354a6c05be72.png"
                    } 
                    alt="Plano Diretor de Porto Alegre" 
                    className="w-full h-auto"
                  />
                </div>
                
                {/* Título fixo */}
                <div className="w-full">
                  <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight text-foreground">
                    {welcomeText}
                  </h1>
                </div>
              </div>
            </div>
            
            {/* Input sempre presente mesmo na tela de boas-vindas */}
            <div className="flex-shrink-0 border-t border-border bg-background/95 backdrop-blur">
              <div className="max-w-4xl mx-auto p-4">
                <ChatInput 
                  input={input} 
                  setInput={setInput} 
                  onSubmit={onSubmit} 
                  isLoading={isLoading} 
                  centered={true} 
                />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
