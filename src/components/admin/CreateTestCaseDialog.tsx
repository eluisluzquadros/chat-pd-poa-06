import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CreateTestCaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTestCaseCreated: () => void;
}

export function CreateTestCaseDialog({ open, onOpenChange, onTestCaseCreated }: CreateTestCaseDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [newTag, setNewTag] = useState("");
  
  const [formData, setFormData] = useState({
    question: "",
    expected_answer: "",
    category: "",
    difficulty: "medium",
    tags: [] as string[],
    is_active: true,
    is_sql_related: false,
    expected_sql: "",
    sql_complexity: "",
    expected_keywords: [] as string[],
    min_response_length: null as number | null,
  });

  const handleAddTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({ ...prev, tags: [...prev.tags, newTag.trim()] }));
      setNewTag("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleSubmit = async () => {
    if (!formData.question || !formData.expected_answer || !formData.category) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha pergunta, resposta esperada e categoria.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('qa-create-test-case', {
        body: formData
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Erro ao criar caso de teste');
      }

      toast({
        title: "Sucesso!",
        description: "Caso de teste criado com sucesso.",
      });

      onTestCaseCreated();
      onOpenChange(false);
      
      // Reset form
      setFormData({
        question: "",
        expected_answer: "",
        category: "",
        difficulty: "medium",
        tags: [],
        is_active: true,
        is_sql_related: false,
        expected_sql: "",
        sql_complexity: "",
        expected_keywords: [],
        min_response_length: null,
      });
    } catch (error: any) {
      console.error('Error creating test case:', error);
      toast({
        title: "Erro ao criar",
        description: error.message || "Não foi possível criar o caso de teste.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Criar Novo Caso de Teste</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="question">Pergunta *</Label>
            <Textarea
              id="question"
              value={formData.question}
              onChange={(e) => setFormData(prev => ({ ...prev, question: e.target.value }))}
              placeholder="Digite a pergunta do teste..."
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="expected_answer">Resposta Esperada *</Label>
            <Textarea
              id="expected_answer"
              value={formData.expected_answer}
              onChange={(e) => setFormData(prev => ({ ...prev, expected_answer: e.target.value }))}
              placeholder="Digite a resposta esperada..."
              rows={4}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="category">Categoria *</Label>
              <Input
                id="category"
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                placeholder="Ex: Legal, Urbanismo, ZOT"
              />
            </div>

            <div>
              <Label htmlFor="difficulty">Dificuldade</Label>
              <Select
                value={formData.difficulty}
                onValueChange={(value) => setFormData(prev => ({ ...prev, difficulty: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Fácil</SelectItem>
                  <SelectItem value="medium">Médio</SelectItem>
                  <SelectItem value="hard">Difícil</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Switch
                id="is_sql_related"
                checked={formData.is_sql_related}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_sql_related: checked }))}
              />
              <Label htmlFor="is_sql_related">Relacionado a SQL</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
              />
              <Label htmlFor="is_active">Ativo</Label>
            </div>
          </div>

          {formData.is_sql_related && (
            <>
              <div>
                <Label htmlFor="expected_sql">SQL Esperado</Label>
                <Textarea
                  id="expected_sql"
                  value={formData.expected_sql}
                  onChange={(e) => setFormData(prev => ({ ...prev, expected_sql: e.target.value }))}
                  placeholder="SELECT * FROM..."
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="sql_complexity">Complexidade SQL</Label>
                <Select
                  value={formData.sql_complexity}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, sql_complexity: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="simple">Simples</SelectItem>
                    <SelectItem value="moderate">Moderada</SelectItem>
                    <SelectItem value="complex">Complexa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          <div>
            <Label>Tags</Label>
            <div className="flex gap-2 mb-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                placeholder="Adicionar tag..."
              />
              <Button type="button" onClick={handleAddTag} variant="outline" size="sm">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.tags.map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Criando...
              </>
            ) : (
              'Criar Caso de Teste'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
