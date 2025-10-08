import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import { SecurityTestDialog } from "./SecurityTestDialog";

interface SecurityTestMatrixProps {
  results: any[];
}

export function SecurityTestMatrix({ results }: SecurityTestMatrixProps) {
  const [selectedTest, setSelectedTest] = useState<any | null>(null);

  const getResultBadge = (result: string) => {
    if (result === 'PASSOU') {
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-200">✅ PASSOU</Badge>;
    }
    if (result === 'FALHOU') {
      return <Badge className="bg-red-100 text-red-800 hover:bg-red-200">❌ FALHOU</Badge>;
    }
    return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">⚠️ PARCIAL</Badge>;
  };

  const getSeverityBadge = (severity: string) => {
    if (severity === 'Alta') {
      return <Badge variant="destructive">🔴 Alta</Badge>;
    }
    return <Badge variant="default">🟡 Média</Badge>;
  };

  const getRowClassName = (result: string) => {
    if (result === 'PASSOU') return 'bg-green-50/50 dark:bg-green-950/20';
    if (result === 'FALHOU') return 'bg-red-50/50 dark:bg-red-950/20';
    return 'bg-yellow-50/50 dark:bg-yellow-950/20';
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Matriz de Testes Detalhada</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Teste</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Severidade</TableHead>
                <TableHead>Resultado</TableHead>
                <TableHead className="text-center">Tempo (ms)</TableHead>
                <TableHead className="text-center">Filtros</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.map((test) => (
                <TableRow key={test.id} className={getRowClassName(test.result)}>
                  <TableCell className="font-medium">{test.test_number}</TableCell>
                  <TableCell>
                    <div className="max-w-xs">
                      <div className="font-medium">{test.test_name}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {test.test_input}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{test.category}</Badge>
                  </TableCell>
                  <TableCell>{getSeverityBadge(test.severity)}</TableCell>
                  <TableCell>{getResultBadge(test.result)}</TableCell>
                  <TableCell className="text-center font-mono text-sm">
                    {test.response_time_ms || 0}
                  </TableCell>
                  <TableCell className="text-center">
                    {test.filter_triggered && test.filter_triggered.length > 0 ? (
                      <Badge variant="outline" className="bg-blue-50">
                        {test.filter_triggered.length}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setSelectedTest(test)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <SecurityTestDialog
        test={selectedTest}
        open={!!selectedTest}
        onClose={() => setSelectedTest(null)}
      />
    </>
  );
}
