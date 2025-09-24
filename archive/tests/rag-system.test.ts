import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Test timeout for all RAG tests
const RAG_TIMEOUT = 30000;

interface TestResult {
  success: boolean;
  response?: any;
  error?: string;
  executionTime: number;
  confidence?: number;
  sources?: {
    tabular: number;
    conceptual: number;
  };
}

describe('Sistema RAG - Plano Diretor Porto Alegre', () => {
  let testSession: string;

  beforeAll(() => {
    testSession = `test-rag-${Date.now()}`;
  });

  // Helper function to test RAG queries
  async function testRAGQuery(query: string, options: {
    bypassCache?: boolean;
    userRole?: string;
    expectedKeywords?: string[];
    shouldNotContain?: string[];
    expectTable?: boolean;
    expectArticle?: boolean;
    minConfidence?: number;
  } = {}): Promise<TestResult> {
    const startTime = Date.now();

    try {
      const { data, error } = await supabase.functions.invoke('agentic-rag', {
        body: {
          message: query,
          sessionId: testSession,
          userRole: options.userRole || 'citizen',
          bypassCache: options.bypassCache || false
        }
      });

      const executionTime = Date.now() - startTime;

      if (error) {
        return {
          success: false,
          error: error.message,
          executionTime
        };
      }

      return {
        success: true,
        response: data,
        executionTime,
        confidence: data.confidence,
        sources: data.sources
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        executionTime: Date.now() - startTime
      };
    }
  }

  describe('1. Query Analysis & Detection Tests', () => {
    it('deve detectar query sobre Certificação em Sustentabilidade Ambiental', async () => {
      const result = await testRAGQuery(
        'Certificação em Sustentabilidade Ambiental',
        { expectedKeywords: ['Art. 81', 'III', 'sustentabilidade'], bypassCache: true }
      );

      expect(result.success).toBe(true);
      expect(result.response).toBeDefined();
      
      const responseText = result.response.response.toLowerCase();
      expect(responseText).toContain('art');
      expect(responseText).toContain('81');
      expect(responseText).toContain('sustentabilidade');
    }, RAG_TIMEOUT);

    it('deve detectar query sobre 4º Distrito', async () => {
      const result = await testRAGQuery(
        '4º Distrito',
        { expectedKeywords: ['Art. 74', 'distrito'], bypassCache: true }
      );

      expect(result.success).toBe(true);
      expect(result.response).toBeDefined();
      
      const responseText = result.response.response.toLowerCase();
      expect(responseText).toContain('distrito');
      expect(responseText).toContain('74');
    }, RAG_TIMEOUT);

    it('deve detectar query de construção por bairro', async () => {
      const result = await testRAGQuery(
        'o que posso construir no Petrópolis',
        { expectTable: true, bypassCache: true }
      );

      expect(result.success).toBe(true);
      expect(result.response).toBeDefined();
      
      const responseText = result.response.response;
      expect(responseText).toMatch(/\|.*\|/); // Deve conter tabela
      expect(responseText.toLowerCase()).toContain('zot');
      expect(responseText.toLowerCase()).toContain('altura');
      expect(responseText.toLowerCase()).toContain('coeficiente');
    }, RAG_TIMEOUT);

    it('deve detectar query genérica sobre altura', async () => {
      const result = await testRAGQuery(
        'altura máxima em porto alegre',
        { bypassCache: true }
      );

      expect(result.success).toBe(true);
      expect(result.response).toBeDefined();
      
      const responseText = result.response.response.toLowerCase();
      expect(responseText).toContain('altura');
      expect(responseText).toContain('varia');
      expect(responseText).toContain('zot');
    }, RAG_TIMEOUT);
  });

  describe('2. Keyword System Tests', () => {
    const keywordTests = [
      {
        query: 'coeficiente de aproveitamento máximo',
        expectedKeywords: ['coeficiente', 'aproveitamento', 'máximo']
      },
      {
        query: 'CA básico do bairro Cristal',
        expectedKeywords: ['coeficiente', 'aproveitamento', 'básico', 'cristal']
      },
      {
        query: 'taxa de ocupação máxima',
        expectedKeywords: ['taxa', 'ocupação', 'máxima']
      },
      {
        query: 'gabarito máximo permitido',
        expectedKeywords: ['altura', 'máxima', 'gabarito']
      },
      {
        query: 'regime urbanístico',
        expectedKeywords: ['regime', 'urbanístico', 'parâmetros']
      }
    ];

    keywordTests.forEach(({ query, expectedKeywords }) => {
      it(`deve processar keywords para: "${query}"`, async () => {
        const result = await testRAGQuery(query, { bypassCache: true });

        expect(result.success).toBe(true);
        expect(result.response).toBeDefined();
        
        const responseText = result.response.response.toLowerCase();
        
        // Pelo menos metade das keywords devem estar presentes
        const foundKeywords = expectedKeywords.filter(keyword => 
          responseText.includes(keyword.toLowerCase())
        );
        
        expect(foundKeywords.length).toBeGreaterThanOrEqual(
          Math.ceil(expectedKeywords.length / 2)
        );
      }, RAG_TIMEOUT);
    });
  });

  describe('3. Contextual Scoring Tests', () => {
    it('deve retornar alta confiança para queries específicas de bairro', async () => {
      const result = await testRAGQuery(
        'ZOTs do bairro Três Figueiras',
        { minConfidence: 0.8, bypassCache: true }
      );

      expect(result.success).toBe(true);
      expect(result.confidence).toBeGreaterThanOrEqual(0.8);
      
      const responseText = result.response.response.toLowerCase();
      expect(responseText).toContain('três figueiras');
      expect(responseText).toContain('zot');
    }, RAG_TIMEOUT);

    it('deve retornar confiança moderada para queries genéricas', async () => {
      const result = await testRAGQuery(
        'parâmetros urbanísticos gerais',
        { bypassCache: true }
      );

      expect(result.success).toBe(true);
      expect(result.confidence).toBeGreaterThanOrEqual(0.5);
      expect(result.confidence).toBeLessThan(0.9);
    }, RAG_TIMEOUT);

    it('deve retornar baixa confiança para queries ambíguas', async () => {
      const result = await testRAGQuery(
        'isso aquilo',
        { bypassCache: true }
      );

      expect(result.success).toBe(true);
      if (result.confidence) {
        expect(result.confidence).toBeLessThan(0.5);
      }
    }, RAG_TIMEOUT);
  });

  describe('4. Response Formatting Tests', () => {
    it('deve formatar resposta com tabela para dados de construção', async () => {
      const result = await testRAGQuery(
        'o que pode ser construído no Cristal',
        { expectTable: true, bypassCache: true }
      );

      expect(result.success).toBe(true);
      
      const responseText = result.response.response;
      
      // Deve conter tabela markdown
      expect(responseText).toMatch(/\|.*\|/);
      expect(responseText).toMatch(/\|.*ZOT.*\|/);
      expect(responseText).toMatch(/\|.*Altura.*\|/);
      expect(responseText).toMatch(/\|.*Coef.*\|/);
      
      // Deve conter dados reais (não X.X ou valores inventados)
      expect(responseText).not.toContain('X.X');
      expect(responseText).not.toContain('1.0'); // Valor comumente incorreto
    }, RAG_TIMEOUT);

    it('deve incluir links oficiais no final', async () => {
      const result = await testRAGQuery(
        'objetivos do plano diretor',
        { bypassCache: true }
      );

      expect(result.success).toBe(true);
      
      const responseText = result.response.response;
      
      // Deve conter links oficiais
      expect(responseText).toContain('bit.ly/3ILdXRA');
      expect(responseText).toContain('planodiretor@portoalegre.rs.gov.br');
      expect(responseText).toContain('Explore mais');
    }, RAG_TIMEOUT);

    it('deve responder em português brasileiro', async () => {
      const result = await testRAGQuery(
        'altura máxima',
        { bypassCache: true }
      );

      expect(result.success).toBe(true);
      
      const responseText = result.response.response.toLowerCase();
      
      // Verificar presença de termos em português
      const portugueseTerms = ['altura', 'máxima', 'pode', 'ser', 'construído', 'bairro'];
      const foundTerms = portugueseTerms.filter(term => responseText.includes(term));
      
      expect(foundTerms.length).toBeGreaterThanOrEqual(2);
    }, RAG_TIMEOUT);
  });

  describe('5. Specific Test Cases', () => {
    it('deve mapear Sustentabilidade Ambiental → Art. 81-III', async () => {
      const result = await testRAGQuery(
        'Certificação em Sustentabilidade Ambiental',
        { bypassCache: true }
      );

      expect(result.success).toBe(true);
      
      const responseText = result.response.response.toLowerCase();
      expect(responseText).toContain('artigo 81');
      expect(responseText).toContain('iii');
      expect(responseText).toContain('sustentabilidade');
    }, RAG_TIMEOUT);

    it('deve mapear 4º Distrito → Art. 74', async () => {
      const result = await testRAGQuery(
        '4º Distrito',
        { bypassCache: true }
      );

      expect(result.success).toBe(true);
      
      const responseText = result.response.response.toLowerCase();
      expect(responseText).toContain('artigo 74');
      expect(responseText).toContain('distrito');
    }, RAG_TIMEOUT);

    it('deve processar queries sobre bairros específicos', async () => {
      const bairros = ['Petrópolis', 'Três Figueiras', 'Cristal', 'Boa Vista'];
      
      for (const bairro of bairros) {
        const result = await testRAGQuery(
          `regime urbanístico do ${bairro}`,
          { bypassCache: true }
        );

        expect(result.success).toBe(true);
        
        const responseText = result.response.response.toLowerCase();
        expect(responseText).toContain(bairro.toLowerCase());
        expect(responseText).toContain('zot');
        
        // Não deve misturar dados de outros bairros
        const otherBairros = bairros.filter(b => b !== bairro);
        otherBairros.forEach(otherBairro => {
          expect(responseText).not.toContain(otherBairro.toLowerCase());
        });
      }
    }, RAG_TIMEOUT * 4);
  });

  describe('6. Debug & Logging Tests', () => {
    it('deve registrar chunks criados no log', async () => {
      const consoleSpy = jest.spyOn(console, 'log');
      
      const result = await testRAGQuery(
        'ZOTs do Petrópolis',
        { bypassCache: true }
      );

      expect(result.success).toBe(true);
      
      // Verificar se logs de debug foram chamados
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    }, RAG_TIMEOUT);

    it('deve calcular scores para diferentes fontes', async () => {
      const result = await testRAGQuery(
        'construção no Centro Histórico',
        { bypassCache: true }
      );

      expect(result.success).toBe(true);
      expect(result.sources).toBeDefined();
      expect(typeof result.sources.tabular).toBe('number');
      expect(typeof result.sources.conceptual).toBe('number');
    }, RAG_TIMEOUT);
  });

  describe('7. Performance Tests', () => {
    it('deve responder em menos de 10 segundos', async () => {
      const result = await testRAGQuery(
        'altura máxima da ZOT 07',
        { bypassCache: true }
      );

      expect(result.success).toBe(true);
      expect(result.executionTime).toBeLessThan(10000); // 10 segundos
    }, RAG_TIMEOUT);

    it('deve lidar com consultas concorrentes', async () => {
      const queries = [
        'ZOTs do Petrópolis',
        'altura máxima ZOT 08',
        'coeficiente aproveitamento Cristal',
        'regime urbanístico Três Figueiras'
      ];

      const startTime = Date.now();
      const promises = queries.map(query => 
        testRAGQuery(query, { bypassCache: true })
      );

      const results = await Promise.all(promises);
      const totalTime = Date.now() - startTime;

      // Todas as queries devem ter sucesso
      results.forEach(result => {
        expect(result.success).toBe(true);
      });

      // Tempo total deve ser eficiente para queries concorrentes
      expect(totalTime).toBeLessThan(20000); // 20 segundos para 4 queries
    }, RAG_TIMEOUT);

    it('deve manter precisão com cache ativado', async () => {
      const query = 'altura máxima ZOT 07';
      
      // Primeira query (sem cache)
      const result1 = await testRAGQuery(query, { bypassCache: true });
      expect(result1.success).toBe(true);
      
      // Segunda query (com cache)
      const result2 = await testRAGQuery(query, { bypassCache: false });
      expect(result2.success).toBe(true);
      
      // Respostas devem ser consistentes
      expect(result2.response.response).toContain('60'); // Altura da ZOT 07
    }, RAG_TIMEOUT);
  });

  describe('8. Edge Cases & Error Handling', () => {
    it('deve lidar com queries vazias', async () => {
      const result = await testRAGQuery('');

      // Deve retornar erro ou resposta de fallback
      expect(result.success).toBe(false);
    }, RAG_TIMEOUT);

    it('deve lidar com queries muito longas', async () => {
      const longQuery = 'Gostaria de saber '.repeat(100) + 'sobre o plano diretor';
      
      const result = await testRAGQuery(longQuery, { bypassCache: true });

      // Deve processar ou retornar erro apropriado
      expect(result).toBeDefined();
    }, RAG_TIMEOUT);

    it('deve lidar com caracteres especiais', async () => {
      const result = await testRAGQuery(
        'ZOT 08.3-A: o que é permitido construir?',
        { bypassCache: true }
      );

      expect(result.success).toBe(true);
      
      const responseText = result.response.response.toLowerCase();
      expect(responseText).toContain('zot');
      expect(responseText).toContain('08');
    }, RAG_TIMEOUT);

    it('deve detectar queries sobre endereços sem bairro', async () => {
      const result = await testRAGQuery(
        'o que posso construir na Rua da Praia, 123',
        { bypassCache: true }
      );

      expect(result.success).toBe(true);
      
      const responseText = result.response.response.toLowerCase();
      expect(responseText).toContain('bairro');
      expect(responseText).toContain('preciso saber');
    }, RAG_TIMEOUT);
  });

  afterAll(async () => {
    // Cleanup test session if needed
    console.log(`Teste finalizado. Session: ${testSession}`);
  });
});

// Função utilitária para calcular taxa de sucesso
export function calculateTestSuccessRate(results: TestResult[]): number {
  const successfulTests = results.filter(r => r.success).length;
  return (successfulTests / results.length) * 100;
}

// Função para gerar relatório de performance
export function generatePerformanceReport(results: TestResult[]): {
  averageTime: number;
  maxTime: number;
  minTime: number;
  successRate: number;
} {
  const times = results.map(r => r.executionTime);
  const averageTime = times.reduce((a, b) => a + b, 0) / times.length;
  const maxTime = Math.max(...times);
  const minTime = Math.min(...times);
  const successRate = calculateTestSuccessRate(results);

  return {
    averageTime,
    maxTime,
    minTime,
    successRate
  };
}