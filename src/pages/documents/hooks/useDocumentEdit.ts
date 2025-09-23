
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";
import type { Document } from "@/types/documents";
import { toast } from "sonner";

export function useDocumentEdit(id: string) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const updateMutation = useMutation({
    mutationFn: async (updatedDoc: Partial<Document>) => {
      console.log("Updating document:", id, updatedDoc);
      
      const updateData = { ...updatedDoc };
      delete updateData.id; // Remove id from update data since it's in the where clause
      
      // Update only content field since that's what exists in the table
      const { data, error } = await supabase
        .from('documents')
        .update({ content: updateData.content || updateData.title || "" })
        .eq('id', parseInt(id) as any)
        .select()
        .single();

      if (error) {
        console.error("Error updating document:", error);
        throw error;
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document', id] });
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast.success("Documento atualizado com sucesso");
      navigate(`/documents/${id}`);
    },
    onError: (error: any) => {
      console.error("Error in update mutation:", error);
      toast.error(`Erro ao atualizar documento: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (document: Document) => {
      console.log("Deleting document:", document);
      
      if (!document.file_path && document.type !== 'URL') return;

      // Only delete from storage if it's a file (not a URL)
      if (document.type !== 'URL' && document.file_path) {
        console.log("Deleting file from storage:", document.file_path);
        const { error: storageError } = await supabase.storage
          .from('documents')
          .remove([document.file_path]);

        if (storageError) {
          console.error("Error deleting file from storage:", storageError);
          throw storageError;
        }
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('documents')
        .delete()
        .eq('id', parseInt(id) as any);

      if (dbError) {
        console.error("Error deleting document from database:", dbError);
        throw dbError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast.success("Documento excluído com sucesso");
      navigate('/explorer');
    },
    onError: (error: any) => {
      console.error("Error in delete mutation:", error);
      toast.error(`Erro ao excluir documento: ${error.message}`);
    },
  });

  return {
    showDeleteDialog,
    setShowDeleteDialog,
    updateMutation,
    deleteMutation,
  };
}
