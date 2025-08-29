import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send } from "lucide-react";
import { cn } from "@/lib/utils";
interface ChatInputProps {
  input: string;
  setInput: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
  centered?: boolean;
}
export function ChatInput({
  input,
  setInput,
  onSubmit,
  isLoading,
  centered = false
}: ChatInputProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (input.trim() && !isLoading) {
        onSubmit(e);
      }
    }
  };

  return (
    <form onSubmit={onSubmit} className="w-full space-y-2">
      <div className={cn(
        "flex items-end gap-2 sm:gap-3 p-2 sm:p-3",
        "bg-background border border-input rounded-xl",
        "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
        "transition-all duration-200",
        centered ? "max-w-2xl mx-auto" : "w-full"
      )}>
        <Textarea 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Digite sua mensagem..."
          className={cn(
            "flex-1 min-h-[40px] max-h-[120px] resize-none",
            "border-0 bg-transparent p-0",
            "focus-visible:ring-0 focus-visible:ring-offset-0",
            "placeholder:text-muted-foreground",
            "text-sm sm:text-base"
          )}
          disabled={isLoading}
        />
        
        <Button 
          type="submit" 
          size="icon"
          disabled={!input.trim() || isLoading}
          className={cn(
            "h-8 w-8 sm:h-10 sm:w-10 rounded-lg flex-shrink-0",
            "bg-primary hover:bg-primary/90 text-primary-foreground",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "transition-all duration-200 hover:scale-105",
            "shadow-sm"
          )}
        >
          <Send className="h-3 w-3 sm:h-4 sm:w-4" />
        </Button>
      </div>
      
      <p className="text-xs text-center text-muted-foreground px-2">
        O assistente pode cometer erros. Considere verificar informações importantes.
      </p>
    </form>
  );
}