import { parseMarkdown } from "@/utils/markdownUtils";

interface MessageContentProps {
  content: string;
  role: "user" | "assistant";
}

export function MessageContent({ content, role }: MessageContentProps) {
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
    <div 
      className="text-sm leading-relaxed space-y-0 [&>*:first-child]:mt-0"
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  );
}
