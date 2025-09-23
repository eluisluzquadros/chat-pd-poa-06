import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3 } from 'lucide-react';

interface PerformanceAnalyzerProps {
  benchmarkResults: any[];
  insights: any[];
  onRefresh: () => void;
}

export function PerformanceAnalyzer({ benchmarkResults, insights, onRefresh }: PerformanceAnalyzerProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Análise de Performance
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          Análise detalhada de performance em desenvolvimento.
          {benchmarkResults.length} resultados disponíveis.
        </p>
      </CardContent>
    </Card>
  );
}