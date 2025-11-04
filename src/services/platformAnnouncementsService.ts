import { supabase } from '@/integrations/supabase/client';
import { PlatformAnnouncement } from '@/types/platform';

export class PlatformAnnouncementsService {
  async getAnnouncements(filters?: {
    type?: string;
    is_active?: boolean;
    category?: string;
  }) {
    let query = supabase
      .from('platform_announcements')
      .select('*')
      .order('published_at', { ascending: false });

    if (filters?.type) {
      query = query.eq('type', filters.type);
    }
    if (filters?.is_active !== undefined) {
      query = query.eq('is_active', filters.is_active);
    }
    if (filters?.category) {
      query = query.eq('category', filters.category);
    }

    const { data, error } = await query;
    
    if (error) throw error;
    return data as PlatformAnnouncement[];
  }

  async createAnnouncement(announcement: Omit<PlatformAnnouncement, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('platform_announcements')
      .insert(announcement)
      .select()
      .single();

    if (error) throw error;
    return data as PlatformAnnouncement;
  }

  async updateAnnouncement(id: string, updates: Partial<PlatformAnnouncement>) {
    const { data, error } = await supabase
      .from('platform_announcements')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as PlatformAnnouncement;
  }

  async deleteAnnouncement(id: string) {
    const { error } = await supabase
      .from('platform_announcements')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  async toggleAnnouncementStatus(id: string, is_active: boolean) {
    return this.updateAnnouncement(id, { is_active });
  }
}

export const platformAnnouncementsService = new PlatformAnnouncementsService();
