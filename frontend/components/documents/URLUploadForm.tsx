
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TagInput } from "./TagInput";

interface URLUploadFormProps {
  title: string;
  setTitle: (title: string) => void;
  description: string;
  setDescription: (description: string) => void;
  domain: string;
  setDomain: (domain: string) => void;
  url: string;
  setUrl: (url: string) => void;
  tags: string[];
  setTags: (tags: string[]) => void;
  isDefault: boolean;
  setIsDefault: (isDefault: boolean) => void;
  isUploading: boolean;
  onSubmit: () => void;
}

export function URLUploadForm({
  title,
  setTitle,
  description,
  setDescription,
  domain,
  setDomain,
  url,
  setUrl,
  tags,
  setTags,
  isDefault,
  setIsDefault,
  isUploading,
  onSubmit,
}: URLUploadFormProps) {
  const domains = ["Clima", "Espacial", "Terra", "Urbano", "Desastre"];

  return (
    <div className="grid gap-4 py-4">
      <div className="grid gap-2">
        <Label htmlFor="title-url">Título</Label>
        <Input
          id="title-url"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Digite o título do documento"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="description-url">Descrição</Label>
        <Textarea
          id="description-url"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Digite uma descrição para o documento"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="domain-url">Domínio</Label>
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
        <Label htmlFor="url">URL</Label>
        <Input
          id="url"
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://exemplo.com"
        />
      </div>
      <TagInput tags={tags} setTags={setTags} />
      <div className="flex items-center space-x-2">
        <Checkbox
          id="is-default-url"
          checked={isDefault}
          onCheckedChange={(checked) => setIsDefault(checked as boolean)}
        />
        <Label htmlFor="is-default-url">
          Usar como base de conhecimento padrão
        </Label>
      </div>
      <Button onClick={onSubmit} disabled={isUploading}>
        {isUploading ? "Enviando..." : "Enviar URL"}
      </Button>
    </div>
  );
}
