import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

export function QADashboardWrapper() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>QA Dashboard Wrapper</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              O QA Dashboard Wrapper está temporariamente desabilitado enquanto corrigimos incompatibilidades de tipos.
              Esta funcionalidade será restaurada em breve.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}