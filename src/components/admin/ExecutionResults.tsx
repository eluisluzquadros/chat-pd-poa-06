import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Clock, Zap, CheckCircle, Copy, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

interface ExecutionResult {
  id: string;
  query: string;
  ragVersion: 'v1' | 'v2';
  response: string;
  executionTime: number;
  timestamp: string;
  confidence?: number;
  success: boolean;
}

interface ExecutionResultsProps {
  results: ExecutionResult[];
  onClear?: () => void;
}

export function ExecutionResults({ results, onClear }: ExecutionResultsProps) {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado para a área de transferência');
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const groupedResults = results.reduce((acc, result) => {
    const query = result.query;
    if (!acc[query]) {
      acc[query] = [];
    }
    acc[query].push(result);
    return acc;
  }, {} as Record<string, ExecutionResult[]>);

  if (results.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            <ExternalLink className="h-8 w-8 mx-auto mb-3 opacity-50" />
            <p>Nenhuma execução realizada ainda.</p>
            <p className="text-sm mt-1">Execute uma query para ver os resultados aqui.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Resultados das Execuções</h3>
        <div className="flex gap-2">
          <Badge variant="outline">
            {results.length} execução{results.length !== 1 ? 'ões' : ''}
          </Badge>
          {onClear && (
            <Button variant="outline" size="sm" onClick={onClear}>
              Limpar
            </Button>
          )}
        </div>
      </div>

      <ScrollArea className="h-[600px]">
        <div className="space-y-4">
          {Object.entries(groupedResults).map(([query, queryResults]) => (
            <Card key={query} className="border-l-4 border-l-primary">
              <CardHeader>
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <CardTitle className="text-base flex items-center gap-2">
                      Query
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(query)}
                        className="h-6 w-6 p-0"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1 break-words">{query}</p>
                  </div>
                  <div className="flex gap-2">
                    {queryResults.map(result => (
                      <Badge 
                        key={result.id}
                        variant={result.ragVersion === 'v1' ? 'secondary' : 'default'}
                      >
                        RAG {result.ragVersion.toUpperCase()}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {queryResults.map((result, index) => (
                    <div key={result.id}>
                      {index > 0 && <Separator className="my-4" />}
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-3">
                            <Badge variant={result.ragVersion === 'v1' ? 'secondary' : 'default'}>
                              RAG {result.ragVersion.toUpperCase()}
                            </Badge>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {formatTime(result.timestamp)}
                            </div>
                            {result.executionTime > 0 && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Zap className="h-3 w-3" />
                                {result.executionTime}ms
                              </div>
                            )}
                            {result.confidence && (
                              <Badge variant="outline" className="text-xs">
                                {Math.round(result.confidence * 100)}% confiança
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(result.response)}
                              className="h-6 w-6 p-0"
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        
                        <div className="bg-muted/50 rounded-lg p-4">
                          <div className="text-sm text-muted-foreground mb-2 font-medium">Resposta:</div>
                          <div className="text-sm whitespace-pre-wrap break-words">
                            {result.response}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}