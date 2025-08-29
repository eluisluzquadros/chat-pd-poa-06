
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeaderActionsProps {
  selectedSessions: string[];
  isLoading: boolean;
  onNewChat: () => void;
  onOpenDeleteDialog: () => void;
}

export function HeaderActions({
  selectedSessions,
  isLoading,
  onNewChat,
  onOpenDeleteDialog,
}: HeaderActionsProps) {
  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        className="flex-1 gap-2"
        onClick={onNewChat}
        disabled={isLoading}
      >
        <Plus className="h-4 w-4" />
        Novo Chat
      </Button>
      {selectedSessions.length > 0 && (
        <Button
          variant="destructive"
          size="icon"
          onClick={onOpenDeleteDialog}
          className="shrink-0"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
