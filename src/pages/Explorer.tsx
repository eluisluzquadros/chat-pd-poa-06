
import { useState } from "react";
import { Header } from "@/components/Header";

import { supabase } from "@/integrations/supabase/client";
import type { Document } from "@/types/documents";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { SearchBar } from "@/components/explorer/SearchBar";
import { FilterSidebar } from "@/components/explorer/FilterSidebar";
import { DocumentList } from "@/components/explorer/DocumentList";
import { ViewControls } from "@/components/explorer/ViewControls";
import { UploadDocumentDialog } from "@/components/documents/UploadDocumentDialog";
import { AuthGuard } from "@/components/layout/AuthGuard";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function Explorer() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFileType, setSelectedFileType] = useState<string | undefined>();
  const [selectedDomain, setSelectedDomain] = useState<string[]>([]);
  const [isFilterVisible, setIsFilterVisible] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");

  const {
    data: documents,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['documents'],
    queryFn: async () => {
      console.log('Fetching documents...');
      try {
    const { data, error } = await supabase
      .from('documents')
          .select('*')
          .order('created_at', { ascending: false });
          
        if (error) {
          console.error('Error fetching documents:', error);
          throw error;
        }
        
        console.log('Documents fetched:', data?.length || 0);
        
        if (!data || data.length === 0) {
          return [];
        }
        
        return data.map(doc => ({
          id: doc.id.toString(),
          title: `Document ${doc.id}`,
          description: doc.content?.substring(0, 100) || '',
          type: 'PDF' as const,
          tags: [],
          size: 0,
          file_path: '',
          domain: 'documents',
          owner_id: doc.user_id || '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          url: '',
          content: doc.content || ''
        })) as Document[];
      } catch (error) {
        console.error('Error fetching documents:', error);
        toast.error("Não foi possível carregar os documentos. Tente novamente.");
        throw error;
      }
    },
    retry: 2,
    refetchOnWindowFocus: false
  });

  const handleRetry = () => {
    refetch();
  };

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedFileType(undefined);
    setSelectedDomain([]);
  };

  const filteredDocuments = documents?.filter(doc => {
    const matchesSearch = searchQuery === "" || 
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (doc.description && doc.description.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesType = !selectedFileType || doc.type === selectedFileType;
    
    const matchesDomain = selectedDomain.length === 0 || 
      (doc.domain && selectedDomain.includes(doc.domain)) || 
      (doc.tags && doc.tags.some(tag => selectedDomain.includes(tag)));
    
    return matchesSearch && matchesType && matchesDomain;
  });

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background dark:bg-gray-900 text-foreground dark:text-gray-100">
        <Header />
        <main className="container mx-auto px-4 py-20">
          <div className="max-w-4xl mx-auto text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 text-gray-900 dark:text-white">NOVO PDDUA 2025</h1>
            <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">Acesse a Base de Conhecimento do Novo Plano Diretor Urbano Ambiental de Porto Alegre</p>
            <UploadDocumentDialog />
          </div>

          <div className="grid grid-cols-12 gap-6">
            <FilterSidebar 
              isVisible={isFilterVisible} 
              selectedFileType={selectedFileType} 
              setSelectedFileType={setSelectedFileType} 
              selectedDomain={selectedDomain} 
              setSelectedDomain={setSelectedDomain}
              onReset={resetFilters}
            />

            <div className={cn("col-span-12 transition-all duration-300", isFilterVisible ? "lg:col-span-9" : "col-span-12")}>
              <div className="flex flex-wrap gap-4 mb-6">
                <ViewControls 
                  isFilterVisible={isFilterVisible} 
                  setIsFilterVisible={setIsFilterVisible} 
                  viewMode={viewMode} 
                  setViewMode={setViewMode} 
                />
                
                <SearchBar searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
              </div>

              {isLoading ? (
                <div className="text-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
                  <p className="text-gray-600 dark:text-gray-300">Carregando documentos...</p>
                </div>
              ) : error ? (
                <div className="text-center py-12 space-y-4">
                  <p className="text-red-500 mb-4">Erro ao carregar documentos</p>
                  <Button 
                    onClick={handleRetry} 
                    variant="outline"
                    className="mx-auto flex items-center gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Tentar novamente
                  </Button>
                </div>
              ) : filteredDocuments && filteredDocuments.length > 0 ? (
                <DocumentList 
                  documents={filteredDocuments} 
                  viewMode={viewMode} 
                  onDocumentDelete={() => {
                    refetch();
                  }} 
                />
              ) : (
                <div className="text-center py-12 border rounded-lg bg-muted/20">
                  <p className="text-lg mb-4">Nenhum documento encontrado</p>
                  {documents && documents.length > 0 ? (
                    <Button onClick={resetFilters} variant="outline">Limpar filtros</Button>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Comece fazendo upload de documentos para a base de conhecimento
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </main>
        
      </div>
    </AuthGuard>
  );
}
