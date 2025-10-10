import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useKnowledgeBaseTest } from '@/hooks/useKnowledgeBaseTest';
import { ExternalKnowledgeBase } from '@/services/knowledgeBaseService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { KnowledgeBaseForm } from '@/components/admin/KnowledgeBaseForm';
import { KnowledgeBaseList } from '@/components/admin/KnowledgeBaseList';
import { useQuery } from '@tanstack/react-query';
import { knowledgeBaseService } from '@/services/knowledgeBaseService';
import { toast } from 'sonner';

export default function KnowledgeManagement() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedKBId, setSelectedKBId] = useState<string | null>(null);
  const { testKnowledgeBase } = useKnowledgeBaseTest();

  const { data: knowledgeBases, isLoading, refetch } = useQuery({
    queryKey: ['knowledge-bases'],
    queryFn: () => knowledgeBaseService.getAllKnowledgeBases(),
  });

  const handleCreate = () => {
    setSelectedKBId(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (id: string) => {
    setSelectedKBId(id);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await knowledgeBaseService.deleteKnowledgeBase(id);
      toast.success('Base de conhecimento excluída');
      refetch();
    } catch (error) {
      console.error('Error deleting KB:', error);
      toast.error('Erro ao excluir base de conhecimento');
    }
  };

  const handleToggleStatus = async (id: string, isActive: boolean) => {
    try {
      await knowledgeBaseService.toggleKnowledgeBaseStatus(id, isActive);
      toast.success(isActive ? 'Base ativada' : 'Base desativada');
      refetch();
    } catch (error) {
      console.error('Error toggling KB status:', error);
      toast.error('Erro ao alterar status');
    }
  };

  const handleFormSuccess = () => {
    setIsDialogOpen(false);
    refetch();
  };

  const handleTest = async (kb: ExternalKnowledgeBase) => {
    const apiKey = prompt('Cole sua LlamaCloud API Key para teste:');
    if (!apiKey) return;

    await testKnowledgeBase({
      provider: kb.provider,
      index_id: kb.config?.index_id || '',
      api_key: apiKey,
      top_k: kb.retrieval_settings?.top_k || 5,
      score_threshold: kb.retrieval_settings?.score_threshold || 0.3,
    });
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-2xl">Bases de Conhecimento Externas</CardTitle>
            <CardDescription>
              Configure bases externas (LlamaCloud, Pinecone, etc.) para uso pelos agentes
            </CardDescription>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Base
          </Button>
        </CardHeader>
        <CardContent>
          <KnowledgeBaseList
            knowledgeBases={knowledgeBases || []}
            isLoading={isLoading}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onToggleStatus={handleToggleStatus}
            onTest={handleTest}
          />
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedKBId ? 'Editar Base de Conhecimento' : 'Nova Base de Conhecimento'}
            </DialogTitle>
          </DialogHeader>
          <KnowledgeBaseForm
            knowledgeBaseId={selectedKBId}
            onSuccess={handleFormSuccess}
            onCancel={() => setIsDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
