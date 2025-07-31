import { describe, it, expect, beforeAll } from '@jest/globals';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const TIMEOUT = 15000;

interface QueryAnalysisResult {
  intent: 'conceptual' | 'tabular' | 'hybrid' | 'predefined_objectives';
  entities: {
    zots?: string[];
    bairros?: string[];
    parametros?: string[];
  };
  requiredDatasets: string[];
  confidence: number;
  strategy: 'structured_only' | 'unstructured_only' | 'hybrid' | 'predefined';
  isConstructionQuery?: boolean;
  needsClarification?: boolean;
  clarificationMessage?: string;
}

describe('Query Analyzer Tests', () => {
  async function testQueryAnalyzer(query: string): Promise<QueryAnalysisResult> {
    const { data, error } = await supabase.functions.invoke('query-analyzer', {
      body: {
        query,
        userRole: 'citizen',
        sessionId: `test-analyzer-${Date.now()}`
      }
    });

    if (error) {
      throw new Error(`Query analyzer error: ${error.message}`);
    }

    return data;
  }

  describe('1. Intent Classification Tests', () => {
    const intentTests = [
      {
        query: 'objetivos do plano diretor',
        expectedIntent: 'predefined_objectives',
        description: 'deve detectar perguntas sobre objetivos'
      },
      {
        query: 'o que posso construir no Petrópolis',
        expectedIntent: 'tabular',
        description: 'deve detectar consultas de construção como tabular'
      },
      {
        query: 'como o plano protege o meio ambiente',
        expectedIntent: 'conceptual',
        description: 'deve detectar consultas conceituais'
      },
      {
        query: 'altura máxima e coeficiente do Centro',
        expectedIntent: 'tabular',
        description: 'deve detectar consultas híbridas como tabular quando há bairro'
      }
    ];

    intentTests.forEach(({ query, expectedIntent, description }) => {
      it(description, async () => {
        const result = await testQueryAnalyzer(query);
        
        expect(result.intent).toBe(expectedIntent);
        expect(result.confidence).toBeGreaterThan(0.5);
      }, TIMEOUT);
    });
  });

  describe('2. Entity Extraction Tests', () => {
    it('deve extrair ZOTs corretamente', async () => {
      const queries = [
        { query: 'ZOT 07', expectedZots: ['ZOT 07'] },
        { query: 'zona de ordenamento 08.3', expectedZots: ['ZOT 08.3'] },
        { query: 'zot4 e zot7', expectedZots: ['ZOT 04', 'ZOT 07'] }
      ];

      for (const { query, expectedZots } of queries) {
        const result = await testQueryAnalyzer(query);
        
        expect(result.entities.zots).toBeDefined();
        expectedZots.forEach(zot => {
          expect(result.entities.zots).toContain(zot);
        });
      }
    }, TIMEOUT);

    it('deve extrair bairros corretamente', async () => {
      const queries = [
        { query: 'Petrópolis', expectedBairros: ['PETRÓPOLIS'] },
        { query: 'três figueiras', expectedBairros: ['TRÊS FIGUEIRAS'] },
        { query: 'boa vista', expectedBairros: ['BOA VISTA'] },
        { query: 'cristal', expectedBairros: ['CRISTAL'] }
      ];

      for (const { query, expectedBairros } of queries) {
        const result = await testQueryAnalyzer(query);
        
        expect(result.entities.bairros).toBeDefined();
        expectedBairros.forEach(bairro => {
          expect(result.entities.bairros).toContain(bairro);
        });
      }
    }, TIMEOUT);

    it('deve extrair parâmetros urbanísticos', async () => {
      const queries = [
        { 
          query: 'coeficiente de aproveitamento máximo', 
          expectedParams: ['coeficiente de aproveitamento'] 
        },
        { 
          query: 'altura máxima permitida', 
          expectedParams: ['altura máxima'] 
        },
        { 
          query: 'taxa de ocupação', 
          expectedParams: ['taxa de ocupação'] 
        }
      ];

      for (const { query, expectedParams } of queries) {
        const result = await testQueryAnalyzer(query);
        
        expect(result.entities.parametros).toBeDefined();
        expect(result.entities.parametros.length).toBeGreaterThan(0);
      }
    }, TIMEOUT);
  });

  describe('3. Construction Query Detection', () => {
    const constructionTests = [
      {
        query: 'o que posso construir no Petrópolis',
        shouldBeConstruction: true,
        description: 'deve detectar consulta direta de construção'
      },
      {
        query: 'altura máxima no Centro',
        shouldBeConstruction: true,
        description: 'deve detectar consulta sobre parâmetros construtivos'
      },
      {
        query: 'três figueiras',
        shouldBeConstruction: true,
        description: 'deve detectar query curta de bairro como construção'
      },
      {
        query: 'quantos bairros tem Porto Alegre',
        shouldBeConstruction: false,
        description: 'não deve detectar consulta de contagem como construção'
      },
      {
        query: 'objetivos do plano diretor',
        shouldBeConstruction: false,
        description: 'não deve detectar consulta conceitual como construção'
      }
    ];

    constructionTests.forEach(({ query, shouldBeConstruction, description }) => {
      it(description, async () => {
        const result = await testQueryAnalyzer(query);
        
        expect(result.isConstructionQuery).toBe(shouldBeConstruction);
        
        if (shouldBeConstruction) {
          // Consultas de construção devem solicitar dataset de regime urbanístico
          expect(result.requiredDatasets).toContain('17_GMWnJC1sKff-YS0wesgxsvo3tnZdgSSb4JZ0ZjpCk');
          expect(result.strategy).toBe('structured_only');
        }
      }, TIMEOUT);
    });
  });

  describe('4. Dataset Selection Tests', () => {
    it('deve solicitar dataset correto para consultas de construção', async () => {
      const result = await testQueryAnalyzer('regime urbanístico do Cristal');
      
      expect(result.requiredDatasets).toContain('17_GMWnJC1sKff-YS0wesgxsvo3tnZdgSSb4JZ0ZjpCk');
      expect(result.isConstructionQuery).toBe(true);
    }, TIMEOUT);

    it('deve solicitar dataset de ZOTs vs Bairros para consultas de contagem', async () => {
      const result = await testQueryAnalyzer('quantos bairros tem ZOT 8');
      
      expect(result.requiredDatasets).toContain('1FTENHpX4aLxmAoxvrEeGQn0fej-wxTMQRQs_XBjPQPY');
      expect(result.intent).toBe('tabular');
    }, TIMEOUT);

    it('deve solicitar múltiplos datasets para consultas híbridas', async () => {
      const result = await testQueryAnalyzer('altura máxima e conceitos do plano diretor');
      
      expect(result.requiredDatasets.length).toBeGreaterThan(0);
      expect(['hybrid', 'structured_only', 'unstructured_only']).toContain(result.strategy);
    }, TIMEOUT);
  });

  describe('5. Clarification Detection', () => {
    it('deve detectar necessidade de esclarecimento para endereços', async () => {
      const queries = [
        'Rua da Praia, 123',
        'Avenida Ipiranga sem número',
        'construir na Rua Voluntários da Pátria'
      ];

      for (const query of queries) {
        const result = await testQueryAnalyzer(query);
        
        expect(result.needsClarification).toBe(true);
        expect(result.clarificationMessage).toBeDefined();
        expect(result.clarificationMessage.toLowerCase()).toContain('bairro');
      }
    }, TIMEOUT);

    it('não deve pedir esclarecimento quando bairro está especificado', async () => {
      const result = await testQueryAnalyzer('Rua da Praia no Centro Histórico');
      
      expect(result.needsClarification).toBeFalsy();
    }, TIMEOUT);
  });

  describe('6. Porto Alegre Detection', () => {
    it('não deve incluir Porto Alegre como bairro', async () => {
      const queries = [
        'altura máxima em Porto Alegre',
        'coeficiente de aproveitamento de Porto Alegre',
        'o que posso construir em Porto Alegre'
      ];

      for (const query of queries) {
        const result = await testQueryAnalyzer(query);
        
        expect(result.entities.bairros).not.toContain('PORTO ALEGRE');
        expect(result.intent).toBe('conceptual');
        expect(result.isConstructionQuery).toBe(false);
      }
    }, TIMEOUT);
  });

  describe('7. Subdivision Handling', () => {
    it('deve detectar ZOTs com subdivisões', async () => {
      const result = await testQueryAnalyzer('ZOT 08.3 do Três Figueiras');
      
      expect(result.entities.zots).toBeDefined();
      expect(result.entities.zots.some(zot => zot.includes('08.3'))).toBe(true);
      
      // Deve ter informações sobre subdivisões
      if (result.processingStrategy) {
        expect(result.processingStrategy).toBe('comprehensive_subdivision_query');
      }
    }, TIMEOUT);
  });

  describe('8. Confidence Scoring', () => {
    it('deve retornar alta confiança para queries específicas', async () => {
      const result = await testQueryAnalyzer('altura máxima da ZOT 07');
      
      expect(result.confidence).toBeGreaterThanOrEqual(0.8);
    }, TIMEOUT);

    it('deve retornar confiança moderada para queries ambíguas', async () => {
      const result = await testQueryAnalyzer('informações sobre construção');
      
      expect(result.confidence).toBeGreaterThanOrEqual(0.4);
      expect(result.confidence).toBeLessThan(0.8);
    }, TIMEOUT);
  });

  describe('9. Synonym Recognition', () => {
    const synonymTests = [
      {
        terms: ['CA', 'coeficiente de aproveitamento', 'índice de aproveitamento'],
        description: 'deve reconhecer sinônimos de coeficiente de aproveitamento'
      },
      {
        terms: ['TO', 'taxa de ocupação', 'índice de ocupação'],
        description: 'deve reconhecer sinônimos de taxa de ocupação'
      },
      {
        terms: ['altura máxima', 'gabarito', 'limite de altura'],
        description: 'deve reconhecer sinônimos de altura máxima'
      }
    ];

    synonymTests.forEach(({ terms, description }) => {
      it(description, async () => {
        const results = await Promise.all(
          terms.map(term => testQueryAnalyzer(`${term} do Centro`))
        );

        // Todos os sinônimos devem ser classificados de forma similar
        const intents = results.map(r => r.intent);
        const isConstructions = results.map(r => r.isConstructionQuery);

        // Verificar consistência
        expect(new Set(intents).size).toBeLessThanOrEqual(2); // Máximo 2 intents diferentes
        expect(new Set(isConstructions).size).toBe(1); // Mesmo tipo de consulta
      }, TIMEOUT);
    });
  });

  describe('10. Error Handling', () => {
    it('deve lidar com queries vazias', async () => {
      try {
        const result = await testQueryAnalyzer('');
        // Se não der erro, deve retornar fallback
        expect(result).toBeDefined();
        expect(result.confidence).toBeLessThan(0.5);
      } catch (error) {
        // Erro é aceitável para query vazia
        expect(error).toBeDefined();
      }
    }, TIMEOUT);

    it('deve lidar com caracteres especiais', async () => {
      const result = await testQueryAnalyzer('ZOT 08.3-A: ???');
      
      expect(result).toBeDefined();
      expect(result.entities.zots).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
    }, TIMEOUT);
  });
});

// Função utilitária para validar estrutura do resultado
export function validateAnalysisResult(result: QueryAnalysisResult): boolean {
  const requiredFields = ['intent', 'entities', 'requiredDatasets', 'confidence', 'strategy'];
  
  return requiredFields.every(field => result.hasOwnProperty(field)) &&
         typeof result.confidence === 'number' &&
         result.confidence >= 0 &&
         result.confidence <= 1 &&
         Array.isArray(result.requiredDatasets);
}