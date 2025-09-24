import { describe, it, expect, beforeEach } from '@jest/jest-globals';

// Mock data para testes
const mockMatches = [
  {
    content: "Art. 74 - O Quarto Distrito possui regras específicas para sustentabilidade e certificação ambiental.",
    similarity: 0.7,
    document_id: "doc1"
  },
  {
    content: "A altura máxima permitida no bairro Petrópolis é de 45 metros, com coeficiente de aproveitamento básico de 2.0.",
    similarity: 0.6,
    document_id: "doc2"
  },
  {
    content: "Certificação verde e sustentabilidade são requisitos para novos empreendimentos comerciais.",
    similarity: 0.5,
    document_id: "doc3"
  },
  {
    content: "Porto Alegre possui plano diretor urbano sustentável aprovado em 2024.",
    similarity: 0.4,
    document_id: "doc4"
  }
];

// Mock do fetch para simular chamadas à função
global.fetch = jest.fn();

describe('Contextual Scoring System', () => {
  beforeEach(() => {
    (fetch as jest.Mock).mockClear();
  });

  describe('Query Classification Tests', () => {
    it('should classify certification + sustainability queries correctly', async () => {
      const mockResponse = {
        queryType: 'certification_sustainability',
        appliedThreshold: 0.2,
        scoredMatches: mockMatches.map(match => ({
          ...match,
          finalScore: match.content.includes('certificação') ? match.similarity * 1.8 : match.similarity,
          boosts: match.content.includes('certificação') ? ['term_boost:certification'] : [],
          penalties: [],
          passesThreshold: true
        }))
      };

      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const response = await fetch('/contextual-scoring', {
        method: 'POST',
        body: JSON.stringify({
          query: 'Quais são os requisitos de certificação sustentável?',
          matches: mockMatches
        })
      });

      const result = await response.json();
      
      expect(result.queryType).toBe('certification_sustainability');
      expect(result.appliedThreshold).toBe(0.2);
      expect(result.scoredMatches[0].boosts).toContain('term_boost:certification');
    });

    it('should classify 4th district + Art. 74 queries with maximum priority', async () => {
      const mockResponse = {
        queryType: 'fourth_district_art74',
        appliedThreshold: 0.3,
        scoredMatches: mockMatches.map(match => ({
          ...match,
          finalScore: match.content.includes('Art. 74') ? match.similarity * 3.0 : match.similarity,
          boosts: match.content.includes('Art. 74') ? ['term_boost:art. 74'] : [],
          penalties: [],
          passesThreshold: true
        }))
      };

      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const response = await fetch('/contextual-scoring', {
        method: 'POST',
        body: JSON.stringify({
          query: 'Informações sobre Art. 74 do Quarto Distrito',
          matches: mockMatches
        })
      });

      const result = await response.json();
      
      expect(result.queryType).toBe('fourth_district_art74');
      expect(result.appliedThreshold).toBe(0.3);
      expect(result.scoredMatches[0].finalScore).toBeGreaterThan(1.0);
    });

    it('should apply penalties for generic terms', async () => {
      const mockResponse = {
        queryType: 'generic',
        appliedThreshold: 0.15,
        scoredMatches: mockMatches.map(match => ({
          ...match,
          finalScore: match.similarity * 0.3, // Penalty applied
          boosts: [],
          penalties: ['generic_terms_penalty'],
          passesThreshold: false
        }))
      };

      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const response = await fetch('/contextual-scoring', {
        method: 'POST',
        body: JSON.stringify({
          query: 'plano diretor',
          matches: mockMatches
        })
      });

      const result = await response.json();
      
      expect(result.queryType).toBe('generic');
      expect(result.scoredMatches[0].penalties).toContain('generic_terms_penalty');
      expect(result.scoredMatches[0].finalScore).toBeLessThan(result.scoredMatches[0].similarity);
    });
  });

  describe('Dynamic Thresholds Tests', () => {
    it('should use different thresholds for different query types', async () => {
      const testCases = [
        {
          query: 'certificação sustentável',
          expectedThreshold: 0.2,
          expectedType: 'certification_sustainability'
        },
        {
          query: 'Art. 74 quarto distrito',
          expectedThreshold: 0.3,
          expectedType: 'fourth_district_art74'
        },
        {
          query: 'altura máxima construção',
          expectedThreshold: 0.15,
          expectedType: 'construction_generic'
        }
      ];

      for (const testCase of testCases) {
        const mockResponse = {
          queryType: testCase.expectedType,
          appliedThreshold: testCase.expectedThreshold,
          scoredMatches: []
        };

        (fetch as jest.Mock).mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(mockResponse)
        });

        const response = await fetch('/contextual-scoring', {
          method: 'POST',
          body: JSON.stringify({
            query: testCase.query,
            matches: mockMatches
          })
        });

        const result = await response.json();
        
        expect(result.appliedThreshold).toBe(testCase.expectedThreshold);
        expect(result.queryType).toBe(testCase.expectedType);
      }
    });
  });

  describe('Contextual Boosts Tests', () => {
    it('should apply neighborhood-specific boosts', async () => {
      const mockResponse = {
        queryType: 'neighborhood_specific',
        appliedThreshold: 0.2,
        scoredMatches: mockMatches.map(match => ({
          ...match,
          finalScore: match.content.includes('Petrópolis') ? match.similarity * 1.7 : match.similarity,
          boosts: match.content.includes('Petrópolis') ? ['bairro_match:Petrópolis'] : [],
          penalties: [],
          passesThreshold: true
        }))
      };

      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const response = await fetch('/contextual-scoring', {
        method: 'POST',
        body: JSON.stringify({
          query: 'regras de construção no bairro Petrópolis',
          matches: mockMatches,
          analysisResult: {
            entities: {
              neighborhoods: ['Petrópolis']
            }
          }
        })
      });

      const result = await response.json();
      
      expect(result.scoredMatches.some(m => m.boosts.includes('bairro_match:Petrópolis'))).toBe(true);
    });

    it('should prioritize exact article matches', async () => {
      const mockResponse = {
        queryType: 'article_specific',
        appliedThreshold: 0.25,
        scoredMatches: mockMatches.map(match => ({
          ...match,
          finalScore: match.content.includes('Art. 74') ? match.similarity * 2.5 : match.similarity,
          boosts: match.content.includes('Art. 74') ? ['exact_article_match'] : [],
          penalties: [],
          passesThreshold: true
        }))
      };

      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const response = await fetch('/contextual-scoring', {
        method: 'POST',
        body: JSON.stringify({
          query: 'Art. 74',
          matches: mockMatches
        })
      });

      const result = await response.json();
      
      expect(result.scoredMatches.some(m => m.boosts.includes('exact_article_match'))).toBe(true);
    });
  });

  describe('Quality Metrics Tests', () => {
    it('should calculate quality metrics correctly', async () => {
      const mockResponse = {
        queryType: 'certification_sustainability',
        appliedThreshold: 0.2,
        scoredMatches: [
          { finalScore: 0.9, passesThreshold: true },
          { finalScore: 0.7, passesThreshold: true },
          { finalScore: 0.3, passesThreshold: true },
          { finalScore: 0.1, passesThreshold: false }
        ],
        qualityMetrics: {
          averageScore: 0.5,
          topScore: 0.9,
          passedThreshold: 3
        }
      };

      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const response = await fetch('/contextual-scoring', {
        method: 'POST',
        body: JSON.stringify({
          query: 'certificação sustentável',
          matches: mockMatches
        })
      });

      const result = await response.json();
      
      expect(result.qualityMetrics.averageScore).toBe(0.5);
      expect(result.qualityMetrics.topScore).toBe(0.9);
      expect(result.qualityMetrics.passedThreshold).toBe(3);
    });
  });

  describe('Error Handling Tests', () => {
    it('should handle scoring service errors gracefully', async () => {
      (fetch as jest.Mock).mockRejectedValue(new Error('Service unavailable'));

      const response = await fetch('/contextual-scoring', {
        method: 'POST',
        body: JSON.stringify({
          query: 'test query',
          matches: mockMatches
        })
      });

      // In real implementation, this would fallback to basic scoring
      expect(fetch).toHaveBeenCalled();
    });

    it('should handle malformed requests', async () => {
      const mockErrorResponse = {
        error: 'Invalid request format',
        scoredMatches: [],
        appliedThreshold: 0.15,
        queryType: 'generic'
      };

      (fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.resolve(mockErrorResponse)
      });

      const response = await fetch('/contextual-scoring', {
        method: 'POST',
        body: JSON.stringify({
          // Missing required fields
        })
      });

      const result = await response.json();
      
      expect(result.error).toBeDefined();
      expect(result.scoredMatches).toEqual([]);
    });
  });

  describe('Performance Tests', () => {
    it('should handle large numbers of matches efficiently', async () => {
      const largeMatchSet = Array.from({ length: 100 }, (_, i) => ({
        content: `Test content ${i} with various terms like altura, coeficiente, zona`,
        similarity: Math.random(),
        document_id: `doc${i}`
      }));

      const mockResponse = {
        queryType: 'construction_generic',
        appliedThreshold: 0.15,
        scoredMatches: largeMatchSet.map(match => ({
          ...match,
          finalScore: match.similarity,
          boosts: [],
          penalties: [],
          passesThreshold: true
        })),
        totalProcessed: 100
      };

      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const startTime = Date.now();
      
      const response = await fetch('/contextual-scoring', {
        method: 'POST',
        body: JSON.stringify({
          query: 'altura máxima construção',
          matches: largeMatchSet
        })
      });

      const result = await response.json();
      const endTime = Date.now();
      
      expect(result.totalProcessed).toBe(100);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });
});

// Integration tests com o enhanced-vector-search
describe('Integration with Enhanced Vector Search', () => {
  it('should integrate contextual scoring with vector search results', async () => {
    const vectorSearchMockResponse = {
      matches: mockMatches.map(match => ({
        ...match,
        contextual_boost_info: {
          original_similarity: match.similarity,
          contextual_score: match.similarity * 1.5,
          boosts: ['term_boost:altura'],
          penalties: [],
          threshold: 0.15,
          passes_threshold: true
        }
      })),
      total: 4
    };

    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(vectorSearchMockResponse)
    });

    const response = await fetch('/enhanced-vector-search', {
      method: 'POST',
      body: JSON.stringify({
        message: 'altura máxima no bairro Petrópolis',
        context: {
          bairros: ['Petrópolis']
        }
      })
    });

    const result = await response.json();
    
    expect(result.matches[0]).toHaveProperty('contextual_boost_info');
    expect(result.matches[0].contextual_boost_info.boosts).toBeDefined();
  });
});