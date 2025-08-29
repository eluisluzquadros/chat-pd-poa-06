import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { X, Plus, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AddTestCaseDialogProps {
  onTestCaseAdded: () => void;
}

export function AddTestCaseDialog({ onTestCaseAdded }: AddTestCaseDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    question: "",
    expected_answer: "",
    category: "",
    difficulty: "medium",
    is_active: true
  });
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");

  const categories = [
    "zoneamento",
    "mobilidade",
    "habitacao",
    "meio-ambiente",
    "uso-solo",
    "patrimonio-historico",
    "infraestrutura",
    "participacao-social"
  ];

  const difficulties = [
    { value: "easy", label: "Fácil" },
    { value: "medium", label: "Médio" },
    { value: "hard", label: "Difícil" }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted with data:', formData, 'tags:', tags);
    
    if (!formData.question.trim() || !formData.expected_answer.trim() || !formData.category) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    setLoading(true);

    try {
      // Usar Edge Function para contornar RLS
      console.log('Calling Edge Function qa-add-test-case...');
      
      const { data, error } = await supabase.functions.invoke('qa-add-test-case', {
        body: {
          question: formData.question.trim(),
          expected_answer: formData.expected_answer.trim(),
          category: formData.category,
          difficulty: formData.difficulty, // A Edge Function fará o mapeamento para complexity
          tags: tags.length > 0 ? tags : ['geral'],
          is_active: formData.is_active,
          is_sql_related: false
        }
      });

      if (error) {
        console.error('Edge Function error:', error);
        throw error;
      }
      
      if (!data?.success) {
        throw new Error(data?.error || 'Erro ao adicionar caso de teste');
      }

      console.log('Test case created successfully:', data);

      toast.success("Caso de teste adicionado com sucesso!");
      
      // Reset form
      setFormData({
        question: "",
        expected_answer: "",
        category: "",
        difficulty: "medium",
        is_active: true
      });
      setTags([]);
      setTagInput("");
      setOpen(false);
      onTestCaseAdded();
      
    } catch (error) {
      console.error('Error adding test case:', error);
      const anyErr = error as any;
      const details = anyErr?.message || anyErr?.error || JSON.stringify(anyErr);
      toast.error(`Falha ao adicionar caso de teste: ${details}`);
    } finally {
      setLoading(false);
    }
  };

  const addTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag]);
      setTagInput("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleTagKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Adicionar Caso de Teste
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Adicionar Novo Caso de Teste</DialogTitle>
          <DialogDescription>
            Crie um novo caso de teste para validar a acurácia do agente
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="question">Pergunta *</Label>
            <Textarea
              id="question"
              placeholder="Ex: Quais são as diretrizes para habitação de interesse social no Plano Diretor?"
              value={formData.question}
              onChange={(e) => setFormData(prev => ({ ...prev, question: e.target.value }))}
              rows={3}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="expected_answer">Resposta Esperada *</Label>
            <Textarea
              id="expected_answer"
              placeholder="Ex: O Plano Diretor estabelece diretrizes para promoção de habitação de interesse social através de..."
              value={formData.expected_answer}
              onChange={(e) => setFormData(prev => ({ ...prev, expected_answer: e.target.value }))}
              rows={4}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Categoria *</Label>
              <Select 
                value={formData.category} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(category => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="difficulty">Dificuldade</Label>
              <Select 
                value={formData.difficulty} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, difficulty: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {difficulties.map(diff => (
                    <SelectItem key={diff.value} value={diff.value}>
                      {diff.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">Tags</Label>
            <div className="flex gap-2">
              <Input
                id="tags"
                placeholder="Ex: legislacao, diretrizes, normas"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={handleTagKeyPress}
              />
              <Button type="button" onClick={addTag} variant="outline">
                Adicionar
              </Button>
            </div>
            
            {tags.length > 0 && (
              <div className="flex gap-2 flex-wrap mt-2">
                {tags.map(tag => (
                  <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                    {tag}
                    <X 
                      className="h-3 w-3 cursor-pointer" 
                      onClick={() => removeTag(tag)}
                    />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
            />
            <Label htmlFor="is_active">Caso ativo (será incluído nas validações)</Label>
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? "Salvando..." : "Salvar Caso de Teste"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}