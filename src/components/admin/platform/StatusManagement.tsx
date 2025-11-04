import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { platformStatusService } from '@/services/platformStatusService';
import { PlatformStatusEvent } from '@/types/platform';
import { useToast } from '@/hooks/use-toast';
import { IncidentDialog } from './IncidentDialog';
import { ServiceStatusCards } from './ServiceStatusCards';
import { IncidentTimeline } from './IncidentTimeline';

export function StatusManagement() {
  const [activeIncidents, setActiveIncidents] = useState<PlatformStatusEvent[]>([]);
  const [recentIncidents, setRecentIncidents] = useState<PlatformStatusEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<PlatformStatusEvent | null>(null);
  const { toast } = useToast();

  const loadIncidents = async () => {
    try {
      setIsLoading(true);
      const [active, recent] = await Promise.all([
        platformStatusService.getActiveIncidents(),
        platformStatusService.getIncidentHistory(30),
      ]);
      setActiveIncidents(active);
      setRecentIncidents(recent);
    } catch (error) {
      toast({
        title: 'Erro ao carregar incidentes',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadIncidents();
  }, []);

  const handleCreateIncident = () => {
    setSelectedIncident(null);
    setIsDialogOpen(true);
  };

  const handleEditIncident = (incident: PlatformStatusEvent) => {
    setSelectedIncident(incident);
    setIsDialogOpen(true);
  };

  if (isLoading) {
    return <div className="flex justify-center py-8">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Status e Incidentes</h3>
        <Button onClick={handleCreateIncident} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Reportar Incidente
        </Button>
      </div>

      <ServiceStatusCards />

      {activeIncidents.length > 0 && (
        <div>
          <h4 className="text-md font-medium mb-3">Incidentes Ativos</h4>
          <IncidentTimeline 
            incidents={activeIncidents} 
            onEdit={handleEditIncident}
            showActions
          />
        </div>
      )}

      <div>
        <h4 className="text-md font-medium mb-3">Histórico Recente (30 dias)</h4>
        <IncidentTimeline 
          incidents={recentIncidents} 
          onEdit={handleEditIncident}
          showActions
        />
      </div>

      <IncidentDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        incident={selectedIncident}
        onSuccess={loadIncidents}
      />
    </div>
  );
}
