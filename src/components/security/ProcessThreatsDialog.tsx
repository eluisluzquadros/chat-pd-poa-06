import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle, Database, Filter, Shield } from "lucide-react";

interface ProcessThreatsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function ProcessThreatsDialog({ open, onOpenChange, onConfirm }: ProcessThreatsDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-orange-500/10">
              <Database className="h-6 w-6 text-orange-500" />
            </div>
            <AlertDialogTitle>Processar Ameaças Históricas</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="space-y-4 text-left">
            <p>
              Este processo irá analisar todas as mensagens históricas do sistema em busca de
              tentativas de prompt injection e outros padrões de ataque.
            </p>

            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <h4 className="font-semibold flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filtros Inteligentes Aplicados:
              </h4>
              <ul className="space-y-2 text-sm ml-6">
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span><strong>Roles:</strong> Mensagens de admins/supervisores serão ignoradas</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span><strong>Testes Automatizados:</strong> Sessões de validação de segurança serão filtradas</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span><strong>Mensagens Bloqueadas:</strong> Ataques já bloqueados pelo sistema serão ignorados</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span><strong>Keywords de Teste:</strong> Mensagens com termos de teste (teste, v1, v2) serão filtradas</span>
                </li>
              </ul>
            </div>

            <div className="bg-destructive/10 rounded-lg p-4 space-y-2">
              <h4 className="font-semibold flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-4 w-4" />
                Ações Automáticas para Ameaças Detectadas:
              </h4>
              <ul className="space-y-1 text-sm ml-6">
                <li className="flex items-start gap-2">
                  <span className="text-destructive">•</span>
                  <span>Criação de alertas críticos</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-destructive">•</span>
                  <span>Geração de relatórios forenses detalhados</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-destructive">•</span>
                  <span>Desativação automática de contas comprometidas</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-destructive">•</span>
                  <span>Envio de emails de notificação para administradores</span>
                </li>
              </ul>
            </div>

            <div className="bg-green-500/10 rounded-lg p-4">
              <p className="text-sm flex items-start gap-2">
                <Shield className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>
                  Apenas ameaças reais serão processadas. Mensagens legítimas não serão afetadas.
                </span>
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            Iniciar Processamento
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
