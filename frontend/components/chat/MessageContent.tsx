import { parseMarkdown } from "@/utils/markdownUtils";
import { MessageFeedback } from "@/components/chat/MessageFeedback";

interface MessageContentProps {
  content: string;
  role: "user" | "assistant";
  messageId?: string;
  sessionId?: string;
  model?: string;
}

export function MessageContent({ content, role, messageId, sessionId, model }: MessageContentProps) {
  if (role === "user") {
    // For user messages, keep simple formatting
    return (
      <div className="text-sm whitespace-pre-wrap leading-relaxed">
        {content}
      </div>
    );
  }

  // For assistant messages, use rich formatting
  const htmlContent = parseMarkdown(content);

  return (
    <div className="space-y-2">
      <div 
        className="text-sm leading-relaxed space-y-0 [&>*:first-child]:mt-0"
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />
      {messageId && sessionId && model && (
        <MessageFeedback 
          messageId={messageId}
          sessionId={sessionId}
          model={model}
        />
      )}
    </div>
  );
}
