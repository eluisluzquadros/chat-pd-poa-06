import { describe, it, expect, beforeAll } from '@jest/globals';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const TIMEOUT = 20000;

interface SQLGenerationResult {
  sqlQueries: Array<{
    query: string;
    dataset_id: string;
    purpose: string;
    data?: any[];
    error?: string;
  }>;
  confidence: number;
  executionPlan: string;
  executionResults?: any[];
}

describe('SQL Generator Tests', () => {
  async function testSQLGenerator(
    query: string, 
    analysisResult: any
  ): Promise<SQLGenerationResult> {
    const { data, error } = await supabase.functions.invoke('sql-generator', {
      body: {
        query,
        analysisResult,
        userRole: 'citizen'
      }
    });

    if (error) {
      throw new Error(`SQL generator error: ${error.message}`);
    }

    return data;
  }

  // Mock analysis results for testing
  const createAnalysisResult = (overrides: any = {}) => ({
    intent: 'tabular',
    entities: { bairros: [], zots: [], parametros: [] },
    requiredDatasets: ['17_GMWnJC1sKff-YS0wesgxsvo3tnZdgSSb4JZ0ZjpCk'],
    confidence: 0.9,
    strategy: 'structured_only',
    isConstructionQuery: false,
    ...overrides
  });

  describe('1. Construction Query SQL Generation', () => {
    it('deve gerar SQL correto para consulta de construção por bairro', async () => {
      const analysisResult = createAnalysisResult({
        entities: { bairros: ['PETRÓPOLIS'] },
        isConstructionQuery: true
      });

      const result = await testSQLGenerator(
        'o que posso construir no Petrópolis',
        analysisResult
      );

      expect(result.sqlQueries).toBeDefined();
      expect(result.sqlQueries.length).toBeGreaterThan(0);

      const mainQuery = result.sqlQueries[0];
      expect(mainQuery.query).toContain('document_rows');
      expect(mainQuery.query).toContain('17_GMWnJC1sKff-YS0wesgxsvo3tnZdgSSb4JZ0ZjpCk');
      expect(mainQuery.query.toLowerCase()).toContain('petrópolis');
      
      // Deve incluir campos obrigatórios
      expect(mainQuery.query).toContain('Zona');
      expect(mainQuery.query).toContain('Altura Máxima - Edificação Isolada');
      expect(mainQuery.query).toContain('Coeficiente de Aproveitamento - Básico');
      expect(mainQuery.query).toContain('Coeficiente de Aproveitamento - Máximo');
    }, TIMEOUT);

    it('deve executar SQL e retornar dados válidos', async () => {
      const analysisResult = createAnalysisResult({
        entities: { bairros: ['CRISTAL'] },
        isConstructionQuery: true
      });

      const result = await testSQLGenerator(
        'ZOTs do Cristal',
        analysisResult
      );

      expect(result.executionResults).toBeDefined();
      expect(result.executionResults.length).toBeGreaterThan(0);

      const executionResult = result.executionResults[0];
      expect(executionResult.data).toBeDefined();
      
      if (executionResult.data && executionResult.data.length > 0) {
        const row = executionResult.data[0];
        expect(row).toHaveProperty('zona');
        expect(row.zona).toMatch(/ZOT\s*\d+/);
      }
    }, TIMEOUT);
  });

  describe('2. Neighborhood Accuracy Tests', () => {
    it('deve filtrar dados apenas do bairro solicitado', async () => {
      const analysisResult = createAnalysisResult({
        entities: { bairros: ['BOA VISTA'] },
        isConstructionQuery: true
      });

      const result = await testSQLGenerator(
        'regime urbanístico da Boa Vista',
        analysisResult
      );

      expect(result.executionResults).toBeDefined();
      
      const executionResult = result.executionResults[0];
      if (executionResult.data && executionResult.data.length > 0) {
        // Todos os dados devem ser do bairro correto
        executionResult.data.forEach(row => {
          if (row.bairro || row.Bairro) {
            expect(row.bairro || row.Bairro).toBe('BOA VISTA');
          }
        });
      }
    }, TIMEOUT);

    it('não deve misturar Boa Vista com Boa Vista do Sul', async () => {
      const analysisResults = [
        createAnalysisResult({
          entities: { bairros: ['BOA VISTA'] },
          isConstructionQuery: true
        }),
        createAnalysisResult({
          entities: { bairros: ['BOA VISTA DO SUL'] },
          isConstructionQuery: true
        })
      ];

      for (const analysisResult of analysisResults) {
        const bairro = analysisResult.entities.bairros[0];
        const result = await testSQLGenerator(
          `regime urbanístico ${bairro}`,
          analysisResult
        );

        const executionResult = result.executionResults?.[0];
        if (executionResult?.data && executionResult.data.length > 0) {
          executionResult.data.forEach(row => {
            if (row.bairro || row.Bairro) {
              expect(row.bairro || row.Bairro).toBe(bairro);
            }
          });
        }
      }
    }, TIMEOUT);
  });

  describe('3. ZOT Query Tests', () => {
    it('deve gerar SQL correto para consulta de ZOT específica', async () => {
      const analysisResult = createAnalysisResult({
        entities: { zots: ['ZOT 07'] },
        isConstructionQuery: true
      });

      const result = await testSQLGenerator(
        'altura máxima da ZOT 07',
        analysisResult
      );

      expect(result.sqlQueries.length).toBeGreaterThan(0);
      
      const query = result.sqlQueries[0].query;
      expect(query).toContain('ZOT 07');
      expect(query).toContain('Altura Máxima - Edificação Isolada');
    }, TIMEOUT);

    it('deve lidar com ZOTs com subdivisões', async () => {
      const analysisResult = createAnalysisResult({
        entities: { zots: ['ZOT 08.3'] },
        isConstructionQuery: true,
        processingStrategy: 'comprehensive_subdivision_query'
      });

      const result = await testSQLGenerator(
        'ZOT 08.3 subdivisões',
        analysisResult
      );

      const query = result.sqlQueries[0].query;
      expect(query).toContain('08.3');
      
      const executionResult = result.executionResults?.[0];
      if (executionResult?.data) {
        // Deve retornar múltiplas subdivisões se existirem
        const subdivisionsFound = executionResult.data.filter(row => 
          (row.zona || row.Zona)?.includes('08.3')
        );
        expect(subdivisionsFound.length).toBeGreaterThanOrEqual(1);
      }
    }, TIMEOUT);
  });

  describe('4. Counting and Aggregation Tests', () => {
    it('deve gerar SQL para contar bairros', async () => {
      const analysisResult = createAnalysisResult({
        intent: 'tabular',
        requiredDatasets: ['1FTENHpX4aLxmAoxvrEeGQn0fej-wxTMQRQs_XBjPQPY'],
        isConstructionQuery: false
      });

      const result = await testSQLGenerator(
        'quantos bairros tem Porto Alegre',
        analysisResult
      );

      const query = result.sqlQueries[0].query;
      expect(query.toLowerCase()).toContain('count');
      expect(query.toLowerCase()).toContain('distinct');
      expect(query).toContain('Bairro');
    }, TIMEOUT);

    it('deve calcular índice médio de aproveitamento', async () => {
      const analysisResult = createAnalysisResult({
        entities: { bairros: ['CRISTAL'], parametros: ['índice de aproveitamento'] },
        isConstructionQuery: true
      });

      const result = await testSQLGenerator(
        'índice de aproveitamento médio do Cristal',
        analysisResult
      );

      // Deve gerar duas queries: uma para média, outra para detalhes
      expect(result.sqlQueries.length).toBeGreaterThanOrEqual(1);
      
      const hasAvgQuery = result.sqlQueries.some(q => 
        q.query.toLowerCase().includes('avg')
      );
      expect(hasAvgQuery).toBe(true);
    }, TIMEOUT);
  });

  describe('5. Column Name Accuracy Tests', () => {
    it('deve usar nomes exatos das colunas', async () => {
      const analysisResult = createAnalysisResult({
        entities: { bairros: ['CENTRO'] },
        isConstructionQuery: true
      });

      const result = await testSQLGenerator(
        'parâmetros construtivos do Centro',
        analysisResult
      );

      const query = result.sqlQueries[0].query;
      
      // Deve usar nomes exatos das colunas
      expect(query).toContain('Altura Máxima - Edificação Isolada');
      expect(query).toContain('Coeficiente de Aproveitamento - Básico');
      expect(query).toContain('Coeficiente de Aproveitamento - Máximo');
      
      // Não deve usar nomes abreviados ou incorretos
      expect(query).not.toContain('altura_maxima');
      expect(query).not.toContain('ca_basico');
    }, TIMEOUT);
  });

  describe('6. Dataset Selection Tests', () => {
    it('deve usar dataset correto para regime urbanístico', async () => {
      const analysisResult = createAnalysisResult({
        requiredDatasets: ['17_GMWnJC1sKff-YS0wesgxsvo3tnZdgSSb4JZ0ZjpCk'],
        isConstructionQuery: true
      });

      const result = await testSQLGenerator(
        'regime urbanístico',
        analysisResult
      );

      expect(result.sqlQueries[0].dataset_id).toBe('17_GMWnJC1sKff-YS0wesgxsvo3tnZdgSSb4JZ0ZjpCk');
    }, TIMEOUT);

    it('deve usar dataset correto para ZOTs vs Bairros', async () => {
      const analysisResult = createAnalysisResult({
        requiredDatasets: ['1FTENHpX4aLxmAoxvrEeGQn0fej-wxTMQRQs_XBjPQPY'],
        isConstructionQuery: false
      });

      const result = await testSQLGenerator(
        'lista de bairros por ZOT',
        analysisResult
      );

      expect(result.sqlQueries[0].dataset_id).toBe('1FTENHpX4aLxmAoxvrEeGQn0fej-wxTMQRQs_XBjPQPY');
    }, TIMEOUT);
  });

  describe('7. Generic Query Handling', () => {
    it('não deve gerar queries com filtro de bairro para consultas genéricas', async () => {
      const analysisResult = createAnalysisResult({
        entities: { bairros: [] }, // Sem bairro específico
        intent: 'conceptual',
        isConstructionQuery: false
      });

      const result = await testSQLGenerator(
        'altura máxima em Porto Alegre',
        analysisResult
      );

      // Se gerar SQL, não deve ter filtro de bairro específico
      if (result.sqlQueries.length > 0) {
        const query = result.sqlQueries[0].query;
        expect(query).not.toContain("row_data->>'Bairro' =");
      }
    }, TIMEOUT);
  });

  describe('8. SQL Injection Prevention', () => {
    it('deve rejeitar queries não-SELECT', async () => {
      const analysisResult = createAnalysisResult({});

      // Modificar internamente para tentar injeção (simulação)
      const result = await testSQLGenerator(
        'test',
        analysisResult
      );

      // Todas as queries devem começar com SELECT
      result.sqlQueries.forEach(sqlQuery => {
        expect(sqlQuery.query.trim().toUpperCase()).toMatch(/^SELECT/);
      });
    }, TIMEOUT);

    it('deve sanitizar entrada de bairros', async () => {
      const analysisResult = createAnalysisResult({
        entities: { bairros: ["'; DROP TABLE users; --"] }
      });

      const result = await testSQLGenerator(
        'test injection',
        analysisResult
      );

      // Não deve conter comandos SQL maliciosos
      result.sqlQueries.forEach(sqlQuery => {
        expect(sqlQuery.query).not.toContain('DROP');
        expect(sqlQuery.query).not.toContain('DELETE');
        expect(sqlQuery.query).not.toContain('INSERT');
        expect(sqlQuery.query).not.toContain('UPDATE');
      });
    }, TIMEOUT);
  });

  describe('9. Performance Tests', () => {
    it('deve gerar SQL com LIMIT apropriado', async () => {
      const analysisResult = createAnalysisResult({
        entities: { bairros: ['CENTRO'] },
        isConstructionQuery: true
      });

      const result = await testSQLGenerator(
        'todas as ZOTs do Centro',
        analysisResult
      );

      const query = result.sqlQueries[0].query;
      
      // Para consultas de listagem, deve incluir LIMIT ou ORDER BY
      if (query.toLowerCase().includes('select') && !query.toLowerCase().includes('count')) {
        const hasLimit = query.toLowerCase().includes('limit');
        const hasOrderBy = query.toLowerCase().includes('order by');
        
        expect(hasLimit || hasOrderBy).toBe(true);
      }
    }, TIMEOUT);
  });

  describe('10. Error Handling Tests', () => {
    it('deve lidar com datasets inexistentes', async () => {
      const analysisResult = createAnalysisResult({
        requiredDatasets: ['dataset-inexistente']
      });

      const result = await testSQLGenerator(
        'teste dataset inexistente',
        analysisResult
      );

      // Deve retornar erro ou fallback
      if (result.executionResults) {
        const hasError = result.executionResults.some(r => r.error);
        expect(hasError).toBe(true);
      }
    }, TIMEOUT);

    it('deve fornecer fallback quando falha parsing', async () => {
      const analysisResult = createAnalysisResult({
        entities: { bairros: ['TESTE_INEXISTENTE'] },
        isConstructionQuery: true
      });

      const result = await testSQLGenerator(
        'query complexa que pode falhar',
        analysisResult
      );

      // Deve sempre retornar pelo menos uma query (fallback)
      expect(result.sqlQueries).toBeDefined();
      expect(result.sqlQueries.length).toBeGreaterThan(0);
    }, TIMEOUT);
  });

  describe('11. Name Variations Tests', () => {
    it('deve lidar com variações de nomes de bairros', async () => {
      const variations = [
        { input: 'TRÊS FIGUEIRAS', variations: ['TRÊS FIGUEIRAS', 'TRES FIGUEIRAS'] },
        { input: 'CRISTAL', variations: ['CRISTAL'] }
      ];

      for (const { input, variations: expectedVariations } of variations) {
        const analysisResult = createAnalysisResult({
          entities: { bairros: [input] },
          isConstructionQuery: true
        });

        const result = await testSQLGenerator(
          `regime urbanístico ${input}`,
          analysisResult
        );

        const query = result.sqlQueries[0].query;
        
        // Deve incluir pelo menos uma variação do nome
        const hasVariation = expectedVariations.some(variation => 
          query.includes(variation)
        );
        expect(hasVariation).toBe(true);
      }
    }, TIMEOUT);
  });
});

