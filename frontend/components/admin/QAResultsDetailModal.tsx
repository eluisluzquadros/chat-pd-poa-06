import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle, XCircle, Search, Filter, Eye, Clock, Target } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { QAValidationResult, QATestCase } from '@/types/qa';

interface QAResultsDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  runId: string;
  runData?: {
    model: string;
    totalTests: number;
    passedTests: number;
    accuracy: number;
    startedAt: string;
  };
}

interface DetailedResult extends QAValidationResult {
  qa_test_cases: QATestCase;
  evaluation_reasoning?: string;
}

export function QAResultsDetailModal({ 
  open, 
  onOpenChange, 
  runId, 
  runData 
}: QAResultsDetailModalProps) {
  const [results, setResults] = useState<DetailedResult[]>([]);
  const [filteredResults, setFilteredResults] = useState<DetailedResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'passed' | 'failed'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selectedResult, setSelectedResult] = useState<DetailedResult | null>(null);

  useEffect(() => {
    if (open && runId) {
      fetchResults();
    }
  }, [open, runId]);

  useEffect(() => {
    applyFilters();
  }, [results, searchTerm, statusFilter, categoryFilter]);

  const fetchResults = async () => {
    setLoading(true);
    try {
      // Since test_case_id is now TEXT and qa_test_cases.id is integer, 
      // we need to manually join the data instead of using foreign key relationship
      const { data: resultsData, error: resultsError } = await supabase
        .from('qa_validation_results')
        .select('*, evaluation_reasoning')
        .eq('validation_run_id', runId)
        .order('created_at', { ascending: false });

      if (resultsError) {
        console.error('Error fetching validation results:', resultsError);
        return;
      }

      if (!resultsData || resultsData.length === 0) {
        setResults([]);
        return;
      }

      // Get test case IDs, converting from text to integer
      const testCaseIds = resultsData
        .map(r => parseInt(r.test_case_id))
        .filter(id => !isNaN(id));
      
      console.log('Fetching test cases for IDs:', testCaseIds);

      // Fetch test case details separately
      const { data: testCasesData, error: testCasesError } = await supabase
        .from('qa_test_cases')
        .select(`
          id,
          test_id,
          question,
          expected_answer,
          category,
          difficulty,
          tags,
          is_sql_related
        `)
        .in('id', testCaseIds);

      if (testCasesError) {
        console.error('Error fetching test cases:', testCasesError);
        return;
      }

      // Manually join the data
      const resultsWithTestCases = resultsData.map(result => {
        const testCase = testCasesData?.find(tc => tc.id.toString() === result.test_case_id);
        return {
          ...result,
          qa_test_cases: testCase || null
        };
      }).filter(item => item.qa_test_cases) as DetailedResult[];

      console.log(`Fetched ${resultsWithTestCases.length} results with test case details`);
      setResults(resultsWithTestCases);
    } catch (error) {
      console.error('Error in fetchResults:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...results];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(result =>
        result.qa_test_cases.question?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        result.actual_answer.toLowerCase().includes(searchTerm.toLowerCase()) ||
        result.qa_test_cases.expected_answer?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(result =>
        statusFilter === 'passed' ? result.is_correct : !result.is_correct
      );
    }

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(result =>
        result.qa_test_cases.category === categoryFilter
      );
    }

    setFilteredResults(filtered);
  };

  const getCategories = () => {
    const categories = new Set(results.map(r => r.qa_test_cases.category).filter(Boolean));
    return Array.from(categories);
  };

  const getAccuracyColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600';
    if (score >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Resultados Detalhados
              {runData && (
                <div className="flex items-center gap-2 ml-4">
                  <Badge variant="outline">{runData.model}</Badge>
                  <Badge variant={runData.accuracy >= 80 ? 'default' : 'destructive'}>
                    {runData.accuracy.toFixed(1)}% acerto
                  </Badge>
                </div>
              )}
            </DialogTitle>
          </DialogHeader>

          {/* Filters */}
          <div className="flex gap-4 items-center p-4 border-b">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por pergunta, resposta esperada ou resposta atual..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="passed">Acertos</SelectItem>
                <SelectItem value="failed">Erros</SelectItem>
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas Categorias</SelectItem>
                {getCategories().map(category => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Results Table */}
          <div className="flex-1 overflow-auto">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">Status</TableHead>
                    <TableHead>Pergunta</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Acurácia</TableHead>
                    <TableHead>Tempo</TableHead>
                    <TableHead className="w-[100px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredResults.map((result) => (
                    <TableRow 
                      key={result.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedResult(result)}
                    >
                      <TableCell>
                        {result.is_correct ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-600" />
                        )}
                      </TableCell>
                      <TableCell className="max-w-[300px]">
                        <div className="truncate" title={result.qa_test_cases.question}>
                          {result.qa_test_cases.question}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {result.qa_test_cases.category}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className={getAccuracyColor(result.accuracy_score)}>
                          {(result.accuracy_score * 100).toFixed(1)}%
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {result.response_time_ms}ms
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedResult(result);
                          }}
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          {/* Summary */}
          <div className="border-t p-4">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                Mostrando {filteredResults.length} de {results.length} resultados
              </span>
              <div className="flex items-center gap-4">
                <span>✓ {filteredResults.filter(r => r.is_correct).length} acertos</span>
                <span>✗ {filteredResults.filter(r => !r.is_correct).length} erros</span>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detailed Result Modal */}
      {selectedResult && (
        <Dialog open={!!selectedResult} onOpenChange={() => setSelectedResult(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Detalhes do Teste
                {selectedResult.is_correct ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              {/* Test Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Informações do Teste</h4>
                  <div className="space-y-2 text-sm">
                    <div><strong>ID:</strong> {selectedResult.test_case_id}</div>
                    <div><strong>Categoria:</strong> {selectedResult.qa_test_cases.category}</div>
                    <div><strong>Dificuldade:</strong> {selectedResult.qa_test_cases.difficulty}</div>
                    <div><strong>SQL:</strong> {selectedResult.qa_test_cases.is_sql_related ? 'Sim' : 'Não'}</div>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Métricas</h4>
                  <div className="space-y-2 text-sm">
                    <div><strong>Acurácia:</strong> 
                      <span className={getAccuracyColor(selectedResult.accuracy_score)}>
                        {(selectedResult.accuracy_score * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div><strong>Tempo de Resposta:</strong> {selectedResult.response_time_ms}ms</div>
                    <div><strong>Modelo:</strong> {selectedResult.model}</div>
                    {selectedResult.error_type && (
                      <div><strong>Tipo de Erro:</strong> {selectedResult.error_type}</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Question */}
              <div>
                <h4 className="font-medium mb-2">Pergunta</h4>
                <div className="p-3 bg-muted rounded-lg">
                  {selectedResult.qa_test_cases.question}
                </div>
              </div>

              {/* Expected vs Actual */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2 text-green-600">Resposta Esperada</h4>
                  <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                    {selectedResult.qa_test_cases.expected_answer}
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-2 text-blue-600">Resposta Recebida</h4>
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    {selectedResult.actual_answer || 'Sem resposta'}
                  </div>
                </div>
              </div>

              {/* LLM Evaluation Reasoning */}
              {selectedResult.evaluation_reasoning && (
                <div>
                  <h4 className="font-medium mb-2 text-purple-600">Avaliação LLM</h4>
                  <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                    <p className="text-sm whitespace-pre-wrap">{selectedResult.evaluation_reasoning}</p>
                  </div>
                </div>
              )}

              {/* Error Details */}
              {selectedResult.error_details && (
                <div>
                  <h4 className="font-medium mb-2 text-red-600">Detalhes do Erro</h4>
                  <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                    {selectedResult.error_details}
                  </div>
                </div>
              )}

              {/* Tags */}
              {selectedResult.qa_test_cases.tags && selectedResult.qa_test_cases.tags.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Tags</h4>
                  <div className="flex gap-2 flex-wrap">
                    {selectedResult.qa_test_cases.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary">{tag}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}