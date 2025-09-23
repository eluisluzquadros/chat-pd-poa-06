import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Download, Trash2, Eye, Search, Filter, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ChatSession {
  id: string;
  title: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  last_message: string;
  model: string;
  message_count?: number;
  user_email?: string;
}

export default function ConversationManager() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterModel, setFilterModel] = useState('all');
  const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      
      // Get chat sessions first
      const { data: sessionsData, error } = await supabase
        .from('chat_sessions')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;

      // Get users and message counts separately to avoid relation issues
      const sessionsWithDetails = await Promise.all(
        (sessionsData || []).map(async (session) => {
          // Get user email
          const { data: profile } = await supabase
            .from('profiles')
            .select('email')
            .eq('id', session.user_id)
            .single();

          // Get message count
          const { count } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('session_id', session.id);
          
          return {
            ...session,
            user_email: profile?.email || 'Email não encontrado',
            message_count: count || 0
          };
        })
      );

      setSessions(sessionsWithDetails);
    } catch (error) {
      console.error('Erro ao carregar conversas:', error);
      toast.error('Erro ao carregar conversas');
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (sessionId: string) => {
    try {
      setLoadingMessages(true);
      
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error);
      toast.error('Erro ao carregar mensagens');
    } finally {
      setLoadingMessages(false);
    }
  };

  const deleteSession = async (sessionId: string) => {
    try {
      const { error } = await supabase.rpc('delete_chat_session_atomic', {
        session_id_param: sessionId
      });

      if (error) throw error;

      setSessions(prev => prev.filter(session => session.id !== sessionId));
      toast.success('Conversa removida com sucesso');
    } catch (error) {
      console.error('Erro ao remover conversa:', error);
      toast.error('Erro ao remover conversa');
    }
  };

  const exportSession = async (session: ChatSession) => {
    try {
      await fetchMessages(session.id);
      
      const exportData = {
        session: {
          id: session.id,
          title: session.title,
          user_email: session.user_email,
          created_at: session.created_at,
          model: session.model
        },
        messages: messages
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
        type: 'application/json' 
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `conversa-${session.title}-${format(new Date(session.created_at), 'yyyy-MM-dd')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('Conversa exportada com sucesso');
    } catch (error) {
      console.error('Erro ao exportar conversa:', error);
      toast.error('Erro ao exportar conversa');
    }
  };

  const filteredSessions = sessions.filter(session => {
    const matchesSearch = session.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         session.user_email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesModel = filterModel === 'all' || session.model === filterModel;
    return matchesSearch && matchesModel;
  });

  const uniqueModels = [...new Set(sessions.map(s => s.model))];

  useEffect(() => {
    fetchSessions();
  }, []);

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gerenciamento de Conversas</h1>
          <p className="text-muted-foreground">Visualize, gerencie e exporte conversas dos usuários</p>
        </div>
        <Button onClick={fetchSessions} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Buscar por título ou email do usuário..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <Select value={filterModel} onValueChange={setFilterModel}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filtrar por modelo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os modelos</SelectItem>
                {uniqueModels.map(model => (
                  <SelectItem key={model} value={model}>{model}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total de Conversas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sessions.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Usuários Únicos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(sessions.map(s => s.user_id)).size}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Conversas Filtradas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredSessions.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total de Mensagens</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {sessions.reduce((sum, s) => sum + (s.message_count || 0), 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de conversas */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Conversas</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Carregando conversas...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Modelo/Agente</TableHead>
                  <TableHead>Mensagens</TableHead>
                  <TableHead>Criada em</TableHead>
                  <TableHead>Atualizada em</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSessions.map(session => (
                  <TableRow key={session.id}>
                    <TableCell className="font-medium">
                      {session.title}
                    </TableCell>
                    <TableCell>{session.user_email}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{session.model}</Badge>
                    </TableCell>
                    <TableCell>{session.message_count}</TableCell>
                    <TableCell>
                      {format(new Date(session.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      {format(new Date(session.updated_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                setSelectedSession(session);
                                fetchMessages(session.id);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
                            <DialogHeader>
                              <DialogTitle>Detalhes da Conversa: {selectedSession?.title}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              {loadingMessages ? (
                                <div className="text-center py-8">Carregando mensagens...</div>
                              ) : (
                                messages.map((message, index) => (
                                  <div key={message.id} className={`p-3 rounded-lg ${
                                    message.role === 'user' ? 'bg-blue-50 ml-8' : 'bg-gray-50 mr-8'
                                  }`}>
                                    <div className="flex justify-between items-start mb-2">
                                      <Badge variant={message.role === 'user' ? 'default' : 'secondary'}>
                                        {message.role === 'user' ? 'Usuário' : 'Assistente'}
                                      </Badge>
                                      <span className="text-xs text-muted-foreground">
                                        {format(new Date(message.created_at), 'dd/MM/yyyy HH:mm')}
                                      </span>
                                    </div>
                                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                                  </div>
                                ))
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => exportSession(session)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={() => {
                            if (confirm('Tem certeza que deseja remover esta conversa?')) {
                              deleteSession(session.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}