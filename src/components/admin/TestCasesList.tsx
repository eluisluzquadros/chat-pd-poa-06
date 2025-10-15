import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Eye, Edit, Trash, MoreVertical, Copy, Loader2, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { EditTestCaseDialog } from "./EditTestCaseDialog";
import type { QATestCase } from "@/types/qa";

interface TestCasesListProps {
  testCases: QATestCase[];
  loading: boolean;
  onRefresh: () => void;
}

export function TestCasesList({ testCases, loading, onRefresh }: TestCasesListProps) {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [difficultyFilter, setDifficultyFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sqlFilter, setSqlFilter] = useState<string>("all");
  
  const [selectedTestCase, setSelectedTestCase] = useState<QATestCase | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [testCaseToDelete, setTestCaseToDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Filtrar casos de teste
  const filteredCases = testCases.filter(testCase => {
    const matchesSearch = 
      testCase.question?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      testCase.expected_answer?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      testCase.category?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = categoryFilter === "all" || testCase.category === categoryFilter;
    const matchesDifficulty = difficultyFilter === "all" || testCase.difficulty === difficultyFilter;
    const matchesStatus = 
      statusFilter === "all" || 
      (statusFilter === "active" && testCase.is_active) ||
      (statusFilter === "inactive" && !testCase.is_active);
    const matchesSql = 
      sqlFilter === "all" ||
      (sqlFilter === "sql" && testCase.is_sql_related) ||
      (sqlFilter === "non-sql" && !testCase.is_sql_related);

    return matchesSearch && matchesCategory && matchesDifficulty && matchesStatus && matchesSql;
  });

  // Obter categorias únicas
  const categories = Array.from(new Set(testCases.map(tc => tc.category).filter(Boolean)));
  const difficulties = ['easy', 'medium', 'hard'];

  const handleEdit = (testCase: QATestCase) => {
    setSelectedTestCase(testCase);
    setEditDialogOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    setTestCaseToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!testCaseToDelete) return;

    setDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke('qa-delete-test-case', {
        body: { id: testCaseToDelete }
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Erro ao deletar caso de teste');
      }

      toast({
        title: data.deleted ? "Deletado!" : "Desativado!",
        description: data.message || (data.deleted 
          ? "Caso de teste deletado permanentemente." 
          : "Caso de teste desativado (possui resultados vinculados)."),
      });

      onRefresh();
    } catch (error: any) {
      console.error('Error deleting test case:', error);
      toast({
        title: "Erro ao deletar",
        description: error.message || "Não foi possível deletar o caso de teste.",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setTestCaseToDelete(null);
    }
  };

  const handleDuplicate = async (testCase: QATestCase) => {
    try {
      const { data, error } = await supabase.functions.invoke('qa-create-test-case', {
        body: {
          question: `${testCase.question} (cópia)`,
          expected_answer: testCase.expected_answer,
          category: testCase.category,
          difficulty: testCase.difficulty,
          tags: testCase.tags,
          is_active: false, // Criar como inativo
          is_sql_related: testCase.is_sql_related,
          expected_sql: testCase.expected_sql,
          sql_complexity: testCase.sql_complexity,
        }
      });

      if (error) throw error;

      toast({
        title: "Duplicado!",
        description: "Caso de teste duplicado com sucesso (criado como inativo).",
      });

      onRefresh();
    } catch (error: any) {
      toast({
        title: "Erro ao duplicar",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getDifficultyColor = (difficulty?: string | null) => {
    switch (difficulty) {
      case 'easy': return 'default';
      case 'medium': return 'secondary';
      case 'hard': return 'destructive';
      default: return 'outline';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {/* Filtros */}
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar casos de teste..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas Categorias</SelectItem>
              {categories.map(cat => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Dificuldade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {difficulties.map(diff => (
                <SelectItem key={diff} value={diff}>
                  {diff === 'easy' ? 'Fácil' : diff === 'medium' ? 'Médio' : 'Difícil'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Ativos</SelectItem>
              <SelectItem value="inactive">Inativos</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sqlFilter} onValueChange={setSqlFilter}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="SQL" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="sql">SQL</SelectItem>
              <SelectItem value="non-sql">Não-SQL</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Tabela */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pergunta</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Dificuldade</TableHead>
                <TableHead>SQL</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCases.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Nenhum caso de teste encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filteredCases.map((testCase) => (
                  <TableRow key={testCase.id}>
                    <TableCell className="max-w-md">
                      <div className="truncate" title={testCase.question}>
                        {testCase.question}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{testCase.category}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getDifficultyColor(testCase.difficulty)}>
                        {testCase.difficulty === 'easy' ? 'Fácil' : 
                         testCase.difficulty === 'medium' ? 'Médio' : 'Difícil'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {testCase.is_sql_related ? (
                        <Badge variant="secondary">SQL</Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={testCase.is_active ? "default" : "destructive"}>
                        {testCase.is_active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(testCase)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDuplicate(testCase)}>
                            <Copy className="h-4 w-4 mr-2" />
                            Duplicar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => handleDeleteClick(String(testCase.id))}
                            className="text-destructive"
                          >
                            <Trash className="h-4 w-4 mr-2" />
                            Deletar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Informação de resultados */}
        <div className="text-sm text-muted-foreground">
          Exibindo {filteredCases.length} de {testCases.length} casos de teste
        </div>
      </div>

      {/* Edit Dialog */}
      {selectedTestCase && (
        <EditTestCaseDialog
          testCase={selectedTestCase}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onTestCaseUpdated={onRefresh}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Deleção</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja deletar este caso de teste? 
              {' '}Se houver resultados de validação vinculados, o caso será apenas desativado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting}>
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deletando...
                </>
              ) : (
                'Deletar'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
