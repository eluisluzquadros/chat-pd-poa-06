import { ExternalKnowledgeBase } from '@/services/knowledgeBaseService';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, Power, PowerOff, TestTube } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface KnowledgeBaseListProps {
  knowledgeBases: ExternalKnowledgeBase[];
  isLoading: boolean;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onToggleStatus: (id: string, isActive: boolean) => void;
  onTest?: (kb: ExternalKnowledgeBase) => void;
}

export function KnowledgeBaseList({
  knowledgeBases,
  isLoading,
  onEdit,
  onDelete,
  onToggleStatus,
  onTest,
}: KnowledgeBaseListProps) {
  if (isLoading) {
    return <div className="text-center py-8">Carregando...</div>;
  }

  if (knowledgeBases.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-lg font-medium mb-2">Nenhuma base configurada</p>
        <p className="text-sm">Clique em "Nova Base" para começar</p>
      </div>
    );
  }

  const getProviderLabel = (provider: string) => {
    const labels: Record<string, string> = {
      llamacloud: 'LlamaCloud',
      pinecone: 'Pinecone',
      weaviate: 'Weaviate',
      custom: 'Custom',
    };
    return labels[provider] || provider;
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nome</TableHead>
          <TableHead>Provider</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Configurações</TableHead>
          <TableHead className="text-right">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {knowledgeBases.map((kb) => (
          <TableRow key={kb.id}>
            <TableCell>
              <div>
                <div className="font-medium">{kb.display_name}</div>
                {kb.description && (
                  <div className="text-sm text-muted-foreground">{kb.description}</div>
                )}
              </div>
            </TableCell>
            <TableCell>
              <Badge variant="outline">{getProviderLabel(kb.provider)}</Badge>
            </TableCell>
            <TableCell>
              <Badge variant={kb.is_active ? 'default' : 'secondary'}>
                {kb.is_active ? 'Ativa' : 'Inativa'}
              </Badge>
            </TableCell>
            <TableCell>
              <div className="text-sm space-y-1">
                <div>Top K: {kb.retrieval_settings.top_k}</div>
                <div>Threshold: {kb.retrieval_settings.score_threshold}</div>
              </div>
            </TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-2">
                {onTest && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onTest(kb)}
                    title="Testar Conexão"
                  >
                    <TestTube className="h-4 w-4 text-blue-500" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onToggleStatus(kb.id, !kb.is_active)}
                  title={kb.is_active ? 'Desativar' : 'Ativar'}
                >
                  {kb.is_active ? (
                    <PowerOff className="h-4 w-4" />
                  ) : (
                    <Power className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onEdit(kb.id)}
                  title="Editar"
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    if (confirm('Tem certeza que deseja excluir esta base?')) {
                      onDelete(kb.id);
                    }
                  }}
                  title="Excluir"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
