import { useState } from "react";
import { Message, ChatSession } from "@/types/chat";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { HeaderActions } from "./sidebar/HeaderActions";
import { SearchBar } from "./sidebar/SearchBar";
import { SessionList } from "./sidebar/SessionList";
import { DeleteSessionDialog } from "./sidebar/DeleteSessionDialog";
import { SystemToggle } from "./SystemToggle";
import { ModelSelector } from "./ModelSelector";

import { useAuth } from "@/context/AuthContext";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";

interface AppSidebarProps {
  messages: Message[];
  onNewChat: () => void;
  chatSessions?: ChatSession[];
  currentSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => void;
  onDeleteSessions?: (sessionIds: string[]) => void;
  isLoading?: boolean;
  selectedModel?: string;
  onModelSelect?: (model: string) => void;
}

export function AppSidebar({
  messages,
  onNewChat,
  chatSessions = [],
  currentSessionId,
  onSelectSession,
  onDeleteSession,
  onDeleteSessions,
  isLoading = false,
  selectedModel,
  onModelSelect,
}: AppSidebarProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSessions, setSelectedSessions] = useState<string[]>([]);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const { toggleSidebar } = useSidebar();
  const { isAdmin } = useAuth();

  const filteredSessions = chatSessions.filter(session =>
    session.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    session.last_message?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedSessions = [...filteredSessions].sort((a, b) =>
    new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );

  const handleDeleteSelected = async () => {
    if (isDeleting || selectedSessions.length === 0) return;
    
    setIsDeleting(true);
    try {
      if (onDeleteSessions) {
        // Use batch deletion if available
        await onDeleteSessions(selectedSessions);
      } else {
        // Fallback to individual deletions
        for (const sessionId of selectedSessions) {
          await onDeleteSession(sessionId);
        }
        toast({
          title: "Sucesso",
          description: `${selectedSessions.length} conversa(s) excluída(s) com sucesso`,
        });
      }
      setSelectedSessions([]);
      setIsDeleteDialogOpen(false);
    } catch (error) {
      console.error('Error deleting sessions:', error);
      // Error toast is handled by the deletion functions
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleSessionSelection = (sessionId: string) => {
    setSelectedSessions(prev =>
      prev.includes(sessionId)
        ? prev.filter(id => id !== sessionId)
        : [...prev, sessionId]
    );
  };

  return (
    <>
      <Sidebar className="border-r border-border bg-background top-[73px] h-[calc(100vh-73px)]">
        <SidebarHeader className="p-4 border-b border-border">
          <HeaderActions
            selectedSessions={selectedSessions}
            isLoading={isLoading || isDeleting}
            onNewChat={onNewChat}
            onOpenDeleteDialog={() => setIsDeleteDialogOpen(true)}
          />
          <SearchBar
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            onToggleSidebar={toggleSidebar}
          />
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SystemToggle />
              {isAdmin && selectedModel && onModelSelect && (
                <div className="px-1 mb-3">
                  <div className="text-xs font-medium text-muted-foreground mb-2 px-2">Modelo de IA</div>
                  <ModelSelector 
                    selectedModel={selectedModel} 
                    onModelSelect={onModelSelect}
                  />
                </div>
              )}
              <SessionList
                sessions={sortedSessions}
                currentSessionId={currentSessionId}
                selectedSessions={selectedSessions}
                isLoading={isLoading}
                onSelectSession={onSelectSession}
                onToggleSessionSelection={toggleSessionSelection}
              />
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>

      <DeleteSessionDialog
        isOpen={isDeleteDialogOpen}
        selectedCount={selectedSessions.length}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirmDelete={handleDeleteSelected}
        isDeleting={isDeleting}
      />
    </>
  );
}