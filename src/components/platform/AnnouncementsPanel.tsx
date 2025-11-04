import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sparkles, CheckCheck, Package, RefreshCw, AlertCircle, Wrench, Link as LinkIcon } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { usePlatformAnnouncements } from '@/hooks/usePlatformAnnouncements';
import { Separator } from '@/components/ui/separator';
import ReactMarkdown from 'react-markdown';
import { Link } from 'react-router-dom';

interface AnnouncementsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const typeIcons = {
  feature: Sparkles,
  update: RefreshCw,
  maintenance: AlertCircle,
  improvement: Wrench,
  integration: LinkIcon
};

const typeColors = {
  feature: 'bg-primary/10 text-primary border-primary/20',
  update: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  maintenance: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  improvement: 'bg-green-500/10 text-green-600 border-green-500/20',
  integration: 'bg-purple-500/10 text-purple-600 border-purple-500/20'
};

export function AnnouncementsPanel({ open, onOpenChange }: AnnouncementsPanelProps) {
  const { announcements, unreadCount, isLoading, markAsRead, markAllAsRead } = usePlatformAnnouncements();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md overflow-hidden flex flex-col">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Novidades
            </SheetTitle>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                className="h-8 text-xs"
              >
                <CheckCheck className="h-4 w-4 mr-1" />
                Marcar todas como lidas
              </Button>
            )}
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-4 py-4">
            {isLoading ? (
              <div className="text-center text-muted-foreground py-8">
                Carregando...
              </div>
            ) : announcements.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Nenhuma novidade no momento</p>
              </div>
            ) : (
              announcements.map((announcement, index) => {
                const Icon = typeIcons[announcement.type];
                const timeAgo = formatDistanceToNow(new Date(announcement.published_at), {
                  addSuffix: true,
                  locale: ptBR
                });

                return (
                  <div key={announcement.id}>
                    {index > 0 && <Separator className="my-4" />}
                    <div 
                      className={`relative group cursor-pointer rounded-lg p-4 transition-colors ${
                        announcement.is_new ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-muted/50'
                      }`}
                      onClick={() => markAsRead(announcement.id)}
                    >
                      {announcement.is_new && (
                        <div className="absolute top-2 right-2">
                          <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                        </div>
                      )}

                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg border ${typeColors[announcement.type]}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-sm">{announcement.title}</h4>
                            <Badge variant="outline" className="text-xs">
                              {announcement.type}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {announcement.description}
                          </p>
                          {announcement.content && (
                            <div className="prose prose-sm max-w-none text-xs text-muted-foreground mt-3 border-t pt-3">
                              <ReactMarkdown>{announcement.content}</ReactMarkdown>
                            </div>
                          )}
                          <p className="text-xs text-muted-foreground mt-3">
                            {timeAgo}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>

        <div className="border-t pt-4 mt-4">
          <Link to="/status">
            <Button variant="outline" className="w-full" onClick={() => onOpenChange(false)}>
              Ver Status da Plataforma
            </Button>
          </Link>
        </div>
      </SheetContent>
    </Sheet>
  );
}
