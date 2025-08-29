
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface DocumentSelectorProps {
  selectedDocumentIds: string[];
  onDocumentSelect: (ids: string[]) => void;
  isCustomMode: boolean;
}

export function DocumentSelector({ 
  selectedDocumentIds, 
  onDocumentSelect,
  isCustomMode 
}: DocumentSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const { data: documents } = useQuery({
    queryKey: ['documents'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('documents')
        .select('id, content')
        .order('id');
      
      if (error) throw error;
      return data?.map(doc => ({
        id: doc.id,
        title: `Document ${doc.id}` // Generate a simple title since documents table doesn't have title
      })) || [];
    },
    enabled: isCustomMode,
  });

  const { data: collections } = useQuery({
    queryKey: ['collections'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('document_metadata')
        .select('id, title')
        .order('title');
      
      if (error) throw error;
      return data || [];
    },
    enabled: isCustomMode,
  });

  if (!isCustomMode) return null;

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="w-[200px] justify-between bg-white">
          Selecionar Documentos
          <ChevronDown className="ml-2 h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        className="w-[200px] bg-white border border-gray-200 shadow-lg"
        align="end"
      >
        <DropdownMenuLabel className="font-semibold">Documentos</DropdownMenuLabel>
        {documents?.map((doc) => (
          <DropdownMenuCheckboxItem
            key={doc.id}
            checked={selectedDocumentIds.includes(doc.id.toString())}
            onCheckedChange={(checked) => {
              const docIdString = doc.id.toString();
              const newSelection = checked
                ? [...selectedDocumentIds, docIdString]
                : selectedDocumentIds.filter(id => id !== docIdString);
              onDocumentSelect(newSelection);
            }}
          >
            {doc.title}
          </DropdownMenuCheckboxItem>
        ))}
        
        <DropdownMenuSeparator />
        
        <DropdownMenuLabel className="font-semibold">Coleções</DropdownMenuLabel>
        {collections?.map((collection) => (
          <DropdownMenuCheckboxItem
            key={collection.id}
            checked={selectedDocumentIds.includes(collection.id)}
            onCheckedChange={(checked) => {
              const newSelection = checked
                ? [...selectedDocumentIds, collection.id]
                : selectedDocumentIds.filter(id => id !== collection.id);
              onDocumentSelect(newSelection);
            }}
          >
            {collection.title}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
