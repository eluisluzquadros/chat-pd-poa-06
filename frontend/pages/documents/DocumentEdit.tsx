
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Document } from "@/types/documents";
import { Card } from "@/components/ui/card";
import { useState } from "react";
import { DeleteDocumentDialog } from "./components/DeleteDocumentDialog";
import { DocumentForm } from "./components/DocumentForm";
import { useDocumentEdit } from "./hooks/useDocumentEdit";
import { AuthGuard } from "@/components/layout/AuthGuard";
import { Loader2 } from "lucide-react";

export default function DocumentEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [domain, setDomain] = useState("");
  const [url, setUrl] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  
  const {
    showDeleteDialog,
    setShowDeleteDialog,
    updateMutation,
    deleteMutation
  } = useDocumentEdit(id!);
  
  const {
    data: document,
    isLoading,
    error
  } = useQuery({
    queryKey: ['document', id],
    queryFn: async () => {
      console.log("Fetching document details for:", id);
      
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('id', parseInt(id!) as any)
        .single();
        
      if (error) {
        console.error("Error fetching document:", error);
        throw error;
      }
      
      // Set form values - using temporary defaults since table structure is different
      setTitle(`Document ${data.id}`);
      setDescription(data.content?.substring(0, 100) || "");
      setDomain("documents");
      setUrl("");
      setTags([]);
      
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
    retry: 1
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title || !domain) {
      toast.error("Por favor, preencha todos os campos obrigatórios.");
      return;
    }
    
    const updatedDoc = {
      title,
      description,
      domain,
      tags,
      ...(document?.type === 'URL' && {
        url
      })
    };
    
    console.log("Submitting document update:", updatedDoc);
    updateMutation.mutate(updatedDoc);
  };

  const handleDelete = () => {
    if (document) {
      deleteMutation.mutate(document);
    }
  };

  if (isLoading) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-background">
          <Header />
          <main className="container mx-auto px-4 py-8 pt-24">
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2">Carregando documento...</span>
            </div>
            </main>
          </div>
      </AuthGuard>
    );
  }

  if (error || !document) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-background">
          <Header />
          <main className="container mx-auto px-4 py-8 pt-24">
            <div className="max-w-4xl mx-auto">
              <div className="text-center p-6 bg-red-50 dark:bg-red-950/20 rounded-lg">
                <h2 className="text-xl font-semibold mb-2">Documento não encontrado</h2>
                <p className="mb-4">O documento solicitado não está disponível ou você não tem permissão para acessá-lo.</p>
                <Button onClick={() => navigate('/explorer')}>
                  Voltar para explorador
                </Button>
              </div>
            </div>
            </main>
          </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8 pt-24">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <Button variant="ghost" onClick={() => navigate(`/documents/${id}`)}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar
              </Button>
              <Button variant="destructive" onClick={() => setShowDeleteDialog(true)} className="gap-2">
                <Trash2 className="h-4 w-4" />
                Excluir documento
              </Button>
            </div>

            <Card className="p-6">
              <h1 className="text-2xl font-bold mb-6">Editar Documento</h1>
              
              <DocumentForm 
                title={title} 
                setTitle={setTitle} 
                description={description} 
                setDescription={setDescription} 
                domain={domain} 
                setDomain={setDomain} 
                url={url} 
                setUrl={setUrl} 
                tags={tags} 
                setTags={setTags} 
                document={document} 
                onSubmit={handleSubmit} 
                onCancel={() => navigate(`/documents/${id}`)} 
              />
            </Card>
          </div>
        </main>

        <DeleteDocumentDialog
          document={document} 
          open={showDeleteDialog} 
          onOpenChange={setShowDeleteDialog} 
          onConfirm={handleDelete} 
          isDeleting={deleteMutation.isPending} 
        />
      </div>
    </AuthGuard>
  );
}
