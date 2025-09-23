import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { X, Save, History, Trash2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface QATestCase {
  id: string;
  question: string;
  expected_answer: string;
  expected_sql?: string;
  category: string;
  difficulty: string;
  tags: string[];
  is_active: boolean;
  is_sql_related: boolean;
  sql_complexity?: string;
  version: number;
}

interface EditTestCaseDialogProps {
  testCase: QATestCase | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTestCaseUpdated: () => void;
}

export function EditTestCaseDialog({ testCase, open, onOpenChange, onTestCaseUpdated }: EditTestCaseDialogProps) {
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [formData, setFormData] = useState({
    question: "",
    expected_answer: "",
    expected_sql: "",
    category: "",
    difficulty: "medium",
    is_active: true,
    is_sql_related: false,
    sql_complexity: ""
  });
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");

  const categories = [
    "zoneamento", "mobilidade", "habitacao", "meio-ambiente",
    "uso-solo", "patrimonio-historico", "infraestrutura", "participacao-social"
  ];

  const difficulties = [
    { value: "easy", label: "Fácil" },
    { value: "medium", label: "Médio" },
    { value: "hard", label: "Difícil" }
  ];

  const sqlComplexities = [
    { value: "low", label: "Baixa" },
    { value: "medium", label: "Média" },
    { value: "high", label: "Alta" }
  ];

  useEffect(() => {
    if (testCase) {
      setFormData({
        question: testCase.question,
        expected_answer: testCase.expected_answer,
        expected_sql: testCase.expected_sql || "",
        category: testCase.category,
        difficulty: testCase.difficulty,
        is_active: testCase.is_active,
        is_sql_related: testCase.is_sql_related,
        sql_complexity: testCase.sql_complexity || ""
      });
      setTags(testCase.tags || []);
    }
  }, [testCase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!testCase || !formData.question.trim() || !formData.expected_answer.trim() || !formData.category) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    setLoading(true);

    try {
      // Usar Edge Function para contornar RLS
      console.log('Calling Edge Function qa-update-test-case...');
      
      const { data, error } = await supabase.functions.invoke('qa-update-test-case', {
        body: {
          id: testCase.id,
          question: formData.question.trim(),
          expected_answer: formData.expected_answer.trim(),
          category: formData.category,
          difficulty: formData.difficulty,
          tags: tags.length > 0 ? tags : ['geral'],
          is_active: formData.is_active,
          is_sql_related: formData.is_sql_related,
          expected_sql: formData.is_sql_related ? formData.expected_sql.trim() : null,
          sql_complexity: formData.is_sql_related ? formData.sql_complexity : null
        }
      });

      if (error) {
        console.error('Edge Function error:', error);
        throw error;
      }
      
      if (!data?.success) {
        throw new Error(data?.error || 'Erro ao atualizar caso de teste');
      }
      
      console.log('Test case updated successfully:', data);

      toast.success("Caso de teste atualizado com sucesso!");
      onOpenChange(false);
      onTestCaseUpdated();
      
    } catch (error) {
      console.error('Error updating test case:', error);
      const anyErr = error as any;
      const details = anyErr?.message || anyErr?.error || JSON.stringify(anyErr);
      toast.error(`Falha ao atualizar caso de teste: ${details}`);
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

  const handleDelete = async () => {
    if (!testCase) return;
    
    setLoading(true);
    try {
      // Usar Edge Function para contornar RLS
      console.log('Calling Edge Function qa-delete-test-case...');
      
      const { data, error } = await supabase.functions.invoke('qa-delete-test-case', {
        body: {
          id: testCase.id
        }
      });

      if (error) {
        console.error('Edge Function error:', error);
        throw error;
      }
      
      if (!data?.success) {
        throw new Error(data?.error || 'Erro ao excluir caso de teste');
      }

      toast.success("Caso de teste excluído com sucesso!");
      setShowDeleteConfirm(false);
      onOpenChange(false);
      onTestCaseUpdated();
    } catch (error) {
      console.error('Error deleting test case:', error);
      const errorMessage = error instanceof Error ? error.message : "Erro ao excluir caso de teste";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!testCase) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Save className="h-5 w-5" />
            Editar Caso de Teste
          </DialogTitle>
          <DialogDescription>
            Atualize as informações do caso de teste. Versão atual: {testCase.version}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="question">Pergunta *</Label>
            <Textarea
              id="question"
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
              value={formData.expected_answer}
              onChange={(e) => setFormData(prev => ({ ...prev, expected_answer: e.target.value }))}
              rows={4}
              required
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="is_sql_related"
              checked={formData.is_sql_related}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_sql_related: checked }))}
            />
            <Label htmlFor="is_sql_related">Este caso requer consulta SQL</Label>
          </div>

          {formData.is_sql_related && (
            <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
              <div className="space-y-2">
                <Label htmlFor="expected_sql">SQL Esperado</Label>
                <Textarea
                  id="expected_sql"
                  placeholder="SELECT * FROM documents WHERE..."
                  value={formData.expected_sql}
                  onChange={(e) => setFormData(prev => ({ ...prev, expected_sql: e.target.value }))}
                  rows={3}
                  className="font-mono text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sql_complexity">Complexidade SQL</Label>
                <Select 
                  value={formData.sql_complexity} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, sql_complexity: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a complexidade" />
                  </SelectTrigger>
                  <SelectContent>
                    {sqlComplexities.map(complexity => (
                      <SelectItem key={complexity.value} value={complexity.value}>
                        {complexity.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Categoria *</Label>
              <Select 
                value={formData.category} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
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

          <div className="flex justify-between">
            <Button 
              type="button" 
              variant="destructive" 
              onClick={() => setShowDeleteConfirm(true)}
              disabled={loading}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir Caso
            </Button>
            
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {loading ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
      
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este caso de teste? Esta ação não pode ser desfeita.
              <div className="mt-2 p-3 bg-muted rounded-md">
                <p className="font-medium">{testCase?.question}</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}