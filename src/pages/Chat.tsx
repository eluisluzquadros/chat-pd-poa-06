
import { useChat } from "@/hooks/useChat";
import { SimpleAuthGuard } from "@/components/SimpleAuthGuard";
import { Header } from "@/components/Header";
import { AppSidebar } from "@/components/chat/AppSidebar";
import { ChatMain } from "@/components/chat/ChatMain";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";

export default function Chat() {
  const {
    messages,
    input,
    setInput,
    isLoading: chatLoading,
    chatSessions,
    currentSessionId,
    handleSubmit,
    handleNewChat,
    handleSelectSession,
    handleDeleteSession,
    selectedModel,
    switchModel,
  } = useChat();

  return (
    <SimpleAuthGuard>
      <div className="h-screen flex flex-col bg-background">
        <Header />
        
        <div className="flex-1 min-h-0">
          <SidebarProvider defaultOpen={true}>
            <div className="flex h-full w-full">
              <AppSidebar
                messages={messages}
                onNewChat={handleNewChat}
                chatSessions={chatSessions}
                currentSessionId={currentSessionId}
                onSelectSession={handleSelectSession}
                onDeleteSession={handleDeleteSession}
                isLoading={chatLoading}
              />
              
              <SidebarInset className="flex-1 h-full">
                <ChatMain
                  messages={messages}
                  input={input}
                  setInput={setInput}
                  onSubmit={handleSubmit}
                  isLoading={chatLoading}
                  onNewChat={handleNewChat}
                  selectedModel={selectedModel}
                  onModelSelect={switchModel}
                  currentSessionId={currentSessionId}
                />
              </SidebarInset>
            </div>
          </SidebarProvider>
        </div>
      </div>
    </SimpleAuthGuard>
  );
}
