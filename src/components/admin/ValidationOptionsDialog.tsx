import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

export function ValidationOptionsDialog() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Validation Options</CardTitle>
      </CardHeader>
      <CardContent>
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Validation dialog temporariamente desabilitado.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}