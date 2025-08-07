import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, TrendingDown, Brain, FileText, CheckCircle } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";

interface ErrorPattern {
  category: string;
  count: number;
  percentage: number;
  examples: string[];
}

interface DifficultyAnalysis {
  difficulty: string;
  totalTests: number;
  failedTests: number;
  successRate: number;
}

export function QAErrorAnalysis() {
  const [errorPatterns, setErrorPatterns] = useState<ErrorPattern[]>([]);
  const [difficultyAnalysis, setDifficultyAnalysis] = useState<DifficultyAnalysis[]>([]);
  const [categoryErrors, setCategoryErrors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadErrorAnalysis();
  }, []);

  const loadErrorAnalysis = async () => {
    try {
      // Get failed test results with test case details
      const { data: failedResults, error } = await supabase
        .from('qa_validation_results')
        .select(`
          *,
          qa_test_cases (
            category,
            difficulty,
            tags,
            question,
            expected_answer
          )
        `)
        .eq('is_correct', false)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Error fetching failed results:', error);
        // Set empty data but don't crash
        setErrorPatterns([]);
        setDifficultyAnalysis([]);
        setCategoryErrors([]);
        return;
      }

      if (failedResults && failedResults.length > 0) {
        try {
          // Analyze error patterns
          const patterns = analyzeErrorPatterns(failedResults);
          setErrorPatterns(patterns);

          // Analyze by difficulty
          const diffAnalysis = analyzeDifficulty(failedResults);
          setDifficultyAnalysis(diffAnalysis);

          // Analyze by category
          const catAnalysis = analyzeCategories(failedResults);
          setCategoryErrors(catAnalysis);
        } catch (analysisError) {
          console.error('Error analyzing patterns:', analysisError);
          // Partial failure - show what we can
          setErrorPatterns([]);
          setDifficultyAnalysis([]);
          setCategoryErrors([]);
        }
      } else {
        // No failed results found
        setErrorPatterns([]);
        setDifficultyAnalysis([]);
        setCategoryErrors([]);
      }
    } catch (error) {
      console.error('Critical error loading error analysis:', error);
      // Set empty data to prevent crashes
      setErrorPatterns([]);
      setDifficultyAnalysis([]);
      setCategoryErrors([]);
    } finally {
      setLoading(false);
    }
  };

  const analyzeErrorPatterns = (results: any[]): ErrorPattern[] => {
    const patterns: Record<string, ErrorPattern> = {};
    
    results.forEach(result => {
      // Identify error pattern based on actual vs expected answer
      let pattern = 'Resposta Incorreta';
      
      if (!result.actual_answer || result.actual_answer === 'Sem resposta') {
        pattern = 'Sem Resposta';
      } else if (result.error_type === 'timeout') {
        pattern = 'Timeout';
      } else if (result.error_type === 'api_error') {
        pattern = 'Erro de API';
      } else if (result.actual_answer.toLowerCase().includes('não tenho') || 
                 result.actual_answer.toLowerCase().includes('não sei')) {
        pattern = 'Modelo Não Sabe';
      } else if (result.accuracy_score > 0.3 && result.accuracy_score < 0.7) {
        pattern = 'Resposta Parcial';
      }

      if (!patterns[pattern]) {
        patterns[pattern] = {
          category: pattern,
          count: 0,
          percentage: 0,
          examples: []
        };
      }

      patterns[pattern].count++;
      if (patterns[pattern].examples.length < 3) {
        patterns[pattern].examples.push(result.qa_test_cases.question);
      }
    });

    // Calculate percentages
    const total = results.length;
    Object.values(patterns).forEach(pattern => {
      pattern.percentage = (pattern.count / total) * 100;
    });

    return Object.values(patterns).sort((a, b) => b.count - a.count);
  };

  const analyzeDifficulty = (results: any[]): DifficultyAnalysis[] => {
    // Get all test results (not just failed)
    const difficultyMap: Record<string, DifficultyAnalysis> = {
      easy: { difficulty: 'Fácil', totalTests: 0, failedTests: 0, successRate: 0 },
      medium: { difficulty: 'Médio', totalTests: 0, failedTests: 0, successRate: 0 },
      hard: { difficulty: 'Difícil', totalTests: 0, failedTests: 0, successRate: 0 }
    };

    results.forEach(result => {
      const difficulty = result.qa_test_cases.difficulty;
      if (difficultyMap[difficulty]) {
        difficultyMap[difficulty].failedTests++;
      }
    });

    // We would need to query total tests by difficulty to get accurate success rates
    // For now, we'll estimate based on the failed tests distribution
    return Object.values(difficultyMap);
  };

  const analyzeCategories = (results: any[]): any[] => {
    const categoryMap: Record<string, number> = {};
    
    results.forEach(result => {
      const category = result.qa_test_cases.category;
      categoryMap[category] = (categoryMap[category] || 0) + 1;
    });

    return Object.entries(categoryMap)
      .map(([category, count]) => ({ category, errors: count }))
      .sort((a, b) => b.errors - a.errors);
  };

  const COLORS = ['#ef4444', '#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899'];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-6 w-64 bg-muted rounded animate-pulse"></div>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardHeader className="pb-3">
                <div className="h-4 w-32 bg-muted rounded animate-pulse"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 w-16 bg-muted rounded animate-pulse mb-2"></div>
                <div className="h-2 w-full bg-muted rounded animate-pulse"></div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        <div className="grid gap-6 md:grid-cols-2">
          {[1, 2].map(i => (
            <Card key={i}>
              <CardHeader>
                <div className="h-4 w-48 bg-muted rounded animate-pulse"></div>
                <div className="h-3 w-32 bg-muted rounded animate-pulse"></div>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] bg-muted rounded animate-pulse"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Show message when no error data is available
  if (errorPatterns.length === 0 && categoryErrors.length === 0) {
    return (
      <div className="space-y-6">
        <h3 className="text-lg font-semibold mb-4">Análise de Padrões de Erro</h3>
        <Card>
          <CardContent className="p-8 text-center">
            <div className="space-y-4">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
              <div>
                <h4 className="text-lg font-medium">Nenhum erro recente encontrado</h4>
                <p className="text-muted-foreground">
                  Não há dados de testes falhados nas últimas validações. 
                  Execute uma validação para gerar dados de análise de erros.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Análise de Padrões de Erro</h3>
        
        {/* Error Pattern Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-6">
          {errorPatterns.slice(0, 3).map((pattern, index) => (
            <Card key={pattern.category}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{pattern.category}</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{pattern.count}</div>
                <Progress value={pattern.percentage} className="h-2 mt-2" />
                <p className="text-sm text-muted-foreground mt-2">
                  {pattern.percentage.toFixed(1)}% dos erros
                </p>
                {pattern.examples.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs font-medium mb-1">Exemplos:</p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      {pattern.examples.slice(0, 2).map((example, i) => (
                        <li key={i} className="truncate">• {example}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Error Distribution Pie Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Distribuição de Tipos de Erro</CardTitle>
              <CardDescription>Análise dos padrões de falha</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={errorPatterns}
                      dataKey="count"
                      nameKey="category"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ percentage }) => `${percentage.toFixed(0)}%`}
                    >
                      {errorPatterns.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Category Error Bar Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Erros por Categoria</CardTitle>
              <CardDescription>Categorias com mais falhas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryErrors}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="category" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="errors" fill="#ef4444" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Insights */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Brain className="h-4 w-4" />
              Insights e Recomendações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {errorPatterns.length > 0 && errorPatterns[0].category === 'Modelo Não Sabe' && (
                <div className="flex items-start gap-2">
                  <Badge variant="outline" className="mt-0.5">Insight</Badge>
                  <p className="text-sm">
                    O modelo frequentemente responde "não sei" ou "não tenho informação". 
                    Considere melhorar o prompt do sistema ou adicionar mais contexto.
                  </p>
                </div>
              )}
              
              {errorPatterns.some(p => p.category === 'Resposta Parcial' && p.percentage > 20) && (
                <div className="flex items-start gap-2">
                  <Badge variant="outline" className="mt-0.5">Insight</Badge>
                  <p className="text-sm">
                    Muitas respostas são parcialmente corretas. O modelo pode estar 
                    tendo dificuldade com a precisão ou completude das respostas.
                  </p>
                </div>
              )}
              
              {categoryErrors.length > 0 && categoryErrors[0].errors > 10 && (
                <div className="flex items-start gap-2">
                  <Badge variant="outline" className="mt-0.5">Ação</Badge>
                  <p className="text-sm">
                    A categoria "{categoryErrors[0].category}" tem o maior número de erros. 
                    Revise os casos de teste desta categoria para identificar padrões.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}