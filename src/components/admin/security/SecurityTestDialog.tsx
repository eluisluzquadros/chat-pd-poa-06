import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Shield, AlertTriangle } from "lucide-react";
import { Label } from "@/components/ui/label";

interface SecurityTestDialogProps {
  test: any;
  open: boolean;
  onClose: () => void;
}

export function SecurityTestDialog({ test, open, onClose }: SecurityTestDialogProps) {
  if (!test) return null;

  const getResultBadge = (result: string) => {
    if (result === 'PASSOU') {
      return <Badge className="bg-green-100 text-green-800">✅ PASSOU</Badge>;
    }
    if (result === 'FALHOU') {
      return <Badge className="bg-red-100 text-red-800">❌ FALHOU</Badge>;
    }
    return <Badge className="bg-yellow-100 text-yellow-800">⚠️ PARCIAL</Badge>;
  };

  const getSeverityBadge = (severity: string) => {
    if (severity === 'Alta') {
      return <Badge variant="destructive">🔴 Alta</Badge>;
    }
    return <Badge variant="default">🟡 Média</Badge>;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Teste #{test.test_number}: {test.test_name}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="input">Input</TabsTrigger>
            <TabsTrigger value="response">Resposta</TabsTrigger>
            <TabsTrigger value="analysis">Análise</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Categoria</Label>
                <div className="mt-1">
                  <Badge variant="outline">{test.category}</Badge>
                </div>
              </div>
              <div>
                <Label>Severidade</Label>
                <div className="mt-1">
                  {getSeverityBadge(test.severity)}
                </div>
              </div>
              <div>
                <Label>Resultado</Label>
                <div className="mt-1">
                  {getResultBadge(test.result)}
                </div>
              </div>
              <div>
                <Label>Tempo de Resposta</Label>
                <div className="mt-1">
                  <Badge variant="outline">{test.response_time_ms || 0}ms</Badge>
                </div>
              </div>
            </div>

            <div>
              <Label>Comportamento Esperado</Label>
              <p className="text-sm text-muted-foreground mt-1 p-3 bg-muted rounded-md">
                {test.expected_behavior}
              </p>
            </div>

            {test.notes && (
              <div>
                <Label>Notas</Label>
                <p className="text-sm text-muted-foreground mt-1 p-3 bg-muted rounded-md">
                  {test.notes}
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="input" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Input do Teste</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-muted rounded-lg font-mono text-sm whitespace-pre-wrap">
                  {test.test_input}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="response" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Resposta do Sistema</CardTitle>
                  <div className="flex gap-2">
                    {getResultBadge(test.result)}
                    <Badge variant="outline">{test.response_time_ms || 0}ms</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="p-4 bg-muted rounded-lg font-mono text-sm whitespace-pre-wrap max-h-96 overflow-y-auto">
                  {test.actual_response || 'Sem resposta'}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analysis" className="space-y-4">
            {/* Filtros Acionados */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Filtros Acionados</CardTitle>
              </CardHeader>
              <CardContent>
                {test.filter_triggered && test.filter_triggered.length > 0 ? (
                  <ul className="space-y-2">
                    {test.filter_triggered.map((filter: string, i: number) => (
                      <li key={i} className="flex items-center gap-2 text-sm">
                        <Shield className="h-4 w-4 text-green-500 flex-shrink-0" />
                        <code className="bg-muted px-2 py-1 rounded">{filter}</code>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    Nenhum filtro foi acionado
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Status de Bloqueio */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Status de Proteção</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  {test.blocked_by_filter ? (
                    <>
                      <Shield className="h-5 w-5 text-green-500" />
                      <span className="text-sm font-medium text-green-700 dark:text-green-300">
                        Ataque bloqueado pelos filtros de segurança
                      </span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                      <span className="text-sm font-medium text-red-700 dark:text-red-300">
                        Ataque NÃO foi bloqueado
                      </span>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Alerta de Falha */}
            {test.result === 'FALHOU' && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Vulnerabilidade Detectada</AlertTitle>
                <AlertDescription>
                  Este teste falhou, indicando uma possível vulnerabilidade de segurança 
                  que deve ser investigada e corrigida. {test.severity === 'Alta' && 
                  'Como este é um teste de ALTA severidade, a correção é URGENTE.'}
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
