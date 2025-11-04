import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { platformStatusService } from '@/services/platformStatusService';
import { PlatformStatusEvent, BUSINESS_SERVICES, TECHNICAL_SERVICES } from '@/types/platform';
import { useToast } from '@/hooks/use-toast';
import { Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const incidentSchema = z.object({
  service_name: z.string().min(1, 'Serviço é obrigatório'),
  event_type: z.enum(['outage', 'degradation', 'maintenance', 'resolved']),
  severity: z.enum(['info', 'warning', 'critical']),
  title: z.string().min(1, 'Título é obrigatório'),
  description: z.string().min(1, 'Descrição é obrigatória'),
  status: z.enum(['investigating', 'identified', 'monitoring', 'resolved']),
  affected_users: z.coerce.number().min(0),
  started_at: z.string()
    .min(1, 'Data de início é obrigatória')
    .refine(
      (val) => new Date(val) <= new Date(),
      { message: 'Data não pode ser no futuro' }
    ),
  resolved_at: z.string().optional(),
  update_message: z.string().optional(),
}).refine(
  (data) => {
    if (data.resolved_at && data.started_at) {
      return new Date(data.resolved_at) >= new Date(data.started_at);
    }
    return true;
  },
  {
    message: 'Data de resolução deve ser posterior à data de início',
    path: ['resolved_at'],
  }
);

type IncidentFormData = z.infer<typeof incidentSchema>;

interface IncidentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  incident: PlatformStatusEvent | null;
  onSuccess: () => void;
}

const services = [
  ...BUSINESS_SERVICES.map(s => s.name),
  ...TECHNICAL_SERVICES.map(s => s.name)
];

export function IncidentDialog({
  open,
  onOpenChange,
  incident,
  onSuccess,
}: IncidentDialogProps) {
  const { toast } = useToast();
  const form = useForm<IncidentFormData>({
    resolver: zodResolver(incidentSchema),
    defaultValues: incident
      ? {
          service_name: incident.service_name,
          event_type: incident.event_type,
          severity: incident.severity,
          title: incident.title,
          description: incident.description,
          status: incident.status,
          affected_users: incident.affected_users,
          started_at: incident.started_at,
          resolved_at: incident.resolved_at || '',
          update_message: '',
        }
      : {
          service_name: services[0],
          event_type: 'outage',
          severity: 'warning',
          title: '',
          description: '',
          status: 'investigating',
          affected_users: 0,
          started_at: new Date().toISOString().slice(0, 16),
          resolved_at: '',
          update_message: '',
        },
  });

  const onSubmit = async (data: IncidentFormData) => {
    try {
      // Calcular duração se ambas as datas existirem e status for resolved
      let duration_minutes: number | undefined;
      
      if (data.status === 'resolved' && data.resolved_at) {
        const started = new Date(data.started_at || incident?.started_at || new Date());
        const resolved = new Date(data.resolved_at);
        duration_minutes = Math.round((resolved.getTime() - started.getTime()) / (1000 * 60));
      }

      if (incident) {
        // Atualizar incidente existente
        const updates: Partial<PlatformStatusEvent> = {
          status: data.status,
          affected_users: data.affected_users,
          title: data.title,
          description: data.description,
          severity: data.severity,
        };

        // Se status for resolved, adicionar campos de resolução
        if (data.status === 'resolved' && data.resolved_at) {
          updates.resolved_at = data.resolved_at;
          updates.duration_minutes = duration_minutes;
        }

        await platformStatusService.updateIncident(incident.id, updates);

        // Adicionar update se houver mensagem
        if (data.update_message) {
          await platformStatusService.addIncidentUpdate(incident.id, {
            timestamp: new Date().toISOString(),
            status: data.status,
            message: data.update_message,
          });
        }

        toast({
          title: 'Incidente atualizado',
          description: 'Incidente atualizado com sucesso',
        });
      } else {
        // Criar novo incidente
        await platformStatusService.createIncident({
          service_name: data.service_name,
          event_type: data.event_type,
          severity: data.severity,
          title: data.title,
          description: data.description,
          status: data.status,
          affected_users: data.affected_users,
          started_at: data.started_at,
          resolved_at: data.status === 'resolved' && data.resolved_at ? data.resolved_at : undefined,
          duration_minutes: data.status === 'resolved' ? duration_minutes : undefined,
          updates: [],
        });

        toast({
          title: 'Incidente criado',
          description: 'Incidente reportado com sucesso',
        });
      }

      onSuccess();
      onOpenChange(false);
      form.reset();
    } catch (error) {
      toast({
        title: 'Erro ao salvar incidente',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {incident ? 'Atualizar Incidente' : 'Reportar Novo Incidente'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="service_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Serviço Afetado</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!!incident}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem disabled className="text-xs font-semibold text-muted-foreground">
                        Serviços de Negócio
                      </SelectItem>
                      {BUSINESS_SERVICES.map((service) => (
                        <SelectItem key={service.name} value={service.name} className="pl-6">
                          {service.displayName}
                        </SelectItem>
                      ))}
                      
                      <SelectItem disabled className="text-xs font-semibold text-muted-foreground mt-2">
                        Serviços Técnicos
                      </SelectItem>
                      {TECHNICAL_SERVICES.map((service) => (
                        <SelectItem key={service.name} value={service.name} className="pl-6">
                          {service.displayName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="event_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!!incident}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="outage">Interrupção</SelectItem>
                        <SelectItem value="degradation">Degradação</SelectItem>
                        <SelectItem value="maintenance">Manutenção</SelectItem>
                        <SelectItem value="resolved">Resolvido</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="severity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Severidade</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="info">Info</SelectItem>
                        <SelectItem value="warning">Aviso</SelectItem>
                        <SelectItem value="critical">Crítico</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Título do incidente" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Descrição detalhada do incidente"
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="started_at"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    Data e Hora de Início
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">Quando o incidente começou a afetar os usuários</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </FormLabel>
                  <FormControl>
                    <Input 
                      type="datetime-local" 
                      {...field}
                      value={field.value ? new Date(field.value).toISOString().slice(0, 16) : ''}
                      onChange={(e) => field.onChange(new Date(e.target.value).toISOString())}
                      disabled={!!incident}
                      className={!!incident ? "bg-muted cursor-not-allowed" : ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {form.watch('status') === 'resolved' && (
              <FormField
                control={form.control}
                name="resolved_at"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      Data e Hora de Resolução
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs">Quando o incidente foi completamente resolvido</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </FormLabel>
                    <FormControl>
                      <Input 
                        type="datetime-local" 
                        {...field}
                        value={field.value ? new Date(field.value).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16)}
                        onChange={(e) => field.onChange(new Date(e.target.value).toISOString())}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="investigating">Investigando</SelectItem>
                        <SelectItem value="identified">Identificado</SelectItem>
                        <SelectItem value="monitoring">Monitorando</SelectItem>
                        <SelectItem value="resolved">Resolvido</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="affected_users"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Usuários Afetados</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {incident && (
              <FormField
                control={form.control}
                name="update_message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Adicionar Atualização (Opcional)</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Mensagem de atualização do status do incidente"
                        rows={2}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                {incident ? 'Atualizar' : 'Criar'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
