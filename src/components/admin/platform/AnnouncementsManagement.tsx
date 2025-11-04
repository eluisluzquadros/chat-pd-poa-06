import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Power, PowerOff } from 'lucide-react';
import { platformAnnouncementsService } from '@/services/platformAnnouncementsService';
import { PlatformAnnouncement } from '@/types/platform';
import { useToast } from '@/hooks/use-toast';
import { AnnouncementDialog } from './AnnouncementDialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { format } from 'date-fns';

const typeColors: Record<string, string> = {
  feature: 'bg-primary/10 text-primary border-primary/20',
  update: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  maintenance: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  improvement: 'bg-green-500/10 text-green-500 border-green-500/20',
  integration: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
};

export function AnnouncementsManagement() {
  const [announcements, setAnnouncements] = useState<PlatformAnnouncement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<PlatformAnnouncement | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [announcementToDelete, setAnnouncementToDelete] = useState<string | null>(null);
  const { toast } = useToast();

  const loadAnnouncements = async () => {
    try {
      setIsLoading(true);
      const data = await platformAnnouncementsService.getAnnouncements();
      setAnnouncements(data);
    } catch (error) {
      toast({
        title: 'Erro ao carregar anúncios',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const handleCreate = () => {
    setSelectedAnnouncement(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (announcement: PlatformAnnouncement) => {
    setSelectedAnnouncement(announcement);
    setIsDialogOpen(true);
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      await platformAnnouncementsService.toggleAnnouncementStatus(id, !currentStatus);
      toast({
        title: 'Status atualizado',
        description: `Anúncio ${!currentStatus ? 'ativado' : 'desativado'} com sucesso`,
      });
      loadAnnouncements();
    } catch (error) {
      toast({
        title: 'Erro ao atualizar status',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!announcementToDelete) return;

    try {
      await platformAnnouncementsService.deleteAnnouncement(announcementToDelete);
      toast({
        title: 'Anúncio deletado',
        description: 'Anúncio removido com sucesso',
      });
      setAnnouncementToDelete(null);
      loadAnnouncements();
    } catch (error) {
      toast({
        title: 'Erro ao deletar anúncio',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return <div className="flex justify-center py-8">Carregando...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Anúncios da Plataforma</h3>
        <Button onClick={handleCreate} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Novo Anúncio
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tipo</TableHead>
              <TableHead>Título</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Prioridade</TableHead>
              <TableHead>Publicado em</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {announcements.map((announcement) => (
              <TableRow key={announcement.id}>
                <TableCell>
                  <Badge variant="outline" className={typeColors[announcement.type]}>
                    {announcement.type}
                  </Badge>
                </TableCell>
                <TableCell className="font-medium">{announcement.title}</TableCell>
                <TableCell>{announcement.category}</TableCell>
                <TableCell>{announcement.priority}</TableCell>
                <TableCell>
                  {format(new Date(announcement.published_at), 'dd/MM/yyyy')}
                </TableCell>
                <TableCell>
                  <Badge variant={announcement.is_active ? 'default' : 'secondary'}>
                    {announcement.is_active ? 'Ativo' : 'Inativo'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(announcement)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleToggleStatus(announcement.id, announcement.is_active)}
                  >
                    {announcement.is_active ? (
                      <PowerOff className="h-4 w-4" />
                    ) : (
                      <Power className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setAnnouncementToDelete(announcement.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AnnouncementDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        announcement={selectedAnnouncement}
        onSuccess={loadAnnouncements}
      />

      <AlertDialog open={!!announcementToDelete} onOpenChange={() => setAnnouncementToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja deletar este anúncio? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Deletar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
