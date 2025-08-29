import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Edit, Trash2, Power, PowerOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { AddTestCaseDialog } from './AddTestCaseDialog';
import { EditTestCaseDialog } from './EditTestCaseDialog';
import { QATestCasesExportButton } from './QATestCasesExportButton';
import { toast } from 'sonner';

interface QATestCase {
  id: string;
  question: string;
  expected_answer: string;
  expected_sql?: string;
  category: string;
  difficulty: string | null;
  tags: string[];
  is_active: boolean;
  is_sql_related: boolean;
  sql_complexity?: string;
  version: number;
  created_at: string;
  updated_at: string;
}

export function QATestCasesList() {
  const [testCases, setTestCases] = useState<QATestCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedTestCase, setSelectedTestCase] = useState<QATestCase | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [difficulties, setDifficulties] = useState<string[]>([]);

  const fetchTestCases = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('qa_test_cases')
        .select('*')
        .order('created_at', { ascending: false });

      if (searchTerm) {
        query = query.or(`question.ilike.%${searchTerm}%,expected_answer.ilike.%${searchTerm}%`);
      }

      if (categoryFilter !== 'all') {
        query = query.eq('category', categoryFilter);
      }

      if (difficultyFilter !== 'all') {
        query = query.eq('difficulty', difficultyFilter);
      }

      if (statusFilter !== 'all') {
        query = query.eq('is_active', statusFilter === 'active');
      }

      const { data, error } = await query;

      if (error) throw error;

      if (data) {
        // Convert database response to match interface
        const mappedData = data.map(item => ({
          ...item,
          id: item.id.toString(), // Convert number to string for interface compatibility
          difficulty: item.difficulty || item.complexity || null
        }));
        setTestCases(mappedData as QATestCase[]);
      }
    } catch (error) {
      console.error('Error fetching test cases:', error);
      toast.error('Erro ao carregar casos de teste');
    } finally {
      setLoading(false);
    }
  };

  const fetchFilters = async () => {
    try {
      const { data } = await supabase
        .from('qa_test_cases')
        .select('category, difficulty')
        .neq('category', null)
        .neq('difficulty', null);

      if (data) {
        const uniqueCategories = Array.from(new Set(data.map(item => item.category).filter(Boolean)));
        const uniqueDifficulties = Array.from(new Set(data.map(item => item.difficulty).filter(Boolean)));
        
        setCategories(uniqueCategories);
        setDifficulties(uniqueDifficulties);
      }
    } catch (error) {
      console.error('Error fetching filters:', error);
    }
  };

  useEffect(() => {
    fetchTestCases();
    fetchFilters();
  }, [searchTerm, categoryFilter, difficultyFilter, statusFilter]);

  const handleEdit = (testCase: QATestCase) => {
    setSelectedTestCase(testCase);
    setEditDialogOpen(true);
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('qa_test_cases')
        .update({ is_active: !currentStatus })
        .eq('id', parseInt(id)); // Convert string id back to number for query

      if (error) throw error;

      toast.success(`Caso de teste ${!currentStatus ? 'ativado' : 'desativado'} com sucesso`);
      fetchTestCases();
    } catch (error) {
      console.error('Error toggling status:', error);
      toast.error('Erro ao alterar status');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este caso de teste?')) return;

    try {
      const { error } = await supabase
        .from('qa_test_cases')
        .delete()
        .eq('id', parseInt(id)); // Convert string id back to number for query

      if (error) throw error;

      toast.success('Caso de teste excluído com sucesso');
      fetchTestCases();
    } catch (error) {
      console.error('Error deleting test case:', error);
      toast.error('Erro ao excluir caso de teste');
    }
  };

  const getDifficultyColor = (difficulty: string | null | undefined) => {
    if (!difficulty) return 'outline';
    
    switch (difficulty.toLowerCase()) {
      case 'easy': return 'default';
      case 'medium': return 'secondary';
      case 'hard': return 'destructive';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Casos de Teste QA</h2>
          <p className="text-muted-foreground">Gerencie os casos de teste para validação de qualidade</p>
        </div>
        <div className="flex gap-2">
          <QATestCasesExportButton />
          <AddTestCaseDialog onTestCaseAdded={fetchTestCases} />
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar casos de teste..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as categorias</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category} value={category}>{category}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Dificuldade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as dificuldades</SelectItem>
                {difficulties.map(difficulty => (
                  <SelectItem key={difficulty} value={difficulty}>{difficulty}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="active">Ativos</SelectItem>
                <SelectItem value="inactive">Inativos</SelectItem>
              </SelectContent>
            </Select>

            <div className="text-sm text-muted-foreground flex items-center">
              Total: {testCases.length} casos
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Test Cases Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Casos de Teste</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-4">Carregando...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pergunta</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Dificuldade</TableHead>
                  <TableHead>SQL</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {testCases.map((testCase) => (
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
                        {testCase.difficulty || 'N/A'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {testCase.is_sql_related ? (
                        <Badge variant="secondary">SQL</Badge>
                      ) : (
                        <Badge variant="outline">Texto</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={testCase.is_active ? 'default' : 'destructive'}>
                        {testCase.is_active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(testCase)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleStatus(testCase.id, testCase.is_active)}
                        >
                          {testCase.is_active ? (
                            <PowerOff className="h-4 w-4" />
                          ) : (
                            <Power className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(testCase.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <EditTestCaseDialog
        testCase={selectedTestCase}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onTestCaseUpdated={fetchTestCases}
      />
    </div>
  );
}