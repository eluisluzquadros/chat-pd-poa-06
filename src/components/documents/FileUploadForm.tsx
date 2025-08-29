
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { TagInput } from "./TagInput";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Document } from "@/types/documents";

interface FileUploadFormProps {
  title: string;
  setTitle: (title: string) => void;
  description: string;
  setDescription: (description: string) => void;
  domain: string;
  setDomain: (domain: string) => void;
  tags: string[];
  setTags: (tags: string[]) => void;
  isDefault: boolean;
  setIsDefault: (isDefault: boolean) => void;
  selectedFile: File | null;
  setSelectedFile: (file: File | null) => void;
  isUploading: boolean;
  onSubmit: () => void;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function FileUploadForm({
  title,
  setTitle,
  description,
  setDescription,
  domain,
  setDomain,
  tags,
  setTags,
  isDefault,
  setIsDefault,
  selectedFile,
  isUploading,
  onSubmit,
  onFileSelect,
}: FileUploadFormProps) {
  const domains = ["Clima", "Espacial", "Terra", "Urbano", "Desastre"];

  return (
    <div className="grid gap-4 py-4">
      <div className="grid gap-2">
        <Label htmlFor="title-file">Título</Label>
        <Input
          id="title-file"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Digite o título do documento"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="description-file">Descrição</Label>
        <Textarea
          id="description-file"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Digite uma descrição para o documento"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="domain-file">Domínio</Label>
        <Select value={domain} onValueChange={setDomain}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione um domínio" />
          </SelectTrigger>
          <SelectContent>
            {domains.map((d) => (
              <SelectItem key={d} value={d}>
                {d}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="file">Arquivo</Label>
        <Input
          id="file"
          type="file"
          accept=".pdf,.doc,.ppt,.csv"
          onChange={onFileSelect}
        />
        {selectedFile && (
          <p className="text-sm text-muted-foreground">
            Arquivo selecionado: {selectedFile.name}
          </p>
        )}
      </div>
      <TagInput tags={tags} setTags={setTags} />
      <div className="flex items-center space-x-2">
        <Checkbox
          id="is-default-file"
          checked={isDefault}
          onCheckedChange={(checked) => setIsDefault(checked as boolean)}
        />
        <Label htmlFor="is-default-file">
          Usar como base de conhecimento padrão
        </Label>
      </div>
      <Button onClick={onSubmit} disabled={isUploading}>
        {isUploading ? "Enviando..." : "Enviar Arquivo"}
      </Button>
    </div>
  );
}
