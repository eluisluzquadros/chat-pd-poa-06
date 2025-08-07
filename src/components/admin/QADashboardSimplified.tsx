import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

export function QADashboardSimplified() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>QA Dashboard Simplified</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              O QA Dashboard Simplified está temporariamente desabilitado enquanto corrigimos incompatibilidades de tipos.
              Esta funcionalidade será restaurada em breve.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}