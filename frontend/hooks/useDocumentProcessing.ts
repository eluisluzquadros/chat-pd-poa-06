
import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

export function useDocumentProcessing() {
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const processDocument = async (documentId: string) => {
    try {
      console.log("Processing document:", documentId);
      
      // Inicia o processamento em background
      const { error } = await supabase.functions.invoke('process-document', {
        body: { documentId },
      });

      if (error) {
        console.error('Background processing error:', error);
        throw error;
      }

      // Checar o status do processamento após um curto período
      setTimeout(async () => {
        try {
          const { data, error } = await supabase.functions.invoke('check-processing-status', {
            body: { documentId },
          });
          
          if (error) {
            console.error('Error checking processing status:', error);
          } else {
            console.log('Processing status:', data);
          }
        } catch (err) {
          console.error('Error checking document status:', err);
        }
      }, 5000);

      return true;
    } catch (error) {
      console.error('Error initiating document processing:', error);
      toast({
        title: "Erro ao processar documento",
        description: "O documento foi salvo mas houve um erro ao processá-lo. Tente novamente mais tarde.",
        variant: "destructive",
      });
      return false;
    }
  };

  return {
    isUploading,
    setIsUploading,
    processDocument,
  };
}
