import { describe, it, expect, beforeAll } from '@jest/globals';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Test cases from QA validation
const testCases = [
  {
    id: 'tc-001',
    category: 'construction',
    query: 'Liste todas as Zonas de Ordenamento Territorial (ZOTs) presentes no bairro três figueiras e os principais indicadores do regime urbanístico.',
    expectedKeywords: ['ZOT 04', 'ZOT 07', 'ZOT 08.3 - C', 'altura', 'coeficiente'],
    shouldNotContain: ['Beta', 'não consigo responder']
  },
  {
    id: 'tc-002',
    category: 'conceptual',
    query: 'Como o Plano Diretor aborda a mobilidade urbana sustentável?',
    expectedKeywords: ['transporte coletivo', 'mobilidade', 'sustentável'],
    shouldNotContain: ['Beta']
  },
  {
    id: 'tc-003',
    category: 'counting',
    query: 'Quantos bairros tem a cidade de porto alegre?',
    expectedKeywords: ['94'],
    shouldNotContain: ['Beta', 'não consigo responder']
  },
  {
    id: 'tc-004',
    category: 'street',
    query: 'O que pode ser construído na Rua Luiz Voelker n.55?',
    expectedKeywords: ['bairro', 'preciso saber', 'ZOT'],
    shouldNotContain: ['altura máxima', 'coeficiente']
  },
  {
    id: 'tc-005',
    category: 'specific-zot',
    query: 'qual a altura máxima da zot 7?',
    expectedKeywords: ['60'],
    shouldNotContain: ['Beta', 'não consigo']
  },
  {
    id: 'tc-006',
    category: 'neighborhood-zots',
    query: 'Quais zots contemplam o bairro boa vista',
    expectedKeywords: ['ESPECIAL', 'ZOT 04', 'ZOT 07', 'ZOT 08.3 - C'],
    shouldNotContain: ['Beta']
  }
];

describe('Chat PD POA - QA Validation Tests', () => {
  let chatFunction: any;

  beforeAll(async () => {
    // Initialize the chat function endpoint
    chatFunction = supabase.functions;
  });

  describe('Critical Test Cases', () => {
    testCases.forEach((testCase) => {
      it(`${testCase.category}: ${testCase.id} - ${testCase.query.substring(0, 50)}...`, async () => {
        const { data, error } = await chatFunction.invoke('chat', {
          body: {
            message: testCase.query,
            sessionId: `test-${Date.now()}`,
            userRole: 'citizen'
          }
        });

        // Basic assertions
        expect(error).toBeNull();
        expect(data).toBeDefined();
        expect(data.response).toBeDefined();

        const response = data.response.toLowerCase();

        // Check for expected keywords
        testCase.expectedKeywords.forEach(keyword => {
          expect(response).toContain(keyword.toLowerCase());
        });

        // Check for unwanted content
        testCase.shouldNotContain.forEach(phrase => {
          expect(response).not.toContain(phrase.toLowerCase());
        });

        // Additional validations based on category
        switch (testCase.category) {
          case 'construction':
            // Should have a table format
            expect(response).toMatch(/\|.*\|/);
            break;
          case 'street':
            // Should ask for clarification
            expect(response).toMatch(/preciso saber|qual bairro|informe/);
            break;
          case 'counting':
            // Should have numeric answer
            expect(response).toMatch(/\d+/);
            break;
        }
      }, 30000); // 30 second timeout for each test
    });
  });

  describe('Response Quality Metrics', () => {
    it('should maintain response time under 5 seconds', async () => {
      const startTime = Date.now();
      
      const { data, error } = await chatFunction.invoke('chat', {
        body: {
          message: 'Quais são os objetivos do plano diretor?',
          sessionId: `test-perf-${Date.now()}`,
          userRole: 'citizen'
        }
      });

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(error).toBeNull();
      expect(responseTime).toBeLessThan(5000);
    });

    it('should handle concurrent requests', async () => {
      const queries = [
        'Qual a altura máxima da ZOT 07?',
        'Quais são as ZOTs do bairro Petrópolis?',
        'Como o plano diretor protege áreas verdes?'
      ];

      const promises = queries.map(query => 
        chatFunction.invoke('chat', {
          body: {
            message: query,
            sessionId: `test-concurrent-${Date.now()}`,
            userRole: 'citizen'
          }
        })
      );

      const results = await Promise.all(promises);

      results.forEach((result, index) => {
        expect(result.error).toBeNull();
        expect(result.data).toBeDefined();
        expect(result.data.response).toBeDefined();
        expect(result.data.response.toLowerCase()).not.toContain('beta');
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty queries gracefully', async () => {
      const { data, error } = await chatFunction.invoke('chat', {
        body: {
          message: '',
          sessionId: `test-empty-${Date.now()}`,
          userRole: 'citizen'
        }
      });

      expect(error).toBeDefined();
    });

    it('should handle very long queries', async () => {
      const longQuery = 'Gostaria de saber '.repeat(50) + 'sobre o plano diretor';
      
      const { data, error } = await chatFunction.invoke('chat', {
        body: {
          message: longQuery,
          sessionId: `test-long-${Date.now()}`,
          userRole: 'citizen'
        }
      });

      expect(error).toBeNull();
      expect(data).toBeDefined();
    });

    it('should handle special characters', async () => {
      const { data, error } = await chatFunction.invoke('chat', {
        body: {
          message: 'O que é permitido construir na ZOT 08.3-A?',
          sessionId: `test-special-${Date.now()}`,
          userRole: 'citizen'
        }
      });

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.response).toBeDefined();
    });
  });
});

// Helper function to calculate success rate
export function calculateSuccessRate(results: any[]) {
  const total = results.length;
  const successful = results.filter(r => r.passed).length;
  return (successful / total) * 100;
}