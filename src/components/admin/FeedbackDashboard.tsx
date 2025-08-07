import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

export function FeedbackDashboard() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Dashboard de Feedback</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              O Dashboard de Feedback está temporariamente desabilitado enquanto corrigimos incompatibilidades com o schema do banco de dados.
              Esta funcionalidade será restaurada em breve.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}