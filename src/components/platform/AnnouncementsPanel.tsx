import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sparkles, CheckCheck, Clock, Package, Settings, Zap, Activity } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { usePlatformAnnouncements } from '@/hooks/usePlatformAnnouncements';
import ReactMarkdown from 'react-markdown';

interface AnnouncementsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const typeIcons = {
  feature: Sparkles,
  update: Activity,
  maintenance: Settings,
  improvement: Zap,
  integration: Package
};

const typeColors = {
  feature: 'bg-primary/10 text-primary border-primary/20',
  update: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  maintenance: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  improvement: 'bg-green-500/10 text-green-600 border-green-500/20',
  integration: 'bg-purple-500/10 text-purple-600 border-purple-500/20'
};

export function AnnouncementsPanel({ open, onOpenChange }: AnnouncementsPanelProps) {
  const { announcements, isLoading, markAsRead, markAllAsRead } = usePlatformAnnouncements();

  const handleAnnouncementClick = (id: string) => {
    markAsRead(id);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Novidades da Plataforma
            </SheetTitle>
            {announcements.some(a => a.is_new) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                className="text-xs"
              >
                <CheckCheck className="h-4 w-4 mr-1" />
                Marcar tudo como lido
              </Button>
            )}
          </div>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-8rem)] mt-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : announcements.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Nenhuma novidade no momento</p>
            </div>
          ) : (
            <div className="space-y-4">
              {announcements.map((announcement) => {
                const Icon = typeIcons[announcement.type];
                
                return (
                  <div
                    key={announcement.id}
                    onClick={() => handleAnnouncementClick(announcement.id)}
                    className={`p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                      announcement.is_new ? 'bg-accent/50 border-primary/30' : 'bg-card'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {announcement.is_new && (
                        <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                      )}
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <Badge variant="outline" className={typeColors[announcement.type]}>
                            <Icon className="h-3 w-3 mr-1" />
                            {announcement.type === 'feature' && 'Novo Recurso'}
                            {announcement.type === 'update' && 'Atualização'}
                            {announcement.type === 'maintenance' && 'Manutenção'}
                            {announcement.type === 'improvement' && 'Melhoria'}
                            {announcement.type === 'integration' && 'Integração'}
                          </Badge>
                          
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDistanceToNow(new Date(announcement.published_at), {
                              addSuffix: true,
                              locale: ptBR
                            })}
                          </span>
                        </div>

                        <h3 className="font-semibold mb-1">{announcement.title}</h3>
                        <p className="text-sm text-muted-foreground mb-2">
                          {announcement.description}
                        </p>

                        {announcement.content && (
                          <div className="prose prose-sm dark:prose-invert max-w-none mt-3">
                            <ReactMarkdown>{announcement.content}</ReactMarkdown>
                          </div>
                        )}

                        {announcement.image_url && (
                          <img
                            src={announcement.image_url}
                            alt={announcement.title}
                            className="mt-3 rounded-md w-full object-cover max-h-48"
                          />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