// Função utilitária para validar estrutura SQL
export function validateSQLStructure(sqlQuery: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  // Verificações básicas
  if (!sqlQuery.trim().toUpperCase().startsWith('SELECT')) {
    errors.push('Query deve começar com SELECT');
  }
  
  if (!sqlQuery.includes('document_rows')) {
    errors.push('Query deve acessar tabela document_rows');
  }
  
  if (!sqlQuery.includes('dataset_id')) {
    errors.push('Query deve filtrar por dataset_id');
  }
  
  // Verificar injeção SQL básica
  const dangerousPatterns = ['DROP', 'DELETE', 'INSERT', 'UPDATE', '--', ';'];
  dangerousPatterns.forEach(pattern => {
    if (sqlQuery.toUpperCase().includes(pattern)) {
      errors.push(`Query contém padrão perigoso: ${pattern}`);
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

// Função para analisar performance de execução SQL
export function analyzeSQLPerformance(executionResults: any[]): {
  totalQueries: number;
  successfulQueries: number;
  averageRows: number;
  hasErrors: boolean;
} {
  const totalQueries = executionResults.length;
  const successfulQueries = executionResults.filter(r => !r.error && r.data).length;
  const totalRows = executionResults
    .filter(r => r.data)
    .reduce((sum, r) => sum + (r.data?.length || 0), 0);
  const averageRows = successfulQueries > 0 ? totalRows / successfulQueries : 0;
  const hasErrors = executionResults.some(r => r.error);

  return {
    totalQueries,
    successfulQueries,
    averageRows,
    hasErrors
  };
}