
import { Eye, Download, Star, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Document } from "@/types/documents";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface DocumentCardProps {
  document: Document;
  onDelete?: () => void;
}

export function DocumentCard({ document, onDelete }: DocumentCardProps) {
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleView = () => {
    console.log('Navigating to document view:', document.id);
    navigate(`/documents/${document.id}`);
  };

  const handleDownload = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      console.log('Downloading document:', document.file_path);
      toast({
        title: "Iniciando download...",
        description: "Preparando o arquivo para download",
      });
      
      const { data, error } = await supabase.storage
        .from('documents')
        .download(document.file_path);

      if (error) {
        console.error('Download error:', error);
        throw error;
      }

      // Create a download link and click it
      const url = URL.createObjectURL(data);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = document.title;
      window.document.body.appendChild(a);
      a.click();
      window.document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Download concluído",
        description: `O arquivo ${document.title} foi baixado com sucesso.`,
      });
    } catch (error: any) {
      console.error('Download failed:', error);
      toast({
        title: "Erro ao baixar documento",
        description: error.message || "Não foi possível baixar o arquivo.",
        variant: "destructive",
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const formatCreatedAt = (dateString: string) => {
    try {
      const date = new Date(dateString);
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return 'Data inválida';
      }
      return formatDistanceToNow(date, {
        addSuffix: true,
        locale: ptBR,
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Data inválida';
    }
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(`/documents/${document.id}/edit`);
  };

  const handleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toast({
      title: "Funcionalidade em desenvolvimento",
      description: "A funcionalidade de favoritar documentos será implementada em breve.",
    });
  };

  return (
    <Card className="p-4 bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-shadow border border-gray-200 dark:border-gray-700 h-full flex flex-col">
      <div className="flex flex-col h-full justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
              {document.title}
            </h3>
            <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 whitespace-nowrap">
              {document.type}
            </span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-3 line-clamp-2">
            {document.description}
          </p>
          <div className="flex flex-wrap gap-2">
            {(document.tags || []).map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary whitespace-nowrap dark:bg-primary/20"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
        <div className="flex flex-col items-start gap-2 w-full mt-auto">
          <div className="text-sm text-gray-500 dark:text-gray-400 flex flex-wrap gap-2">
            <span className="whitespace-nowrap">{formatFileSize(document.size)}</span>
            <span className="hidden sm:inline mx-2">•</span>
            <span className="whitespace-nowrap">
              {formatCreatedAt(document.created_at)}
            </span>
          </div>
          <div className="flex flex-wrap gap-2 w-full mt-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 bg-transparent dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600"
              onClick={handleView}
            >
              <Eye className="h-4 w-4 mr-1" />
              Visualizar
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1 bg-transparent dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600"
              onClick={handleDownload}
            >
              <Download className="h-4 w-4 mr-1" />
              Download
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 dark:text-gray-300 dark:hover:bg-gray-700"
              onClick={handleEdit}
            >
              <Edit className="h-4 w-4 mr-1" />
              Editar
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 dark:text-gray-300 dark:hover:bg-gray-700"
              onClick={handleFavorite}
            >
              <Star className="h-4 w-4 mr-1" />
              Favoritar
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
