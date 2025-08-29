
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Message, ChatSession } from "@/types/chat";
import { useToast } from "@/hooks/use-toast";
import { HeaderActions } from "./sidebar/HeaderActions";
import { SearchBar } from "./sidebar/SearchBar";
import { SessionList } from "./sidebar/SessionList";
import { DeleteSessionDialog } from "./sidebar/DeleteSessionDialog";
import { TokenStatsButton } from "./TokenStatsButton";

interface ChatSidebarProps {
  messages: Message[];
  onNewChat: () => void;
  isSidebarOpen: boolean;
  chatSessions?: ChatSession[];
  currentSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => void;
  isLoading?: boolean;
  onToggleSidebar: () => void;
}

export function ChatSidebar({
  messages,
  onNewChat,
  isSidebarOpen,
  chatSessions = [],
  currentSessionId,
  onSelectSession,
  onDeleteSession,
  isLoading = false,
  onToggleSidebar,
}: ChatSidebarProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSessions, setSelectedSessions] = useState<string[]>([]);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const { toast } = useToast();

  const filteredSessions = chatSessions.filter(session =>
    session.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    session.last_message?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedSessions = [...filteredSessions].sort((a, b) =>
    new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );

  const handleDeleteSelected = async () => {
    try {
      for (const sessionId of selectedSessions) {
        await onDeleteSession(sessionId);
      }
      toast({
        title: "Sucesso",
        description: `${selectedSessions.length} conversa(s) excluída(s) com sucesso`,
      });
      setSelectedSessions([]);
      setIsDeleteDialogOpen(false);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível excluir algumas conversas",
        variant: "destructive",
      });
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
    <aside
      className={cn(
        "w-72 bg-white dark:bg-[#0f0f0f] border-r border-gray-200 dark:border-gray-800",
        "h-full flex flex-col transition-all duration-300 ease-in-out",
        "fixed top-0 left-0 z-40 pt-16",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full",
        "shadow-lg"
      )}
      aria-hidden={!isSidebarOpen}
    >
      <div className="flex flex-col h-full">
        <div className="p-4 space-y-4 border-b border-gray-100 dark:border-gray-800">
          <HeaderActions
            selectedSessions={selectedSessions}
            isLoading={isLoading}
            onNewChat={onNewChat}
            onOpenDeleteDialog={() => setIsDeleteDialogOpen(true)}
          />
          <SearchBar
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            onToggleSidebar={onToggleSidebar}
          />
          <TokenStatsButton />
        </div>

        <div className="flex-1 overflow-hidden">
          <SessionList
            sessions={sortedSessions}
            currentSessionId={currentSessionId}
            selectedSessions={selectedSessions}
            isLoading={isLoading}
            onSelectSession={onSelectSession}
            onToggleSessionSelection={toggleSessionSelection}
          />
        </div>

        <DeleteSessionDialog
          isOpen={isDeleteDialogOpen}
          selectedCount={selectedSessions.length}
          onOpenChange={setIsDeleteDialogOpen}
          onConfirmDelete={handleDeleteSelected}
        />
      </div>
    </aside>
  );
}
