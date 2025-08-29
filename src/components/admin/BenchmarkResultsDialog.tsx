import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, XCircle, Clock, Target } from "lucide-react";

interface BenchmarkResult {
  testCaseId: string;
  question: string;
  expectedAnswer: string;
  actualAnswer: string;
  success: boolean;
  accuracy: number;
  responseTime: number;
  error?: string;
}

interface BenchmarkResultsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  model: string;
  provider: string;
  results: BenchmarkResult[];
  summary: {
    totalTests: number;
    passedTests: number;
    avgQualityScore: number;
    avgResponseTime: number;
    successRate: number;
  };
}

export function BenchmarkResultsDialog({
  open,
  onOpenChange,
  model,
  provider,
  results,
  summary
}: BenchmarkResultsDialogProps) {
  const formatTime = (ms: number) => {
    if (ms > 1000) {
      return `${(ms / 1000).toFixed(1)}s`;
    }
    return `${ms}ms`;
  };

  const getStatusColor = (success: boolean) => {
    return success ? "text-green-600" : "text-red-600";
  };

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 0.8) return "text-green-600";
    if (accuracy >= 0.6) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div>
              Resultados do Benchmark: {model}
              <span className="text-sm text-muted-foreground ml-2">({provider})</span>
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-card rounded-lg p-4 border">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">Taxa de Sucesso</span>
            </div>
            <div className="text-2xl font-bold">{summary.successRate}%</div>
            <div className="text-xs text-muted-foreground">
              {summary.passedTests}/{summary.totalTests} testes
            </div>
          </div>

          <div className="bg-card rounded-lg p-4 border">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium">Qualidade Média</span>
            </div>
            <div className="text-2xl font-bold">{summary.avgQualityScore}%</div>
            <div className="text-xs text-muted-foreground">Acurácia</div>
          </div>

          <div className="bg-card rounded-lg p-4 border">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-orange-500" />
              <span className="text-sm font-medium">Tempo Médio</span>
            </div>
            <div className="text-2xl font-bold">{formatTime(summary.avgResponseTime)}</div>
            <div className="text-xs text-muted-foreground">Por teste</div>
          </div>

          <div className="bg-card rounded-lg p-4 border">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-4 w-4 text-purple-500" />
              <span className="text-sm font-medium">Total de Testes</span>
            </div>
            <div className="text-2xl font-bold">{summary.totalTests}</div>
            <div className="text-xs text-muted-foreground">Executados</div>
          </div>
        </div>

        {/* Detailed Results */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Resultados Detalhados</h3>
          <ScrollArea className="h-96 border rounded-lg">
            <div className="p-4 space-y-4">
              {results.map((result, index) => (
                <div key={`${result.testCaseId}-${index}`} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        {result.success ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                        <span className="font-medium">Caso de Teste #{result.testCaseId}</span>
                        <Badge 
                          variant={result.success ? "default" : "destructive"}
                          className="ml-auto"
                        >
                          {result.success ? "Aprovado" : "Reprovado"}
                        </Badge>
                      </div>
                      
                      <div className="text-sm font-medium text-muted-foreground">
                        <strong>Pergunta:</strong> {result.question}
                      </div>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="font-medium text-muted-foreground mb-1">Resposta Esperada:</div>
                      <div className="bg-muted/50 rounded p-2 text-xs">
                        {result.expectedAnswer || "Não especificada"}
                      </div>
                    </div>
                    <div>
                      <div className="font-medium text-muted-foreground mb-1">Resposta Obtida:</div>
                      <div className="bg-muted/50 rounded p-2 text-xs">
                        {result.actualAnswer || result.error || "Nenhuma resposta"}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <span className="text-muted-foreground">Acurácia:</span>
                      <span className={`font-medium ${getAccuracyColor(result.accuracy)}`}>
                        {(result.accuracy * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>{formatTime(result.responseTime)}</span>
                    </div>
                    {result.error && (
                      <Badge variant="destructive" className="text-xs">
                        Erro: {result.error}
                      </Badge>
                    )}
                  </div>

                  {index < results.length - 1 && <Separator />}
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        <div className="flex justify-end">
          <Button onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}