import { describe, it, expect, beforeAll } from '@jest/globals';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const TIMEOUT = 25000;

interface SynthesisResult {
  response: string;
  confidence: number;
  sources: {
    tabular: number;
    conceptual: number;
  };
  analysisResult?: any;
}

describe('Response Synthesizer Tests', () => {
  async function testResponseSynthesizer(
    originalQuery: string,
    analysisResult: any,
    sqlResults?: any,
    vectorResults?: any
  ): Promise<SynthesisResult> {
    const { data, error } = await supabase.functions.invoke('response-synthesizer', {
      body: {
        originalQuery,
        analysisResult,
        sqlResults,
        vectorResults,
        userRole: 'citizen'
      }
    });

    if (error) {
      throw new Error(`Response synthesizer error: ${error.message}`);
    }

    return data;
  }

  // Mock data generators
  const createMockAnalysisResult = (overrides: any = {}) => ({
    intent: 'tabular',
    entities: { bairros: [], zots: [], parametros: [] },
    requiredDatasets: ['17_GMWnJC1sKff-YS0wesgxsvo3tnZdgSSb4JZ0ZjpCk'],
    confidence: 0.9,
    strategy: 'structured_only',
    isConstructionQuery: false,
    ...overrides
  });

  const createMockSQLResults = (data: any[] = []) => ({
    executionResults: [{
      purpose: 'Consulta de regime urbanístico',
      data,
      dataset_id: '17_GMWnJC1sKff-YS0wesgxsvo3tnZdgSSb4JZ0ZjpCk'
    }]
  });

  const createMockVectorResults = (matches: any[] = []) => ({
    matches: matches.map(content => ({ content, score: 0.8 }))
  });

  describe('1. Construction Response Formatting', () => {
    it('deve formatar resposta de construção com tabela obrigatória', async () => {
      const analysisResult = createMockAnalysisResult({
        entities: { bairros: ['PETRÓPOLIS'] },
        isConstructionQuery: true
      });

      const sqlData = [
        {
          'Zona': 'ZOT 07',
          'Altura Máxima - Edificação Isolada': '60',
          'Coeficiente de Aproveitamento - Básico': '2.5',
          'Coeficiente de Aproveitamento - Máximo': '4.0',
          'Bairro': 'PETRÓPOLIS'
        }
      ];

      const sqlResults = createMockSQLResults(sqlData);

      const result = await testResponseSynthesizer(
        'o que posso construir no Petrópolis',
        analysisResult,
        sqlResults
      );

      expect(result.response).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0.7);

      // Deve conter tabela markdown
      expect(result.response).toMatch(/\|.*\|/);
      expect(result.response).toContain('ZOT 07');
      expect(result.response).toContain('60');
      expect(result.response).toContain('2.5');
      expect(result.response).toContain('4.0');

      // Deve conter headers obrigatórios
      expect(result.response).toMatch(/ZOT|Zona/);
      expect(result.response).toMatch(/Altura.*Máxima?/);
      expect(result.response).toMatch(/Coef.*Básico/);
      expect(result.response).toMatch(/Coef.*Máximo/);
    }, TIMEOUT);

    it('deve usar valores reais dos dados SQL (nunca inventar)', async () => {
      const analysisResult = createMockAnalysisResult({
        entities: { bairros: ['CRISTAL'] },
        isConstructionQuery: true
      });

      const sqlData = [
        {
          'Zona': 'ZOT 08',
          'Altura Máxima - Edificação Isolada': '75',
          'Coeficiente de Aproveitamento - Básico': '3.6',
          'Coeficiente de Aproveitamento - Máximo': '7.5',
          'Bairro': 'CRISTAL'
        }
      ];

      const sqlResults = createMockSQLResults(sqlData);

      const result = await testResponseSynthesizer(
        'regime urbanístico do Cristal',
        analysisResult,
        sqlResults
      );

      // Deve usar valores exatos dos dados
      expect(result.response).toContain('75');
      expect(result.response).toContain('3.6');
      expect(result.response).toContain('7.5');

      // NUNCA deve conter valores inventados comuns
      expect(result.response).not.toContain('1.0');
      expect(result.response).not.toContain('X.X');
      expect(result.response).not.toContain('N/A');
    }, TIMEOUT);

    it('deve lidar com ZOTs com subdivisões', async () => {
      const analysisResult = createMockAnalysisResult({
        entities: { bairros: ['TRÊS FIGUEIRAS'], zots: ['ZOT 08.3'] },
        isConstructionQuery: true,
        processingStrategy: 'comprehensive_subdivision_query'
      });

      const sqlData = [
        {
          'Zona': 'ZOT 08.3-A',
          'Altura Máxima - Edificação Isolada': '130',
          'Coeficiente de Aproveitamento - Básico': '3.6',
          'Coeficiente de Aproveitamento - Máximo': '7.5',
          'Bairro': 'TRÊS FIGUEIRAS'
        },
        {
          'Zona': 'ZOT 08.3-B',
          'Altura Máxima - Edificação Isolada': '90',
          'Coeficiente de Aproveitamento - Básico': '3.6',
          'Coeficiente de Aproveitamento - Máximo': '7.5',
          'Bairro': 'TRÊS FIGUEIRAS'
        },
        {
          'Zona': 'ZOT 08.3-C',
          'Altura Máxima - Edificação Isolada': '90',
          'Coeficiente de Aproveitamento - Básico': '3.6',
          'Coeficiente de Aproveitamento - Máximo': '7.5',
          'Bairro': 'TRÊS FIGUEIRAS'
        }
      ];

      const sqlResults = createMockSQLResults(sqlData);

      const result = await testResponseSynthesizer(
        'ZOT 08.3 do Três Figueiras',
        analysisResult,
        sqlResults
      );

      // Deve mostrar TODAS as subdivisões
      expect(result.response).toContain('08.3-A');
      expect(result.response).toContain('08.3-B');
      expect(result.response).toContain('08.3-C');

      // Deve destacar diferenças
      expect(result.response).toContain('130'); // Altura da subdivisão A
      expect(result.response).toContain('90');  // Altura das subdivisões B e C

      // Deve explicar as subdivisões
      expect(result.response.toLowerCase()).toContain('subdivisõ');
    }, TIMEOUT);
  });

  describe('2. Data Accuracy Validation', () => {
    it('deve validar que dados são do bairro correto', async () => {
      const analysisResult = createMockAnalysisResult({
        entities: { bairros: ['BOA VISTA'] },
        isConstructionQuery: true
      });

      // Dados corretos (Boa Vista)
      const correctData = [
        {
          'Zona': 'ZOT 04',
          'Altura Máxima - Edificação Isolada': '30',
          'Coeficiente de Aproveitamento - Básico': '1.8',
          'Coeficiente de Aproveitamento - Máximo': '3.0',
          'Bairro': 'BOA VISTA'
        }
      ];

      const sqlResults = createMockSQLResults(correctData);

      const result = await testResponseSynthesizer(
        'regime urbanístico da Boa Vista',
        analysisResult,
        sqlResults
      );

      expect(result.response).toContain('BOA VISTA');
      expect(result.response).toContain('ZOT 04');
      
      // Não deve mencionar Boa Vista do Sul
      expect(result.response).not.toContain('BOA VISTA DO SUL');
    }, TIMEOUT);

    it('não deve misturar dados de bairros similares', async () => {
      const analysisResult = createMockAnalysisResult({
        entities: { bairros: ['BOA VISTA'] },
        isConstructionQuery: true
      });

      // Dados misturados (erro comum)
      const mixedData = [
        {
          'Zona': 'ZOT 04',
          'Bairro': 'BOA VISTA'
        },
        {
          'Zona': 'ZOT 05',
          'Bairro': 'BOA VISTA DO SUL' // Bairro errado
        }
      ];

      const sqlResults = createMockSQLResults(mixedData);

      const result = await testResponseSynthesizer(
        'ZOTs da Boa Vista',
        analysisResult,
        sqlResults
      );

      // Sistema deve filtrar ou alertar sobre contaminação
      // Se mostrar dados, devem ser apenas da Boa Vista
      if (result.response.includes('ZOT')) {
        expect(result.response).not.toContain('BOA VISTA DO SUL');
      }
    }, TIMEOUT);
  });

  describe('3. Response Format Validation', () => {
    it('deve incluir links oficiais obrigatórios', async () => {
      const analysisResult = createMockAnalysisResult({
        intent: 'conceptual'
      });

      const vectorResults = createMockVectorResults([
        'O Plano Diretor de Porto Alegre tem como objetivo...'
      ]);

      const result = await testResponseSynthesizer(
        'objetivos do plano diretor',
        analysisResult,
        undefined,
        vectorResults
      );

      // Deve incluir todos os links obrigatórios
      expect(result.response).toContain('bit.ly/3ILdXRA');
      expect(result.response).toContain('bit.ly/4oefZKm');
      expect(result.response).toContain('bit.ly/4o7AWqb');
      expect(result.response).toContain('planodiretor@portoalegre.rs.gov.br');
      
      // Deve incluir textos específicos
      expect(result.response).toContain('Explore mais');
      expect(result.response).toContain('Dúvidas?');
      expect(result.response).toContain('Sua pergunta é importante!');
    }, TIMEOUT);

    it('deve usar formatação markdown adequada', async () => {
      const analysisResult = createMockAnalysisResult({
        entities: { bairros: ['CENTRO'] },
        isConstructionQuery: true
      });

      const sqlData = [
        {
          'Zona': 'ZOT 01',
          'Altura Máxima - Edificação Isolada': '45',
          'Bairro': 'CENTRO'
        }
      ];

      const sqlResults = createMockSQLResults(sqlData);

      const result = await testResponseSynthesizer(
        'altura no Centro',
        analysisResult,
        sqlResults
      );

      // Deve usar formatação markdown
      expect(result.response).toMatch(/#+\s/); // Headers
      expect(result.response).toMatch(/\*\*.*\*\*/); // Bold text
      expect(result.response).toMatch(/\|.*\|/); // Tables
    }, TIMEOUT);
  });

  describe('4. Street Query Handling', () => {
    it('deve pedir esclarecimento para queries de endereço', async () => {
      const analysisResult = createMockAnalysisResult({
        needsClarification: true,
        clarificationMessage: 'Para informações precisas sobre construção, por favor informe o bairro onde está localizado o endereço.'
      });

      const result = await testResponseSynthesizer(
        'Rua da Praia, 123',
        analysisResult
      );

      expect(result.response).toContain('bairro');
      expect(result.response).toContain('preciso saber');
      expect(result.response).toContain('informe');
      
      // Não deve tentar responder sobre parâmetros específicos
      expect(result.response).not.toContain('altura máxima');
      expect(result.response).not.toContain('coeficiente');
    }, TIMEOUT);
  });

  describe('5. Generic Query Handling', () => {
    it('deve responder genericamente para consultas de Porto Alegre', async () => {
      const analysisResult = createMockAnalysisResult({
        entities: { bairros: [] }, // Sem bairro específico
        intent: 'conceptual',
        isConstructionQuery: false
      });

      const result = await testResponseSynthesizer(
        'altura máxima em Porto Alegre',
        analysisResult
      );

      expect(result.response.toLowerCase()).toContain('varia');
      expect(result.response.toLowerCase()).toContain('zot');
      expect(result.response.toLowerCase()).toContain('bairro');
      
      // Não deve dar exemplos específicos de um bairro
      const specificNeighborhoods = ['PETRÓPOLIS', 'CENTRO', 'CRISTAL'];
      specificNeighborhoods.forEach(neighborhood => {
        expect(result.response).not.toContain(neighborhood);
      });
    }, TIMEOUT);

    it('deve sugerir especificar bairro para consultas genéricas', async () => {
      const analysisResult = createMockAnalysisResult({
        entities: { bairros: [] },
        intent: 'conceptual'
      });

      const result = await testResponseSynthesizer(
        'coeficiente de aproveitamento',
        analysisResult
      );

      expect(result.response.toLowerCase()).toContain('informe o bairro');
      expect(result.response.toLowerCase()).toContain('mapa interativo');
    }, TIMEOUT);
  });

  describe('6. Confidence Scoring', () => {
    it('deve retornar alta confiança com dados completos', async () => {
      const analysisResult = createMockAnalysisResult({
        entities: { bairros: ['PETRÓPOLIS'] },
        isConstructionQuery: true,
        confidence: 0.9
      });

      const sqlData = [
        {
          'Zona': 'ZOT 07',
          'Altura Máxima - Edificação Isolada': '60',
          'Coeficiente de Aproveitamento - Básico': '2.5',
          'Coeficiente de Aproveitamento - Máximo': '4.0',
          'Bairro': 'PETRÓPOLIS'
        }
      ];

      const sqlResults = createMockSQLResults(sqlData);

      const result = await testResponseSynthesizer(
        'regime urbanístico do Petrópolis',
        analysisResult,
        sqlResults
      );

      expect(result.confidence).toBeGreaterThanOrEqual(0.8);
    }, TIMEOUT);

    it('deve reduzir confiança com dados incompletos', async () => {
      const analysisResult = createMockAnalysisResult({
        entities: { bairros: ['BAIRRO_INEXISTENTE'] },
        isConstructionQuery: true,
        confidence: 0.7
      });

      const sqlResults = createMockSQLResults([]); // Sem dados

      const result = await testResponseSynthesizer(
        'dados do bairro inexistente',
        analysisResult,
        sqlResults
      );

      expect(result.confidence).toBeLessThan(0.7);
    }, TIMEOUT);
  });

  describe('7. Beta Message Handling', () => {
    it('não deve usar mensagem beta quando há dados válidos', async () => {
      const analysisResult = createMockAnalysisResult({
        entities: { bairros: ['CENTRO'] },
        isConstructionQuery: true
      });

      const sqlData = [
        {
          'Zona': 'ZOT 01',
          'Altura Máxima - Edificação Isolada': '45',
          'Bairro': 'CENTRO'
        }
      ];

      const sqlResults = createMockSQLResults(sqlData);

      const result = await testResponseSynthesizer(
        'altura no Centro',
        analysisResult,
        sqlResults
      );

      expect(result.response.toLowerCase()).not.toContain('versão beta');
      expect(result.response.toLowerCase()).not.toContain('não consigo responder');
    }, TIMEOUT);

    it('deve apresentar dados parciais ao invés de mensagem beta', async () => {
      const analysisResult = createMockAnalysisResult({
        entities: { bairros: ['CENTRO'] },
        isConstructionQuery: true
      });

      const partialData = [
        {
          'Zona': 'ZOT 01',
          'Altura Máxima - Edificação Isolada': '45',
          // Faltam outros campos
          'Bairro': 'CENTRO'
        }
      ];

      const sqlResults = createMockSQLResults(partialData);

      const result = await testResponseSynthesizer(
        'parâmetros do Centro',
        analysisResult,
        sqlResults
      );

      // Deve mostrar dados disponíveis, não mensagem beta
      expect(result.response).toContain('45');
      expect(result.response).toContain('ZOT 01');
      expect(result.response.toLowerCase()).not.toContain('versão beta');
    }, TIMEOUT);
  });

  describe('8. Specific Values Handling', () => {
    it('deve usar valores calculados quando disponíveis', async () => {
      const analysisResult = createMockAnalysisResult({
        entities: { bairros: ['CRISTAL'], parametros: ['índice médio'] },
        isConstructionQuery: true
      });

      const sqlData = [
        {
          'indice_medio': '3.3125', // Valor pré-calculado
          'bairro': 'CRISTAL'
        }
      ];

      const sqlResults = createMockSQLResults(sqlData);

      const result = await testResponseSynthesizer(
        'índice de aproveitamento médio do Cristal',
        analysisResult,
        sqlResults
      );

      // Deve usar valor exato calculado
      expect(result.response).toContain('3,3125');
      expect(result.response.toLowerCase()).not.toContain('versão beta');
    }, TIMEOUT);
  });

  describe('9. Error Handling', () => {
    it('deve lidar com dados SQL inválidos', async () => {
      const analysisResult = createMockAnalysisResult({
        entities: { bairros: ['TESTE'] },
        isConstructionQuery: true
      });

      const invalidSqlResults = {
        executionResults: [{
          purpose: 'Teste',
          error: 'SQL execution failed',
          data: null
        }]
      };

      const result = await testResponseSynthesizer(
        'teste erro SQL',
        analysisResult,
        invalidSqlResults
      );

      expect(result.response).toBeDefined();
      expect(result.confidence).toBeLessThan(0.5);
    }, TIMEOUT);

    it('deve fornecer fallback para dados corrompidos', async () => {
      const analysisResult = createMockAnalysisResult({
        entities: { bairros: ['TESTE'] },
        isConstructionQuery: true
      });

      const corruptedData = [
        {
          'campo_inexistente': 'valor',
          'dados_corrompidos': null
        }
      ];

      const sqlResults = createMockSQLResults(corruptedData);

      const result = await testResponseSynthesizer(
        'teste dados corrompidos',
        analysisResult,
        sqlResults
      );

      expect(result.response).toBeDefined();
      expect(result.response.length).toBeGreaterThan(100); // Resposta substancial
      expect(result.response).toContain('bit.ly'); // Links oficiais
    }, TIMEOUT);
  });

  describe('10. Language and Tone', () => {
    it('deve responder em português brasileiro', async () => {
      const analysisResult = createMockAnalysisResult({
        intent: 'conceptual'
      });

      const vectorResults = createMockVectorResults([
        'O Plano Diretor visa o desenvolvimento sustentável'
      ]);

      const result = await testResponseSynthesizer(
        'sustentabilidade urbana',
        analysisResult,
        undefined,
        vectorResults
      );

      // Verificar termos em português brasileiro
      const portugueseTerms = ['sustentável', 'desenvolvimento', 'urbano', 'cidade'];
      const foundTerms = portugueseTerms.filter(term => 
        result.response.toLowerCase().includes(term)
      );
      
      expect(foundTerms.length).toBeGreaterThanOrEqual(2);
    }, TIMEOUT);

    it('deve manter tom institucional e profissional', async () => {
      const analysisResult = createMockAnalysisResult({
        intent: 'conceptual'
      });

      const result = await testResponseSynthesizer(
        'informações sobre o plano',
        analysisResult
      );

      // Não deve usar linguagem muito informal
      expect(result.response).not.toMatch(/\b(cara|mano|galera)\b/i);
      
      // Deve ser respeitoso e profissional
      expect(result.response.toLowerCase()).not.toContain('não sei');
      expect(result.response.toLowerCase()).not.toContain('não faço ideia');
    }, TIMEOUT);
  });
});

