
import { Search, MenuIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface SearchBarProps {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  onToggleSidebar?: () => void;
}

export function SearchBar({ searchTerm, setSearchTerm, onToggleSidebar }: SearchBarProps) {
  return (
    <div className="flex items-center gap-2 w-full">
      <div className="relative flex-1">
        <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-8 bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600"
          placeholder="Buscar conversas..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      
      {onToggleSidebar && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleSidebar}
          className="shrink-0 text-muted-foreground hover:text-foreground"
          aria-label="Toggle sidebar"
        >
          <MenuIcon className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
