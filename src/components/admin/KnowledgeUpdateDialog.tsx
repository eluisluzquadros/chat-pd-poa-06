import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertTriangle, Lightbulb } from 'lucide-react';

interface KnowledgeUpdateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  analysisData: any;
  gap: any;
}

export function KnowledgeUpdateDialog({ 
  open, 
  onOpenChange, 
  analysisData, 
  gap 
}: KnowledgeUpdateDialogProps) {
  if (!analysisData || !gap) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Análise de Gap de Conhecimento</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Gap Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Gap Identificado
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{gap.category}</Badge>
                  <Badge variant="secondary">{gap.topic}</Badge>
                  <Badge variant={gap.severity === 'critical' ? 'destructive' : 'default'}>
                    {gap.severity}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {analysisData.insights.analysis}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Analysis Patterns */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Padrões Identificados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analysisData.insights.patterns.map((pattern: any, index: number) => (
                  <Alert key={index}>
                    <AlertDescription>
                      <strong>{pattern.issue}:</strong> {pattern.question}
                    </AlertDescription>
                  </Alert>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Lightbulb className="h-4 w-4" />
                Recomendações
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {analysisData.recommendations.map((rec: string, index: number) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    {rec}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
            <Button>
              Implementar Melhorias
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}