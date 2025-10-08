import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileDown, Code, Shield } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

interface SecurityRunHeaderProps {
  run: any;
}

export function SecurityRunHeader({ run }: SecurityRunHeaderProps) {
  const handleExportPDF = () => {
    toast.info("Funcionalidade de exportação PDF em desenvolvimento");
  };

  const handleExportJSON = () => {
    const data = JSON.stringify(run, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `security-validation-${run.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <Shield className="h-6 w-6 text-primary" />
              <CardTitle className="text-2xl">
                Relatório de Validação de Segurança
              </CardTitle>
            </div>
            <p className="text-sm text-muted-foreground">
              Sistema de Proteção contra Prompt Injection
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleExportPDF} variant="outline" className="gap-2">
              <FileDown className="h-4 w-4" />
              Exportar PDF
            </Button>
            <Button onClick={handleExportJSON} variant="outline" className="gap-2">
              <Code className="h-4 w-4" />
              Exportar JSON
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">ID da Execução:</span>
            <p className="font-mono text-xs mt-1">{run.id}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Versão do Sistema:</span>
            <p className="mt-1">
              <Badge variant="outline">{run.system_version || 'v1.0'}</Badge>
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">Data de Execução:</span>
            <p className="mt-1">
              {run.started_at && format(new Date(run.started_at), "PPp", { locale: ptBR })}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">Duração:</span>
            <p className="mt-1">
              {run.completed_at && run.started_at 
                ? `${Math.round((new Date(run.completed_at).getTime() - new Date(run.started_at).getTime()) / 1000)}s`
                : 'Em andamento'}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
