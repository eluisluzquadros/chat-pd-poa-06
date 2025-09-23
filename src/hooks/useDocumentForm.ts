
import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useDocumentProcessing } from "./useDocumentProcessing";
import { createDocument, uploadFile, validateUrl, getFileType } from "@/services/documentService";
import { useQueryClient } from "@tanstack/react-query";

export function useDocumentForm() {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [domain, setDomain] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [url, setUrl] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [isDefault, setIsDefault] = useState(false);
  
  const { toast } = useToast();
  const { isUploading, setIsUploading, processDocument } = useDocumentProcessing();
  const queryClient = useQueryClient();

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setDomain("");
    setSelectedFile(null);
    setUrl("");
    setTags([]);
    setIsDefault(false);
    setIsOpen(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.ms-powerpoint', 'text/csv'];
      
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Tipo de arquivo não suportado",
          description: "Por favor, selecione um arquivo PDF, DOC, PPT ou CSV.",
          variant: "destructive",
        });
        return;
      }
      
      setSelectedFile(file);
      
      // If no title set, use filename as default title
      if (!title) {
        const fileName = file.name.split('.').slice(0, -1).join('.');
        setTitle(fileName);
      }
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile || !title || !domain) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha o título, selecione um arquivo e escolha um domínio.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      const { data: { user }} = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // 1. Upload do arquivo
      const filePath = await uploadFile(selectedFile);
      
      // 2. Criação do documento com metadados básicos
      const document = await createDocument({
        title,
        description,
        type: getFileType(selectedFile.type),
        domain,
        size: selectedFile.size,
        file_path: filePath,
        tags,
        is_default: isDefault,
        owner_id: user.id,
      });

      // 3. Fecha o modal e reseta o form imediatamente
      resetForm();
      
      // 4. Inicia o processamento em background
      await processDocument(document.id.toString());

      // 5. Refresh document list in Explorer
      queryClient.invalidateQueries({ queryKey: ['documents'] });

      toast({
        title: "Documento enviado com sucesso",
        description: "O documento está sendo processado e estará disponível em breve.",
      });
    } catch (error: any) {
      console.error("Error uploading document:", error);
      toast({
        title: "Erro ao enviar documento",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleUrlUpload = async () => {
    if (!title || !url || !domain) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha o título, a URL e o domínio.",
        variant: "destructive",
      });
      return;
    }

    if (!validateUrl(url)) {
      toast({
        title: "URL inválida",
        description: "Por favor, insira uma URL válida.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      const { data: { user }} = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // 1. Criação do documento com metadados básicos
      const document = await createDocument({
        title,
        description,
        type: 'URL',
        domain,
        size: 0,
        url,
        tags,
        is_default: isDefault,
        owner_id: user.id,
      });

      // 2. Fecha o modal e reseta o form imediatamente
      resetForm();
      
      // 3. Inicia o processamento em background
      await processDocument(document.id.toString());

      // 4. Refresh document list in Explorer
      queryClient.invalidateQueries({ queryKey: ['documents'] });

      toast({
        title: "URL enviada com sucesso",
        description: "O conteúdo está sendo processado e estará disponível em breve.",
      });
    } catch (error: any) {
      console.error("Error uploading URL:", error);
      toast({
        title: "Erro ao enviar URL",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return {
    isOpen,
    setIsOpen,
    title,
    setTitle,
    description,
    setDescription,
    domain,
    setDomain,
    selectedFile,
    setSelectedFile,
    url,
    setUrl,
    tags,
    setTags,
    isDefault,
    setIsDefault,
    isUploading,
    handleFileSelect,
    handleFileUpload,
    handleUrlUpload,
  };
}
