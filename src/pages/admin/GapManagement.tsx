import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

export default function GapManagement() {
  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Gerenciamento de Gaps</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              O sistema de Gerenciamento de Gaps está temporariamente desabilitado enquanto implementamos a nova arquitetura de agentes.
              Esta funcionalidade será restaurada em breve.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}