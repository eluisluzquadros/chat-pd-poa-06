import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Download, Upload, RefreshCw, CheckCircle, XCircle, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { TestCasesList } from './TestCasesList';
import { CreateTestCaseDialog } from './CreateTestCaseDialog';

interface TestCase {
  id?: string;
  question: string;
  expected_answer: string;
  category?: string;
  difficulty?: string;
  tags?: string[] | string;
  created_at?: string;
}

interface ImportResult {
  success: boolean;
  imported: number;
  updated: number;
  errors: string[];
}

export function TestCaseManager() {
  const [isLoading, setIsLoading] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  // Query para casos de teste
  const { data: testCases, refetch: refetchTestCases } = useQuery({
    queryKey: ['qa-test-cases-manager'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('qa_test_cases')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    }
  });

  // Função para exportar casos de teste seguindo o schema do banco
  const exportTestCases = async () => {
    try {
      setIsLoading(true);
      
      if (!testCases || testCases.length === 0) {
        toast.error('Nenhum caso de teste encontrado para exportar');
        return;
      }
      
      // Headers seguindo o schema do banco qa_test_cases
      const csvHeaders = [
        'id',
        'question', 
        'expected_answer',
        'category',
        'difficulty', 
        'tags',
        'context',
        'metadata',
        'is_active',
        'created_at',
        'updated_at'
      ];
      
      // Converter dados para CSV seguindo o schema exato
      const csvRows = testCases.map(testCase => [
        testCase.id || '',
        `"${(testCase.question || '').replace(/"/g, '""')}"`,
        `"${(testCase.expected_answer || '').replace(/"/g, '""')}"`,
        testCase.category || '',
        testCase.difficulty || '',
        `"${Array.isArray(testCase.tags) ? testCase.tags.join(';') : (testCase.tags || '')}"`,
        `"${(testCase.context || '').replace(/"/g, '""')}"`,
        testCase.metadata ? `"${JSON.stringify(testCase.metadata).replace(/"/g, '""')}"` : '',
        testCase.is_active !== undefined ? testCase.is_active : true,
        testCase.created_at || '',
        testCase.updated_at || ''
      ]);
      
      const csvContent = [csvHeaders.join(','), ...csvRows.map(row => row.join(','))].join('\n');
      
      // Download do arquivo
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `qa-test-cases-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success(`${testCases.length} casos de teste exportados com sucesso`);
      
    } catch (error) {
      console.error('Erro ao exportar casos de teste:', error);
      toast.error('Erro ao exportar casos de teste');
    } finally {
      setIsLoading(false);
    }
  };

  // Função para processar arquivo CSV e validar dados
  const parseCSV = (text: string): TestCase[] => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) throw new Error('Arquivo CSV vazio ou inválido');
    
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const data: TestCase[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;
      
      // Parse CSV considerando aspas
      const values = [];
      let current = '';
      let inQuotes = false;
      
      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      values.push(current.trim());
      
      // Validar campos obrigatórios
      const questionIndex = headers.findIndex(h => h.toLowerCase().includes('question'));
      const answerIndex = headers.findIndex(h => h.toLowerCase().includes('expected_answer') || h.toLowerCase().includes('answer'));
      
      if (questionIndex === -1 || answerIndex === -1) {
        throw new Error('Arquivo deve conter colunas "question" e "expected_answer"');
      }
      
      const question = values[questionIndex]?.replace(/^"|"$/g, '').replace(/""/g, '"').trim();
      const expectedAnswer = values[answerIndex]?.replace(/^"|"$/g, '').replace(/""/g, '"').trim();
      
      if (!question || !expectedAnswer) {
        continue; // Pular linhas inválidas
      }
      
      // Mapear outros campos
      const categoryIndex = headers.findIndex(h => h.toLowerCase().includes('category'));
      const difficultyIndex = headers.findIndex(h => h.toLowerCase().includes('difficulty'));
      const tagsIndex = headers.findIndex(h => h.toLowerCase().includes('tags'));
      const idIndex = headers.findIndex(h => h.toLowerCase() === 'id');
      
      const testCase: TestCase = {
        question,
        expected_answer: expectedAnswer,
        category: categoryIndex >= 0 ? values[categoryIndex]?.replace(/^"|"$/g, '') : undefined,
        difficulty: difficultyIndex >= 0 ? values[difficultyIndex]?.replace(/^"|"$/g, '') : undefined,
        tags: tagsIndex >= 0 ? values[tagsIndex]?.replace(/^"|"$/g, '').split(';').filter(Boolean) : undefined,
      };
      
      // Se tem ID, incluir para update
      if (idIndex >= 0 && values[idIndex]) {
        testCase.id = values[idIndex].replace(/^"|"$/g, '');
      }
      
      data.push(testCase);
    }
    
    return data;
  };

  // Função para importar e atualizar casos de teste
  const importTestCases = async (file: File) => {
    try {
      setIsLoading(true);
      setImportResult(null);
      
      const text = await file.text();
      const parsedCases = parseCSV(text);
      
      if (parsedCases.length === 0) {
        toast.error('Nenhum caso de teste válido encontrado no arquivo');
        return;
      }
      
      let imported = 0;
      let updated = 0;
      const errors: string[] = [];
      
      // Processar cada caso de teste
      for (const testCase of parsedCases) {
        try {
          if (testCase.id) {
            // Tentar atualizar caso existente
            const { error: updateError } = await supabase
              .from('qa_test_cases')
              .update({
                question: testCase.question,
                expected_answer: testCase.expected_answer,
                category: testCase.category,
                difficulty: testCase.difficulty,
                tags: testCase.tags,
                updated_at: new Date().toISOString()
              })
              .eq('id', testCase.id);
            
            if (updateError) {
              // Se update falhar, tentar inserir como novo
              const { error: insertError } = await supabase
                .from('qa_test_cases')
                .insert({
                  question: testCase.question,
                  expected_answer: testCase.expected_answer,
                  category: testCase.category,
                  difficulty: testCase.difficulty,
                  tags: testCase.tags
                });
              
              if (insertError) {
                errors.push(`Erro ao processar: ${testCase.question.substring(0, 50)}...`);
              } else {
                imported++;
              }
            } else {
              updated++;
            }
          } else {
            // Inserir novo caso de teste
            const { error: insertError } = await supabase
              .from('qa_test_cases')
              .insert({
                question: testCase.question,
                expected_answer: testCase.expected_answer,
                category: testCase.category,
                difficulty: testCase.difficulty,
                tags: testCase.tags
              });
            
            if (insertError) {
              errors.push(`Erro ao inserir: ${testCase.question.substring(0, 50)}...`);
            } else {
              imported++;
            }
          }
        } catch (error) {
          errors.push(`Erro ao processar: ${testCase.question.substring(0, 50)}...`);
        }
      }
      
      const result: ImportResult = {
        success: imported > 0 || updated > 0,
        imported,
        updated,
        errors
      };
      
      setImportResult(result);
      
      // Atualizar cache
      await refetchTestCases();
      queryClient.invalidateQueries({ queryKey: ['qa-test-cases'] });
      
      if (result.success) {
        toast.success(`Importação concluída: ${imported} novos, ${updated} atualizados`);
      } else {
        toast.error('Falha na importação: verifique o arquivo e tente novamente');
      }
      
    } catch (error) {
      console.error('Erro ao importar casos de teste:', error);
      toast.error(`Erro ao processar arquivo: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      setImportResult({
        success: false,
        imported: 0,
        updated: 0,
        errors: [error instanceof Error ? error.message : 'Erro desconhecido']
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handler para seleção de arquivo
  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        await importTestCases(file);
      }
    };
    input.click();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Gerenciamento de Casos de Teste
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Importar, exportar e sincronizar casos de teste seguindo o schema do banco de dados
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={() => setCreateDialogOpen(true)}
              data-testid="button-create-testcase"
            >
              <Plus className="h-4 w-4 mr-2" />
              Novo Caso
            </Button>
            <Button 
              variant="outline" 
              onClick={handleImport}
              disabled={isLoading}
              data-testid="button-import-testcases"
            >
              <Upload className="h-4 w-4 mr-2" />
              {isLoading ? 'Importando...' : 'Importar CSV'}
            </Button>
            <Button 
              variant="outline" 
              onClick={exportTestCases}
              disabled={isLoading || !testCases?.length}
              data-testid="button-export-testcases"
            >
              <Download className="h-4 w-4 mr-2" />
              {isLoading ? 'Exportando...' : 'Exportar CSV'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Resultado da Importação */}
        {importResult && (
          <div className={`p-4 rounded-lg border ${importResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <div className="flex items-center gap-2 mb-2">
              {importResult.success ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
              <span className={`font-medium ${importResult.success ? 'text-green-800' : 'text-red-800'}`}>
                {importResult.success ? 'Importação Concluída' : 'Falha na Importação'}
              </span>
            </div>
            <div className="text-sm space-y-1">
              <p>✅ <strong>{importResult.imported}</strong> casos de teste importados</p>
              <p>🔄 <strong>{importResult.updated}</strong> casos de teste atualizados</p>
              {importResult.errors.length > 0 && (
                <div className="mt-2">
                  <p className="text-red-700 font-medium">❌ Erros encontrados:</p>
                  <ul className="list-disc list-inside text-red-600">
                    {importResult.errors.slice(0, 5).map((error, index) => (
                      <li key={index} className="text-xs">{error}</li>
                    ))}
                    {importResult.errors.length > 5 && (
                      <li className="text-xs">... e mais {importResult.errors.length - 5} erros</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Informações sobre o Schema */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <span className="font-medium text-blue-800">Schema CSV Esperado</span>
            </div>
            <div className="text-xs text-blue-700 space-y-1">
              <p><strong>Obrigatórios:</strong> question, expected_answer</p>
              <p><strong>Opcionais:</strong> id, category, difficulty, tags</p>
              <p><strong>Formato Tags:</strong> separadas por ponto e vírgula (;)</p>
              <p><strong>Update:</strong> se ID existir, atualiza o caso; senão, cria novo</p>
            </div>
          </div>
          
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline">Estatísticas</Badge>
            </div>
            <div className="text-sm space-y-1">
              <p>📊 <strong>{testCases?.length || 0}</strong> casos de teste cadastrados</p>
              <p>📂 Categorias: {new Set(testCases?.map(t => t.category).filter(Boolean)).size}</p>
              <p>🎯 Níveis: {new Set(testCases?.map(t => t.difficulty).filter(Boolean)).size}</p>
            </div>
          </div>
        </div>

        {/* Lista Completa de Casos de Teste */}
        <div className="space-y-2">
          <h4 className="font-medium">Casos de Teste Cadastrados</h4>
          <TestCasesList 
            testCases={testCases || []} 
            loading={isLoading}
            onRefresh={refetchTestCases}
          />
        </div>
      </CardContent>

      <CreateTestCaseDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onTestCaseCreated={refetchTestCases}
      />
    </Card>
  );
}