import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings } from 'lucide-react';

interface BenchmarkConfigV3Props {
  onSave: (config: any) => void;
  currentConfig: any;
}

export function BenchmarkConfigV3({ onSave, currentConfig }: BenchmarkConfigV3Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Configuração Benchmark V3
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          Configurações avançadas de benchmark em desenvolvimento.
        </p>
      </CardContent>
    </Card>
  );
}