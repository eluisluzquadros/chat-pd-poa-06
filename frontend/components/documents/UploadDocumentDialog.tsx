
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Upload } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileUploadForm } from "./FileUploadForm";
import { URLUploadForm } from "./URLUploadForm";
import { useDocumentForm } from "@/hooks/useDocumentForm";

export function UploadDocumentDialog() {
  const {
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
  } = useDocumentForm();

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          size="lg"
          className="bg-primary hover:bg-primary/90 text-white px-8 py-6 text-lg rounded-full transition-all duration-300 shadow-md hover:shadow-xl flex items-center gap-2 mx-auto"
        >
          <Upload className="w-5 h-5" />
          Fazer Upload de Documento
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Upload de Documento</DialogTitle>
          <DialogDescription>
            Faça o upload de um novo documento ou adicione uma URL para a base de conhecimento.
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="file">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="file">Arquivo</TabsTrigger>
            <TabsTrigger value="url">URL</TabsTrigger>
          </TabsList>
          <TabsContent value="file">
            <FileUploadForm
              title={title}
              setTitle={setTitle}
              description={description}
              setDescription={setDescription}
              domain={domain}
              setDomain={setDomain}
              tags={tags}
              setTags={setTags}
              isDefault={isDefault}
              setIsDefault={setIsDefault}
              selectedFile={selectedFile}
              setSelectedFile={setSelectedFile}
              isUploading={isUploading}
              onSubmit={handleFileUpload}
              onFileSelect={handleFileSelect}
            />
          </TabsContent>
          <TabsContent value="url">
            <URLUploadForm
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
              isDefault={isDefault}
              setIsDefault={setIsDefault}
              isUploading={isUploading}
              onSubmit={handleUrlUpload}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
