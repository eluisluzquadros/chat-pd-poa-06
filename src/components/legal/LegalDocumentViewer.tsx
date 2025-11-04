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
}

export const LegalDocumentViewer = ({
  title,
  content,
  effectiveDate,
  showHeader = true,
  className = ''
}: LegalDocumentViewerProps) => {
  return (
    <Card className={`p-6 ${className}`}>
      {showHeader && (
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-2">{title}</h2>
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
      
      <ScrollArea className="h-[600px] pr-4">
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>
      </ScrollArea>
    </Card>
  );
};
