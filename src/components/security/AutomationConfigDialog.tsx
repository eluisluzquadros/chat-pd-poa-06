import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AutomationConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config?: any;
  onSuccess?: () => void;
}

export function AutomationConfigDialog({
  open,
  onOpenChange,
  config,
  onSuccess
}: AutomationConfigDialogProps) {
  const [formData, setFormData] = useState({
    config_name: '',
    config_type: 'simulation' as 'simulation' | 'monitoring',
    is_enabled: false,
    schedule_type: 'daily' as 'daily' | 'weekly' | 'monthly',
    schedule_time: '14:00',
    schedule_days: [] as number[],
    timezone: 'America/Sao_Paulo',
    simulation_test_count: 20,
    simulation_randomize: true,
    monitoring_time_window_hours: 24,
    monitoring_min_severity: 'high',
    email_notifications: true,
    notification_emails: [] as string[],
    auto_generate_pdf: true,
    auto_send_weekly_report: false,
  });

  const [newEmail, setNewEmail] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (config) {
      setFormData({
        config_name: config.config_name || '',
        config_type: config.config_type || 'simulation',
        is_enabled: config.is_enabled || false,
        schedule_type: config.schedule_type || 'daily',
        schedule_time: config.schedule_time || '14:00',
        schedule_days: config.schedule_days || [],
        simulation_test_count: config.simulation_test_count || 20,
        simulation_randomize: config.simulation_randomize !== false,
        monitoring_time_window_hours: config.monitoring_time_window_hours || 24,
        monitoring_min_severity: config.monitoring_min_severity || 'high',
        email_notifications: config.email_notifications !== false,
        notification_emails: config.notification_emails || [],
        auto_generate_pdf: config.auto_generate_pdf !== false,
        auto_send_weekly_report: config.auto_send_weekly_report || false,
      });
    }
  }, [config]);

  const calculateNextRun = () => {
    const timezone = 'America/Sao_Paulo';
    const now = new Date();
    const [hours, minutes] = formData.schedule_time.split(':').map(Number);
    
    // Criar data no timezone local (Brasília)
    const next = new Date(now);
    next.setHours(hours, minutes, 0, 0);
    
    // Se já passou, agendar para amanhã
    if (next <= now) {
      next.setDate(next.getDate() + 1);
    }
    
    // Converter para UTC considerando offset de São Paulo (-3h)
    // São Paulo é UTC-3, então adiciona 3 horas para obter UTC
    const utcTime = new Date(next.getTime() + (3 * 60 * 60 * 1000));
    
    return utcTime.toISOString();
  };

  const handleSave = async () => {
    if (!formData.config_name) {
      toast.error('Nome da configuração é obrigatório');
      return;
    }

    setIsSaving(true);

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('User not authenticated');

      const dataToSave = {
        ...formData,
        timezone: 'America/Sao_Paulo',
        next_run_at: calculateNextRun(),
        created_by: userData.user.id,
        updated_by: userData.user.id,
      };

      let result;
      if (config?.id) {
        result = await supabase
          .from('security_automation_configs')
          .update(dataToSave)
          .eq('id', config.id);
      } else {
        result = await supabase
          .from('security_automation_configs')
          .insert(dataToSave);
      }

      if (result.error) throw result.error;

      toast.success(config?.id ? 'Configuração atualizada!' : 'Configuração criada!');
      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error saving config:', error);
      toast.error('Erro ao salvar configuração');
    } finally {
      setIsSaving(false);
    }
  };

  const addEmail = () => {
    if (newEmail && newEmail.includes('@')) {
      setFormData({
        ...formData,
        notification_emails: [...formData.notification_emails, newEmail]
      });
      setNewEmail('');
    }
  };

  const removeEmail = (email: string) => {
    setFormData({
      ...formData,
      notification_emails: formData.notification_emails.filter(e => e !== email)
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {config?.id ? 'Editar' : 'Nova'} Configuração de Automação
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Basic Settings */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="config_name">Nome da Configuração *</Label>
              <Input
                id="config_name"
                value={formData.config_name}
                onChange={(e) => setFormData({ ...formData, config_name: e.target.value })}
                placeholder="Ex: Simulação Diária de Segurança"
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div>
                <Label className="font-medium">Habilitar Automação</Label>
                <p className="text-xs text-muted-foreground">
                  Ativa a execução automática desta configuração
                </p>
              </div>
              <Switch
                checked={formData.is_enabled}
                onCheckedChange={(checked) => setFormData({ ...formData, is_enabled: checked })}
              />
            </div>

            <div>
              <Label>Tipo</Label>
              <Select
                value={formData.config_type}
                onValueChange={(value: any) => setFormData({ ...formData, config_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="simulation">Simulação</SelectItem>
                  <SelectItem value="monitoring">Monitoramento</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Schedule Settings */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="font-semibold">Agendamento</h3>
            
            <div>
              <Label>Frequência</Label>
              <Select
                value={formData.schedule_type}
                onValueChange={(value: any) => setFormData({ ...formData, schedule_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Diária</SelectItem>
                  <SelectItem value="weekly">Semanal</SelectItem>
                  <SelectItem value="monthly">Mensal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="schedule_time">Horário (Brasília - GMT-3)</Label>
              <Input
                id="schedule_time"
                type="time"
                value={formData.schedule_time}
                onChange={(e) => setFormData({ ...formData, schedule_time: e.target.value })}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Fuso horário: América/São Paulo (UTC-3)
              </p>
            </div>
          </div>

          {/* Simulation Settings */}
          {formData.config_type === 'simulation' && (
            <div className="space-y-4 pt-4 border-t">
              <h3 className="font-semibold">Configurações de Simulação</h3>
              
              <div>
                <Label htmlFor="test_count">Quantidade de testes</Label>
                <Input
                  id="test_count"
                  type="number"
                  value={formData.simulation_test_count}
                  onChange={(e) => setFormData({ ...formData, simulation_test_count: parseInt(e.target.value) })}
                  min={1}
                  max={100}
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div>
                  <Label className="font-medium">Aleatorizar Casos de Teste</Label>
                  <p className="text-xs text-muted-foreground">
                    Seleciona testes em ordem aleatória a cada execução
                  </p>
                </div>
                <Switch
                  checked={formData.simulation_randomize}
                  onCheckedChange={(checked) => setFormData({ ...formData, simulation_randomize: checked })}
                />
              </div>
            </div>
          )}

          {/* Monitoring Settings */}
          {formData.config_type === 'monitoring' && (
            <div className="space-y-4 pt-4 border-t">
              <h3 className="font-semibold">Configurações de Monitoramento</h3>
              
              <div>
                <Label>Janela de tempo</Label>
                <Select
                  value={formData.monitoring_time_window_hours.toString()}
                  onValueChange={(value) => setFormData({ ...formData, monitoring_time_window_hours: parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="24">24 horas</SelectItem>
                    <SelectItem value="168">7 dias</SelectItem>
                    <SelectItem value="720">30 dias</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Severidade mínima</Label>
                <Select
                  value={formData.monitoring_min_severity}
                  onValueChange={(value) => setFormData({ ...formData, monitoring_min_severity: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baixa</SelectItem>
                    <SelectItem value="medium">Média</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                    <SelectItem value="critical">Crítica</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Notification Settings */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="font-semibold">Notificações</h3>
            
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div>
                <Label className="font-medium">Notificações por Email</Label>
                <p className="text-xs text-muted-foreground">
                  Enviar resumo dos resultados por email
                </p>
              </div>
              <Switch
                checked={formData.email_notifications}
                onCheckedChange={(checked) => setFormData({ ...formData, email_notifications: checked })}
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div>
                <Label className="font-medium">Gerar PDF Automaticamente</Label>
                <p className="text-xs text-muted-foreground">
                  Cria relatório PDF após cada execução
                </p>
              </div>
              <Switch
                checked={formData.auto_generate_pdf}
                onCheckedChange={(checked) => setFormData({ ...formData, auto_generate_pdf: checked })}
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div>
                <Label className="font-medium">Relatório Semanal</Label>
                <p className="text-xs text-muted-foreground">
                  Envia resumo consolidado toda segunda-feira
                </p>
              </div>
              <Switch
                checked={formData.auto_send_weekly_report}
                onCheckedChange={(checked) => setFormData({ ...formData, auto_send_weekly_report: checked })}
              />
            </div>

            <div>
              <Label>Emails adicionais</Label>
              <div className="flex gap-2">
                <Input
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="email@example.com"
                  onKeyPress={(e) => e.key === 'Enter' && addEmail()}
                />
                <Button type="button" onClick={addEmail} size="sm">
                  Adicionar
                </Button>
              </div>
              {formData.notification_emails.length > 0 && (
                <div className="mt-2 space-y-1">
                  {formData.notification_emails.map((email) => (
                    <div key={email} className="flex items-center justify-between p-2 bg-muted rounded">
                      <span className="text-sm">{email}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeEmail(email)}
                      >
                        Remover
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Next Run Preview */}
          {formData.is_enabled && (
            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                <strong>Próxima execução:</strong> {new Date(calculateNextRun()).toLocaleString('pt-BR')}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Salvando...' : 'Salvar Configuração'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
