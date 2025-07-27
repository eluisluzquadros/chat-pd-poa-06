
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TagInput } from "@/components/documents/TagInput";
import type { Document } from "@/types/documents";

interface DocumentFormProps {
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
  document: Document;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}

const domains = ["Clima", "Espacial", "Terra", "Urbano", "Desastre"];

export function DocumentForm({
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
  document,
  onSubmit,
  onCancel,
}: DocumentFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="title">Título</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Digite o título do documento"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descrição</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Digite uma descrição para o documento"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="domain">Domínio</Label>
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

      {document.type === 'URL' && (
        <div className="space-y-2">
          <Label htmlFor="url">URL</Label>
          <Input
            id="url"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://exemplo.com"
          />
        </div>
      )}

      <div className="space-y-2">
        <Label>Tags</Label>
        <TagInput tags={tags} setTags={setTags} />
      </div>

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
        >
          Cancelar
        </Button>
        <Button type="submit">
          Salvar Alterações
        </Button>
      </div>
    </form>
  );
}
