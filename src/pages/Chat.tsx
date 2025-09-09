
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
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        
        <SidebarProvider defaultOpen={true}>
          <div className="flex flex-1 w-full">
            <AppSidebar
              messages={messages}
              onNewChat={handleNewChat}
              chatSessions={chatSessions}
              currentSessionId={currentSessionId}
              onSelectSession={handleSelectSession}
              onDeleteSession={handleDeleteSession}
              isLoading={chatLoading}
            />
            
            <SidebarInset className="flex-1">
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
    </SimpleAuthGuard>
  );
}
