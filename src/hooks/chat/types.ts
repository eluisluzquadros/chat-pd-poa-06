
import { Message, ChatSession } from "@/types/chat";

export type UseChatHookReturn = {
  messages: Message[];
  input: string;
  setInput: (value: string) => void;
  isLoading: boolean;
  userRole?: string;
  chatSessions?: ChatSession[];
  currentSessionId: string | null;
  handleSubmit: (e: React.FormEvent) => void;
  handleNewChat: () => void;
  handleSelectSession: (sessionId: string) => void;
  handleDeleteSession: (sessionId: string) => void;
  isConnectionError?: boolean;
};

export type RefetchFunction = () => Promise<void>;
