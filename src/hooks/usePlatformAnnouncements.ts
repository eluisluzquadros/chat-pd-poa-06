import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PlatformAnnouncement } from '@/types/platform';
import { useAuth } from '@/context/AuthContext';

export function usePlatformAnnouncements() {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<PlatformAnnouncement[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchAnnouncements();
      const channel = subscribeToAnnouncements();
      return () => {
        supabase.removeChannel(channel);
      };
    } else {
      setIsLoading(false);
    }
  }, [user]);

  const fetchAnnouncements = async () => {
    if (!user) return;

    try {
      // Buscar anúncios ativos
      const { data: announcementsData, error: annError } = await supabase
        .from('platform_announcements')
        .select('*')
        .eq('is_active', true)
        .lte('published_at', new Date().toISOString())
        .order('published_at', { ascending: false })
        .limit(50);

      if (annError) {
        console.error('Error fetching announcements:', annError);
        setIsLoading(false);
        return;
      }

      // Buscar visualizações do usuário
      const { data: viewsData } = await supabase
        .from('user_announcement_views')
        .select('announcement_id')
        .eq('user_id', user.id);

      const viewedIds = new Set(viewsData?.map(v => v.announcement_id) || []);
      
      const enrichedAnnouncements = (announcementsData || []).map(a => ({
        ...a,
        is_new: !viewedIds.has(a.id)
      }));

      setAnnouncements(enrichedAnnouncements);
      setUnreadCount(enrichedAnnouncements.filter(a => a.is_new).length);
    } catch (error) {
      console.error('Failed to fetch announcements:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const subscribeToAnnouncements = () => {
    const channel = supabase
      .channel('platform_announcements_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'platform_announcements'
      }, () => {
        fetchAnnouncements();
      })
      .subscribe();

    return channel;
  };

  const markAsRead = async (announcementId: string) => {
    if (!user) return;

    try {
      await supabase
        .from('user_announcement_views')
        .upsert({
          user_id: user.id,
          announcement_id: announcementId,
          viewed_at: new Date().toISOString()
        });

      await fetchAnnouncements();
    } catch (error) {
      console.error('Error marking announcement as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;

    const unreadAnnouncements = announcements.filter(a => a.is_new);
    
    try {
      await Promise.all(
        unreadAnnouncements.map(a =>
          supabase.from('user_announcement_views').upsert({
            user_id: user.id,
            announcement_id: a.id,
            viewed_at: new Date().toISOString()
          })
        )
      );

      await fetchAnnouncements();
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  return {
    announcements,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    refetch: fetchAnnouncements
  };
}
