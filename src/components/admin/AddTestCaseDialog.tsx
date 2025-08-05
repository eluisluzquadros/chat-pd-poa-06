import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { X, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AddTestCaseDialogProps {
  onTestCaseAdded: () => void;
}

export function AddTestCaseDialog({ onTestCaseAdded }: AddTestCaseDialogProps) {
  const { toast } = useToast();
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
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      // Gerar test_id baseado na categoria e timestamp
      const testId = `${formData.category}_${Date.now()}`;
      
      // Converter expected_answer em keywords se necessário
      const expectedKeywords = formData.expected_answer
        .toLowerCase()
        .split(/\s+/)
        .filter(word => word.length > 3)
        .slice(0, 10); // Pegar até 10 palavras-chave
      
      const { data, error } = await supabase
        .from('qa_test_cases')
        .insert({
          test_id: testId,
          query: formData.question.trim(),
          expected_keywords: expectedKeywords,
          expected_response: formData.expected_answer.trim(),
          category: formData.category,
          complexity: formData.difficulty,
          min_response_length: 50,
          is_active: formData.is_active
        })
        .select();

      if (error) {
        console.error('Supabase error:', error);
        
        // Handle specific permission errors
        if (error.code === '42501' || error.message.includes('permission denied') || error.message.includes('row-level security')) {
          throw new Error('Você não tem permissão para criar casos de teste. Entre em contato com um administrador.');
        }
        
        throw error;
      }

      console.log('Test case created successfully:', data);

      toast({
        title: "Sucesso",
        description: "Caso de teste adicionado com sucesso!"
      });
      
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
      const errorMessage = error instanceof Error ? error.message : "Erro ao adicionar caso de teste";
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive"
      });
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
              {loading ? "Salvando..." : "Salvar Caso de Teste"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}