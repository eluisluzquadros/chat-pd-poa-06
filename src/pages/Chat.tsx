
import { useChat } from "@/hooks/useChat";
import { SimpleAuthGuard } from "@/components/SimpleAuthGuard";
import { Header } from "@/components/Header";
import { AppSidebar } from "@/components/chat/AppSidebar";
import { ChatMain } from "@/components/chat/ChatMain";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { useAgentSelection } from "@/hooks/chat/useAgentSelection";

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
    handleDeleteSessions,
  } = useChat();

  const {
    selectedAgent,
    switchAgent,
    getSelectedAgentData,
    isLoading: agentLoading
  } = useAgentSelection();

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
                onDeleteSessions={handleDeleteSessions}
                isLoading={chatLoading}
                selectedAgent={selectedAgent}
                onAgentSelect={switchAgent}
                selectedAgentData={getSelectedAgentData()}
              />
              
              <SidebarInset className="flex-1 h-full">
                <ChatMain
                  messages={messages}
                  input={input}
                  setInput={setInput}
                  onSubmit={handleSubmit}
                  isLoading={chatLoading}
                  onNewChat={handleNewChat}
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
