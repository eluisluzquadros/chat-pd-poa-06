import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PlatformStatusEvent, ServiceStatus, BUSINESS_SERVICES, TECHNICAL_SERVICES } from '@/types/platform';

export function usePlatformStatus(isAdmin: boolean = false) {
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [recentEvents, setRecentEvents] = useState<PlatformStatusEvent[]>([]);
  const [isAllOperational, setIsAllOperational] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchPlatformStatus();
    const interval = setInterval(fetchPlatformStatus, 60000); // Atualizar a cada minuto
    return () => clearInterval(interval);
  }, []);

  const fetchPlatformStatus = async () => {
    try {
      // Buscar eventos ativos
      const { data: activeEvents } = await supabase
        .from('platform_status_events')
        .select('*')
        .neq('status', 'resolved')
        .order('started_at', { ascending: false });

      // Buscar eventos recentes (últimos 30 dias)
      const { data: recentEventsData } = await supabase
        .from('platform_status_events')
        .select('*')
        .gte('started_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .order('started_at', { ascending: false })
        .limit(50);

      // Buscar métricas dos últimos 90 dias
      const { data: metricsData } = await supabase
        .from('platform_service_metrics')
        .select('*')
        .gte('date', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
        .order('date', { ascending: true });

      // Organizar por serviço
      const servicesMap = new Map<string, ServiceStatus>();
      
      // Definir serviços baseado no tipo de usuário
      const allServices = isAdmin 
        ? [...BUSINESS_SERVICES, ...TECHNICAL_SERVICES]
        : BUSINESS_SERVICES;
      
      const mainServices = allServices.map(s => s.name);
      
      mainServices.forEach(service => {
        const serviceEvents = (activeEvents || []).filter(e => e.service_name === service);
        const serviceMetrics = (metricsData || []).filter(m => m.service_name === service);
        
        const uptime90d = serviceMetrics.map(m => Number(m.uptime_percentage));
        const hasActiveIncidents = serviceEvents.length > 0;
        
        let status: ServiceStatus['status'] = 'operational';
        if (hasActiveIncidents) {
          const highestSeverity = serviceEvents[0].severity;
          if (highestSeverity === 'critical') status = 'down';
          else if (highestSeverity === 'warning') status = 'degraded';
          else status = 'maintenance';
        }

        servicesMap.set(service, {
          name: service,
          status,
          uptime_90d: uptime90d,
          current_incidents: serviceEvents
        });
      });

      setServices(Array.from(servicesMap.values()));
      setRecentEvents(recentEventsData || []);
      setIsAllOperational(!activeEvents || activeEvents.length === 0);
    } catch (error) {
      console.error('Error fetching platform status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    services,
    recentEvents,
    isAllOperational,
    isLoading,
    refetch: fetchPlatformStatus
  };
}
