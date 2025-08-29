import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Trash2, Database, Clock } from 'lucide-react';

interface QAResetConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  loading?: boolean;
  currentStats?: {
    runs: number;
    results: number;
    tokens?: number;
  };
}

export function QAResetConfirmDialog({ 
  open, 
  onOpenChange, 
  onConfirm,
  loading = false,
  currentStats
}: QAResetConfirmDialogProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [confirmText, setConfirmText] = useState('');
  const [understood, setUnderstood] = useState(false);

  const handleClose = () => {
    if (!loading) {
      setStep(1);
      setConfirmText('');
      setUnderstood(false);
      onOpenChange(false);
    }
  };

  const handleNext = () => {
    if (step === 1 && understood) {
      setStep(2);
    }
  };

  const handleConfirm = () => {
    if (confirmText === 'RESET' && understood) {
      onConfirm();
    }
  };

  const canProceed = step === 1 ? understood : (confirmText === 'RESET' && understood);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Reset Completo do Histórico QA
          </DialogTitle>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4">
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <span className="font-medium text-destructive">ZONA DE PERIGO</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Esta ação irá <strong>deletar permanentemente</strong> todo o histórico de validações QA.
              </p>
            </div>

            {currentStats && (
              <div className="space-y-2">
                <h4 className="font-medium">Dados que serão deletados:</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-2">
                    <Database className="h-3 w-3 text-muted-foreground" />
                    <Badge variant="outline">{currentStats.runs} execuções</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <Badge variant="outline">{currentStats.results} resultados</Badge>
                  </div>
                </div>
                {currentStats.tokens && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      + registros de tokens, relatórios e insights relacionados
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <h4 className="font-medium">⚠️ Esta ação é irreversível</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Todos os históricos de execução serão perdidos</li>
                <li>• Métricas e estatísticas serão zeradas</li>
                <li>• Relatórios antigos não poderão ser recuperados</li>
                <li>• Análises de performance serão resetadas</li>
              </ul>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox 
                id="understand" 
                checked={understood}
                onCheckedChange={(checked) => setUnderstood(checked === true)}
                disabled={loading}
              />
              <label htmlFor="understand" className="text-sm font-medium">
                Eu entendo que esta ação é <strong>irreversível</strong>
              </label>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm font-medium text-destructive mb-2">
                Confirmação final necessária
              </p>
              <p className="text-sm text-muted-foreground">
                Para confirmar que você realmente deseja deletar todo o histórico QA, 
                digite <strong>RESET</strong> no campo abaixo:
              </p>
            </div>

            <div className="space-y-2">
              <label htmlFor="confirm-text" className="text-sm font-medium">
                Digite "RESET" para confirmar:
              </label>
              <Input
                id="confirm-text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="RESET"
                disabled={loading}
                className="font-mono"
              />
            </div>

            {currentStats && (
              <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
                <strong>Resumo:</strong> {currentStats.runs} execuções e {currentStats.results} resultados serão deletados permanentemente.
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button 
            variant="outline" 
            onClick={handleClose}
            disabled={loading}
          >
            Cancelar
          </Button>
          
          {step === 1 && (
            <Button 
              variant="destructive" 
              onClick={handleNext}
              disabled={!canProceed || loading}
            >
              Continuar
            </Button>
          )}
          
          {step === 2 && (
            <Button 
              variant="destructive" 
              onClick={handleConfirm}
              disabled={!canProceed || loading}
              className="gap-2"
            >
              {loading ? (
                <>
                  <div className="h-3 w-3 animate-spin rounded-full border border-current border-t-transparent" />
                  Resetando...
                </>
              ) : (
                <>
                  <Trash2 className="h-3 w-3" />
                  Confirmar Reset
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}