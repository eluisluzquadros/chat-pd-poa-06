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
      const subscription = subscribeToAnnouncements();
      return () => {
        supabase.removeChannel(subscription);
      };
    }
  }, [user]);

  const fetchAnnouncements = async () => {
    if (!user) return;

    try {
      // Fetch active announcements
      const { data: announcementsData } = await supabase
        .from('platform_announcements')
        .select('*')
        .eq('is_active', true)
        .lte('published_at', new Date().toISOString())
        .order('published_at', { ascending: false })
        .limit(50);

      // Fetch user views
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
      console.error('Error fetching announcements:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const subscribeToAnnouncements = () => {
    return supabase
      .channel('platform_announcements_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'platform_announcements'
      }, () => {
        fetchAnnouncements();
      })
      .subscribe();
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
        }, {
          onConflict: 'user_id,announcement_id'
        });

      await fetchAnnouncements();
    } catch (error) {
      console.error('Error marking announcement as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;

    try {
      const unreadAnnouncements = announcements.filter(a => a.is_new);
      
      await Promise.all(
        unreadAnnouncements.map(a =>
          supabase.from('user_announcement_views').upsert({
            user_id: user.id,
            announcement_id: a.id,
            viewed_at: new Date().toISOString()
          }, {
            onConflict: 'user_id,announcement_id'
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
