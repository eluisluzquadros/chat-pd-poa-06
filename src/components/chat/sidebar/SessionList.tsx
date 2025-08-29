
import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { ChatSession } from "@/types/chat";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface SessionListProps {
  sessions: ChatSession[];
  currentSessionId: string | null;
  selectedSessions: string[];
  isLoading: boolean;
  onSelectSession: (sessionId: string) => void;
  onToggleSessionSelection: (sessionId: string) => void;
}

export function SessionList({
  sessions,
  currentSessionId,
  selectedSessions,
  isLoading,
  onSelectSession,
  onToggleSessionSelection,
}: SessionListProps) {
  if (isLoading) {
    return (
      <div className="space-y-2 p-4">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8 px-4 flex flex-col items-center justify-center h-full">
        <MessageSquare className="h-12 w-12 mb-3 text-muted-foreground/50" />
        <p className="font-medium">Nenhuma conversa</p>
        <p className="text-sm text-muted-foreground/70 mt-1">
          Inicie uma nova conversa para começar
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-1 p-2">
        {sessions.map((session) => (
          <div key={session.id} className="relative group">
            <div className="absolute left-2 top-1/2 -translate-y-1/2 z-10">
              <Checkbox
                checked={selectedSessions.includes(session.id)}
                onCheckedChange={() => onToggleSessionSelection(session.id)}
                onClick={(e) => e.stopPropagation()}
                className="transition-opacity opacity-0 group-hover:opacity-100 focus:opacity-100"
              />
            </div>
            <Button
              variant={currentSessionId === session.id ? "secondary" : "ghost"}
              className="w-full justify-start gap-2 h-auto py-3 text-left pl-10 rounded-lg 
                        transition-all hover:bg-gray-100 dark:hover:bg-gray-800/50"
              onClick={() => onSelectSession(session.id)}
            >
              <MessageSquare className="h-4 w-4 shrink-0 text-primary/80" />
              <div className="flex flex-col items-start gap-1 overflow-hidden">
                <span className="truncate font-medium w-full">
                  {session.title || 'Nova conversa'}
                </span>
                {session.last_message && (
                  <span className="text-xs text-muted-foreground truncate w-full">
                    {session.last_message}
                  </span>
                )}
                <span className="text-xs text-muted-foreground/70">
                  {format(new Date(session.updated_at), "PPp", { locale: ptBR })}
                </span>
              </div>
            </Button>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
