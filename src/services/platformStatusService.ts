import { supabase } from '@/integrations/supabase/client';
import { PlatformStatusEvent, ServiceMetrics, StatusUpdate } from '@/types/platform';

export class PlatformStatusService {
  async getActiveIncidents() {
    const { data, error } = await supabase
      .from('platform_status_events')
      .select('*')
      .neq('status', 'resolved')
      .order('started_at', { ascending: false });

    if (error) throw error;
    return data as PlatformStatusEvent[];
  }

  async getIncidentHistory(days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from('platform_status_events')
      .select('*')
      .gte('started_at', startDate.toISOString())
      .order('started_at', { ascending: false });

    if (error) throw error;
    return data as PlatformStatusEvent[];
  }

  async createIncident(incident: Omit<PlatformStatusEvent, 'id' | 'created_at' | 'updated_at' | 'duration_minutes'>) {
    const { data, error } = await supabase
      .from('platform_status_events')
      .insert(incident)
      .select()
      .single();

    if (error) throw error;
    return data as PlatformStatusEvent;
  }

  async updateIncident(id: string, updates: Partial<PlatformStatusEvent>) {
    const { data, error } = await supabase
      .from('platform_status_events')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as PlatformStatusEvent;
  }

  async addIncidentUpdate(id: string, update: StatusUpdate) {
    const { data: incident } = await supabase
      .from('platform_status_events')
      .select('updates')
      .eq('id', id)
      .single();

    if (!incident) throw new Error('Incident not found');

    const updates = [...(incident.updates || []), update];

    return this.updateIncident(id, { updates });
  }

  async resolveIncident(id: string, resolvedAt?: string) {
    // Buscar incidente para pegar started_at
    const { data: incident } = await supabase
      .from('platform_status_events')
      .select('started_at')
      .eq('id', id)
      .single();

    if (!incident) throw new Error('Incident not found');

    const resolved = resolvedAt ? new Date(resolvedAt) : new Date();
    const started = new Date(incident.started_at);
    
    // Calcular duração em minutos
    const duration_minutes = Math.round((resolved.getTime() - started.getTime()) / (1000 * 60));

    return this.updateIncident(id, {
      status: 'resolved',
      resolved_at: resolved.toISOString(),
      duration_minutes,
    });
  }

  async getServiceMetrics(serviceName: string, days: number = 90) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from('platform_service_metrics')
      .select('*')
      .eq('service_name', serviceName)
      .gte('date', startDate.toISOString())
      .order('date', { ascending: true });

    if (error) throw error;
    return data as ServiceMetrics[];
  }

  async updateServiceMetrics(serviceName: string, date: string, metrics: Omit<ServiceMetrics, 'service_name' | 'date'>) {
    const { data, error } = await supabase
      .from('platform_service_metrics')
      .upsert({
        service_name: serviceName,
        date,
        ...metrics,
      })
      .select()
      .single();

    if (error) throw error;
    return data as ServiceMetrics;
  }
}

export const platformStatusService = new PlatformStatusService();
