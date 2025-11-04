import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import ReactMarkdown from 'react-markdown';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface LegalDocumentViewerProps {
  title: string;
  content: string;
  effectiveDate?: string;
  showHeader?: boolean;
  className?: string;
  compact?: boolean;
  showCard?: boolean;
  id?: string;
}

export const LegalDocumentViewer = ({
  title,
  content,
  effectiveDate,
  showHeader = true,
  className = '',
  compact = false,
  showCard = true,
  id
}: LegalDocumentViewerProps) => {
  const contentElement = (
    <div id={id} className={className}>
      {showHeader && (
        <div className={compact ? "mb-4" : "mb-6"}>
          <h2 className={compact ? "text-lg font-bold mb-1" : "text-2xl font-bold mb-2"}>
            {title}
          </h2>
          {effectiveDate && (
            <p className="text-sm text-muted-foreground">
              Última atualização: {formatDistanceToNow(new Date(effectiveDate), {
                addSuffix: true,
                locale: ptBR
              })}
            </p>
          )}
        </div>
      )}
      
      <div className={compact ? "prose prose-xs dark:prose-invert max-w-none" : "prose prose-sm dark:prose-invert max-w-none"}>
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>
    </div>
  );

  if (!showCard) {
    return contentElement;
  }

  return (
    <Card className="p-6">
      <ScrollArea className="h-[600px] pr-4">
        {contentElement}
      </ScrollArea>
    </Card>
  );
};
