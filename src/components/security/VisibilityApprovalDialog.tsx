import { useState } from "react";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";

interface VisibilityApprovalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  incident: any;
  onApproved: () => void;
}

export function VisibilityApprovalDialog({
  open,
  onOpenChange,
  incident,
  onApproved
}: VisibilityApprovalDialogProps) {
  const [visibility, setVisibility] = useState<'public' | 'internal'>('internal');
  const [justification, setJustification] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleApprove = async () => {
    if (!incident) return;

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      const tableName = incident.type === 'report' 
        ? 'security_incident_reports' 
        : 'intelligence_alerts';

      const { error } = await supabase
        .from(tableName)
        .update({
          visibility: visibility,
          visibility_approved_by: user.id,
          visibility_approved_at: new Date().toISOString()
        })
        .eq('id', incident.id);

      if (error) throw error;

      toast.success(`Visibilidade alterada para: ${visibility === 'public' ? 'Público' : 'Interno'}`, {
        description: justification || 'Sem justificativa fornecida'
      });

      onApproved();
      onOpenChange(false);
      setJustification('');
      setVisibility('internal');
    } catch (error: any) {
      toast.error('Erro ao atualizar visibilidade', {
        description: error.message
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!incident) return null;

  const reportData = incident.report_data as any;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle>Aprovar Visibilidade do Incidente</AlertDialogTitle>
          <AlertDialogDescription>
            Defina se este incidente de segurança será visível publicamente ou apenas para administradores e supervisores.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          {/* Incidente Info */}
          <div className="p-4 border rounded-lg bg-muted/50">
            <h4 className="font-semibold mb-2">
              {reportData?.metadata?.title || "Incidente de Segurança"}
            </h4>
            <p className="text-sm text-muted-foreground">
              {reportData?.incident_classification?.description || "Sem descrição"}
            </p>
            <div className="mt-2 flex gap-2">
              <span className="text-xs px-2 py-1 rounded bg-destructive/10 text-destructive">
                Nível: {incident.threat_level}
              </span>
              <span className="text-xs px-2 py-1 rounded bg-secondary">
                Status: {incident.status}
              </span>
            </div>
          </div>

          {/* Visibility Selection */}
          <div className="space-y-3">
            <Label>Tipo de Visibilidade</Label>
            <RadioGroup value={visibility} onValueChange={(v) => setVisibility(v as 'public' | 'internal')}>
              <div className="flex items-start space-x-3 space-y-0 rounded-md border p-4">
                <RadioGroupItem value="internal" id="internal" />
                <div className="flex-1">
                  <Label htmlFor="internal" className="font-medium cursor-pointer flex items-center gap-2">
                    <EyeOff className="h-4 w-4" />
                    Manter Interno
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Visível apenas para administradores e supervisores. Não aparecerá em dashboards públicos ou status da plataforma.
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3 space-y-0 rounded-md border p-4">
                <RadioGroupItem value="public" id="public" />
                <div className="flex-1">
                  <Label htmlFor="public" className="font-medium cursor-pointer flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    Tornar Público
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Será visível em dashboards, status da plataforma e relatórios públicos. Use apenas para incidentes que devem ser comunicados aos usuários.
                  </p>
                </div>
              </div>
            </RadioGroup>
          </div>

          {/* Justification */}
          <div className="space-y-2">
            <Label htmlFor="justification">
              Justificativa {visibility === 'public' && <span className="text-destructive">*</span>}
            </Label>
            <Textarea
              id="justification"
              placeholder="Explique o motivo da decisão de visibilidade..."
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              rows={4}
            />
            {visibility === 'public' && (
              <p className="text-xs text-muted-foreground">
                Justificativa obrigatória para incidentes públicos
              </p>
            )}
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSubmitting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleApprove}
            disabled={isSubmitting || (visibility === 'public' && !justification.trim())}
          >
            {isSubmitting ? "Processando..." : "Confirmar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
