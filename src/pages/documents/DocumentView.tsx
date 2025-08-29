
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Edit, Download, ArrowLeft } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import type { Document } from "@/types/documents";
import { Card } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function DocumentView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: document, isLoading } = useQuery({
    queryKey: ['document', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('id', parseInt(id!) as any)
        .single();

      if (error) throw error;
      return {
        id: data.id.toString(),
        title: `Document ${data.id}`,
        description: data.content?.substring(0, 100) || "",
        type: "PDF" as const,
        domain: "documents",
        tags: [],
        size: 0,
        file_path: "",
        owner_id: data.user_id || "",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        url: "",
        url_content: "",
        content: data.content || ""
      } as Document;
    },
  });

  const handleDownload = async () => {
    if (!document) return;

    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .download(document.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = document.title;
      window.document.body.appendChild(a);
      a.click();
      window.document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Download iniciado com sucesso",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao baixar documento",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <p className="text-center">Carregando documento...</p>
        </main>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <p className="text-center">Documento não encontrado</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => navigate('/explorer')}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>

          <Card className="p-6 mb-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h1 className="text-2xl font-bold mb-2">{document.title}</h1>
                <p className="text-muted-foreground mb-4">{document.description}</p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => navigate(`/documents/${id}/edit`)}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Editar
                </Button>
                {document.type !== 'URL' && (
                  <Button variant="outline" onClick={handleDownload}>
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </Button>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              <span className="px-2 py-1 bg-primary/10 text-primary rounded-full text-sm">
                {document.type}
              </span>
              <span className="px-2 py-1 bg-primary/10 text-primary rounded-full text-sm">
                {document.domain}
              </span>
              {document.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-1 bg-secondary/10 text-secondary rounded-full text-sm"
                >
                  {tag}
                </span>
              ))}
            </div>

            <div className="text-sm text-muted-foreground mb-6">
              Criado {formatDistanceToNow(new Date(document.created_at), {
                addSuffix: true,
                locale: ptBR,
              })}
            </div>

            {document.type === 'URL' ? (
              <div>
                <p className="mb-2">URL: <a href={document.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{document.url}</a></p>
                <div className="prose max-w-none">
                  {document.url_content}
                </div>
              </div>
            ) : (
              <div className="prose max-w-none">
                {document.content}
              </div>
            )}
          </Card>
        </div>
        </main>
    </div>
  );
}