// Função utilitária para validar formato de resposta
export function validateResponseFormat(response: string): {
  isValid: boolean;
  checks: {
    hasOfficialLinks: boolean;
    hasMarkdownFormatting: boolean;
    hasProperStructure: boolean;
    isInPortuguese: boolean;
  };
} {
  const checks = {
    hasOfficialLinks: response.includes('bit.ly/3ILdXRA') && 
                     response.includes('planodiretor@portoalegre.rs.gov.br'),
    hasMarkdownFormatting: /#+\s/.test(response) || /\*\*.*\*\*/.test(response),
    hasProperStructure: response.length > 50 && response.includes('\n'),
    isInPortuguese: /\b(o|a|de|do|da|em|para|com|que|é|são)\b/.test(response.toLowerCase())
  };

  return {
    isValid: Object.values(checks).every(check => check),
    checks
  };
}

// Função para extrair métricas de qualidade
export function extractQualityMetrics(response: string): {
  hasTable: boolean;
  hasValidData: boolean;
  wordCount: number;
  hasBetaMessage: boolean;
  confidence: 'high' | 'medium' | 'low';
} {
  const hasTable = /\|.*\|/.test(response);
  const hasValidData = !response.includes('X.X') && 
                      !response.toLowerCase().includes('não consigo');
  const wordCount = response.split(/\s+/).length;
  const hasBetaMessage = response.toLowerCase().includes('versão beta');
  
  let confidence: 'high' | 'medium' | 'low' = 'low';
  if (hasValidData && hasTable && wordCount > 100) {
    confidence = 'high';
  } else if (hasValidData && wordCount > 50) {
    confidence = 'medium';
  }

  return {
    hasTable,
    hasValidData,
    wordCount,
    hasBetaMessage,
    confidence
  };
}