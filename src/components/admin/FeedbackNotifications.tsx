import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, Bell, CheckCircle, Eye, MessageSquare, X, Filter } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  data: any;
  read: boolean;
  created_at: string;
}

interface FeedbackAlert {
  id: string;
  message_id: string;
  session_id: string;
  model: string;
  alert_type: string;
  severity: string;
  comment?: string;
  resolved: boolean;
  resolved_by?: string;
  resolved_at?: string;
  created_at: string;
}

export function FeedbackNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [alerts, setAlerts] = useState<FeedbackAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'feedback_alerts'>('all');
  const { toast } = useToast();

  useEffect(() => {
    loadNotifications();
    loadAlerts();
    
    // Set up real-time subscription for new notifications
    const notificationSubscription = supabase
      .channel('notifications')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          setNotifications(prev => [payload.new as Notification, ...prev]);
          
          // Show toast for high priority alerts
          if (payload.new.type === 'feedback_alert') {
            toast({
              title: payload.new.title,
              description: payload.new.message,
              variant: "destructive",
            });
          }
        }
      )
      .subscribe();

    // Set up real-time subscription for alerts
    const alertSubscription = supabase
      .channel('feedback_alerts')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'feedback_alerts' },
        () => {
          loadAlerts();
        }
      )
      .subscribe();

    return () => {
      notificationSubscription.unsubscribe();
      alertSubscription.unsubscribe();
    };
  }, []);

  const loadNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  const loadAlerts = async () => {
    try {
      const { data, error } = await supabase
        .from('feedback_alerts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setAlerts(data || []);
    } catch (error) {
      console.error('Error loading alerts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast({
        title: "Erro",
        description: "Não foi possível marcar como lida.",
        variant: "destructive",
      });
    }
  };

  const markAllAsRead = async () => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('read', false);

      if (error) throw error;

      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      
      toast({
        title: "Sucesso",
        description: "Todas as notificações foram marcadas como lidas.",
      });
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast({
        title: "Erro",
        description: "Não foi possível marcar todas como lidas.",
        variant: "destructive",
      });
    }
  };

  const resolveAlert = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('feedback_alerts')
        .update({ 
          resolved: true, 
          resolved_at: new Date().toISOString() 
        })
        .eq('id', alertId);

      if (error) throw error;

      setAlerts(prev => 
        prev.map(a => a.id === alertId ? { ...a, resolved: true } : a)
      );

      toast({
        title: "Sucesso",
        description: "Alerta resolvido com sucesso.",
      });
    } catch (error) {
      console.error('Error resolving alert:', error);
      toast({
        title: "Erro",
        description: "Não foi possível resolver o alerta.",
        variant: "destructive",
      });
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getAlertTypeLabel = (type: string) => {
    switch (type) {
      case 'negative_feedback': return 'Feedback Negativo';
      case 'low_rating': return 'Avaliação Baixa';
      case 'spam_detection': return 'Possível Spam';
      default: return type;
    }
  };

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') return !n.read;
    if (filter === 'feedback_alerts') return n.type === 'feedback_alert';
    return true;
  });

  const unreadCount = notifications.filter(n => !n.read).length;
  const activeAlertsCount = alerts.filter(a => !a.resolved).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Bell className="h-6 w-6" />
            Notificações e Alertas
          </h2>
          <p className="text-muted-foreground">
            {unreadCount} não lidas • {activeAlertsCount} alertas ativos
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFilter(filter === 'all' ? 'unread' : 'all')}
          >
            <Filter className="h-4 w-4 mr-2" />
            {filter === 'all' ? 'Mostrar não lidas' : 'Mostrar todas'}
          </Button>
          
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={markAllAsRead}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Marcar todas como lidas
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="notifications" className="space-y-4">
        <TabsList>
          <TabsTrigger value="notifications">
            Notificações
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                {unreadCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="alerts">
            Alertas de Feedback
            {activeAlertsCount > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                {activeAlertsCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="notifications" className="space-y-4">
          {filteredNotifications.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center h-32">
                <div className="text-center space-y-2">
                  <Bell className="h-8 w-8 text-muted-foreground mx-auto" />
                  <p className="text-muted-foreground">
                    {filter === 'unread' ? 'Nenhuma notificação não lida' : 'Nenhuma notificação'}
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredNotifications.map((notification) => (
                <Card key={notification.id} className={cn(
                  "transition-all duration-200",
                  !notification.read && "border-l-4 border-l-primary bg-primary/5"
                )}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className={cn(
                            "font-medium",
                            !notification.read && "font-semibold"
                          )}>
                            {notification.title}
                          </h4>
                          {!notification.read && (
                            <div className="w-2 h-2 bg-primary rounded-full" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(notification.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                        </p>
                      </div>
                      
                      {!notification.read && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => markAsRead(notification.id)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          {alerts.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center h-32">
                <div className="text-center space-y-2">
                  <AlertTriangle className="h-8 w-8 text-muted-foreground mx-auto" />
                  <p className="text-muted-foreground">Nenhum alerta de feedback</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert) => (
                <Card key={alert.id} className={cn(
                  "transition-all duration-200",
                  !alert.resolved && "border-l-4 border-l-yellow-500"
                )}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertTriangle className="h-4 w-4 text-yellow-600" />
                          <h4 className="font-medium">
                            {getAlertTypeLabel(alert.alert_type)}
                          </h4>
                          <Badge className={getSeverityColor(alert.severity)}>
                            {alert.severity.toUpperCase()}
                          </Badge>
                          {alert.resolved && (
                            <Badge variant="outline">
                              Resolvido
                            </Badge>
                          )}
                        </div>
                        
                        <div className="space-y-1 text-sm text-muted-foreground">
                          <p><strong>Modelo:</strong> {alert.model}</p>
                          <p><strong>Sessão:</strong> {alert.session_id.slice(0, 8)}...</p>
                          <p><strong>Data:</strong> {format(new Date(alert.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</p>
                        </div>
                        
                        {alert.comment && (
                          <div className="mt-2">
                            <p className="text-sm font-medium">Comentário do usuário:</p>
                            <p className="text-sm bg-muted p-2 rounded mt-1">
                              {alert.comment}
                            </p>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MessageSquare className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Detalhes do Alerta</DialogTitle>
                            </DialogHeader>
                            
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="text-sm font-medium">Tipo</label>
                                  <p className="text-sm text-muted-foreground">
                                    {getAlertTypeLabel(alert.alert_type)}
                                  </p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium">Severidade</label>
                                  <Badge className={getSeverityColor(alert.severity)}>
                                    {alert.severity.toUpperCase()}
                                  </Badge>
                                </div>
                              </div>
                              
                              <div>
                                <label className="text-sm font-medium">ID da Mensagem</label>
                                <p className="text-sm text-muted-foreground font-mono">
                                  {alert.message_id}
                                </p>
                              </div>
                              
                              <div>
                                <label className="text-sm font-medium">ID da Sessão</label>
                                <p className="text-sm text-muted-foreground font-mono">
                                  {alert.session_id}
                                </p>
                              </div>
                              
                              {alert.comment && (
                                <div>
                                  <label className="text-sm font-medium">Comentário</label>
                                  <p className="text-sm bg-muted p-3 rounded mt-1">
                                    {alert.comment}
                                  </p>
                                </div>
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>
                        
                        {!alert.resolved && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => resolveAlert(alert.id)}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}