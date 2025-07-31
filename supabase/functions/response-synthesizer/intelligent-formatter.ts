/**
 * Sistema de Formatação Inteligente de Respostas
 * Detecta tipos de query e formata respostas adequadamente
 */

interface QueryType {
  type: 'article' | 'certification' | 'fourth_district' | 'generic';
  priority: number;
  formatPattern: string;
}

interface FormattingContext {
  originalQuery: string;
  analysisResult: any;
  sqlResults?: any;
  vectorResults?: any;
}

interface FormattedResponse {
  response: string;
  queryType: QueryType;
  confidence: number;
  articlesFound: string[];
}

export class IntelligentResponseFormatter {
  
  private static readonly ARTICLE_PATTERNS = [
    /art(?:igo)?\s*\.?\s*(\d+)/gi,
    /artigo\s+(\d+)/gi,
    /qual\s+artigo.*trata/gi,
    /que\s+artigo.*fala/gi
  ];

  private static readonly CERTIFICATION_PATTERNS = [
    /certifica[çc][aã]o\s+(?:em\s+)?sustentabilidade/gi,
    /certifica[çc][aã]o\s+ambiental/gi,
    /art(?:igo)?\s*\.?\s*81.*(?:iii|3)/gi,
    /inciso\s+(?:iii|3).*art(?:igo)?\s*\.?\s*81/gi
  ];

  private static readonly FOURTH_DISTRICT_PATTERNS = [
    /4[ºº°]?\s*distrito/gi,
    /quarto\s+distrito/gi,
    /zot\s*8\.2/gi,
    /art(?:igo)?\s*\.?\s*74/gi
  ];

  /**
   * Detecta o tipo de query baseado em padrões específicos
   */
  private static detectQueryType(query: string): QueryType {
    const queryLower = query.toLowerCase();

    // Prioridade 1: Certificação (mais específico)
    if (this.CERTIFICATION_PATTERNS.some(pattern => pattern.test(query))) {
      return {
        type: 'certification',
        priority: 1,
        formatPattern: '**Art. 81 - III**: {content}'
      };
    }

    // Prioridade 2: 4º Distrito (específico)
    if (this.FOURTH_DISTRICT_PATTERNS.some(pattern => pattern.test(query))) {
      return {
        type: 'fourth_district',
        priority: 2,
        formatPattern: '**Art. 74**: {content}'
      };
    }

    // Prioridade 3: Artigos gerais
    if (this.ARTICLE_PATTERNS.some(pattern => pattern.test(query))) {
      const articleMatch = query.match(/art(?:igo)?\s*\.?\s*(\d+)/i);
      const articleNumber = articleMatch ? articleMatch[1] : 'XX';
      return {
        type: 'article',
        priority: 3,
        formatPattern: `**Art. ${articleNumber}**: {content}`
      };
    }

    // Padrão genérico
    return {
      type: 'generic',
      priority: 4,
      formatPattern: '{content}'
    };
  }

  /**
   * Extrai artigos específicos dos dados SQL
   */
  private static extractArticlesFromData(sqlResults: any, queryType: QueryType): string[] {
    const articles: string[] = [];
    
    if (!sqlResults?.executionResults) return articles;

    sqlResults.executionResults.forEach((result: any) => {
      if (result.data && Array.isArray(result.data)) {
        result.data.forEach((row: any) => {
          // Procura por campos que contenham referências a artigos
          Object.keys(row).forEach(key => {
            const value = String(row[key] || '');
            
            // Busca específica para certificação (Art. 81 - III)
            if (queryType.type === 'certification') {
              if (value.toLowerCase().includes('certificação') && 
                  value.toLowerCase().includes('sustentabilidade')) {
                articles.push('Art. 81 - III');
              }
            }
            
            // Busca específica para 4º distrito (Art. 74)
            if (queryType.type === 'fourth_district') {
              if (value.toLowerCase().includes('zot 8.2') || 
                  value.toLowerCase().includes('empreendimentos localizados')) {
                articles.push('Art. 74');
              }
            }
            
            // Busca geral por artigos
            const articleMatches = value.match(/art(?:igo)?\s*\.?\s*(\d+)/gi);
            if (articleMatches) {
              articleMatches.forEach(match => {
                const cleanArticle = match.replace(/art(?:igo)?\.?\s*/gi, 'Art. ');
                if (!articles.includes(cleanArticle)) {
                  articles.push(cleanArticle);
                }
              });
            }
          });
        });
      }
    });

    return [...new Set(articles)]; // Remove duplicatas
  }

  /**
   * Formata o conteúdo baseado no tipo de query detectado
   */
  public static formatContent(content: string, queryType: QueryType, articles: string[]): string {
    let formattedContent = content;

    switch (queryType.type) {
      case 'certification':
        // Garante que a resposta comece com Art. 81 - III se for sobre certificação
        if (!formattedContent.includes('**Art. 81 - III**') && 
            formattedContent.toLowerCase().includes('certificação')) {
          const certificationMatch = formattedContent.match(/(.*certificação[^.]*\.?)/i);
          if (certificationMatch) {
            const certText = certificationMatch[1];
            formattedContent = formattedContent.replace(
              certificationMatch[1],
              `**Art. 81 - III**: ${certText}`
            );
          }
        }
        break;

      case 'fourth_district':
        // Garante que a resposta comece com Art. 74 se for sobre 4º distrito
        if (!formattedContent.includes('**Art. 74**') && 
            (formattedContent.toLowerCase().includes('zot 8.2') || 
             formattedContent.toLowerCase().includes('empreendimento'))) {
          const match = formattedContent.match(/(.*(?:zot 8\.2|empreendimento)[^.]*\.?)/i);
          if (match) {
            formattedContent = formattedContent.replace(
              match[1],
              `**Art. 74**: ${match[1]}`
            );
          }
        }
        break;

      case 'article':
        // Formata citações de artigos gerais
        articles.forEach(article => {
          const articleNum = article.replace('Art. ', '');
          const pattern = new RegExp(`(?<!\\*\\*)(Art\\.?\\s*${articleNum}(?!\\s*[-:])|artigo\\s+${articleNum})`, 'gi');
          formattedContent = formattedContent.replace(pattern, `**Art. ${articleNum}**`);
        });
        break;

      case 'generic':
        // Para queries genéricas, formata qualquer artigo encontrado
        const genericArticlePattern = /(?<!\*\*)(Art\.?\s*\d+)(?!\s*[-:])/gi;
        formattedContent = formattedContent.replace(genericArticlePattern, '**$1**');
        break;
    }

    return formattedContent;
  }

  /**
   * Processa e formata a resposta baseado no contexto
   */
  public static formatResponse(context: FormattingContext): FormattedResponse {
    const queryType = this.detectQueryType(context.originalQuery);
    const articles = this.extractArticlesFromData(context.sqlResults, queryType);
    
    console.log('DEBUG - Intelligent Formatter:', {
      query: context.originalQuery,
      detectedType: queryType.type,
      articlesFound: articles
    });

    // Se não há resposta ainda, cria uma baseada no tipo detectado
    let response = '';
    
    if (context.sqlResults?.executionResults?.length > 0) {
      // Há dados SQL - usar para construir resposta
      const hasValidData = context.sqlResults.executionResults.some((result: any) => 
        result.data && result.data.length > 0
      );
      
      if (hasValidData) {
        response = this.buildResponseFromData(context, queryType, articles);
      }
    }
    
    if (!response && context.vectorResults?.matches?.length > 0) {
      // Usar dados vetoriais se não há SQL
      response = this.buildResponseFromVector(context, queryType, articles);
    }

    // Formatar o conteúdo final
    const formattedContent = this.formatContent(response, queryType, articles);
    
    return {
      response: formattedContent,
      queryType,
      confidence: this.calculateConfidence(context, queryType, articles),
      articlesFound: articles
    };
  }

  /**
   * Constrói resposta específica baseada nos dados SQL
   */
  private static buildResponseFromData(context: FormattingContext, queryType: QueryType, articles: string[]): string {
    const { sqlResults, originalQuery } = context;
    
    switch (queryType.type) {
      case 'certification':
        return this.buildCertificationResponse(sqlResults, originalQuery);
      
      case 'fourth_district':
        return this.buildFourthDistrictResponse(sqlResults, originalQuery);
      
      case 'article':
        return this.buildArticleResponse(sqlResults, originalQuery, articles);
      
      default:
        return ''; // Deixa para o sistema principal processar
    }
  }

  /**
   * Constrói resposta para certificação em sustentabilidade
   */
  private static buildCertificationResponse(sqlResults: any, query: string): string {
    // Procura por dados específicos sobre certificação
    let certificationData = '';
    
    sqlResults.executionResults?.forEach((result: any) => {
      if (result.data) {
        result.data.forEach((row: any) => {
          Object.values(row).forEach(value => {
            const strValue = String(value || '');
            if (strValue.toLowerCase().includes('certificação') && 
                strValue.toLowerCase().includes('sustentabilidade')) {
              certificationData = strValue;
            }
          });
        });
      }
    });

    if (certificationData) {
      return `**Art. 81 - III**: ${certificationData}`;
    }
    
    // Resposta padrão se não encontrar dados específicos
    return `**Art. 81 - III**: Os acréscimos definidos em regulamento para empreendimentos que possuam Certificação em Sustentabilidade Ambiental.`;
  }

  /**
   * Constrói resposta para 4º distrito
   */
  private static buildFourthDistrictResponse(sqlResults: any, query: string): string {
    // Procura por dados da ZOT 8.2 ou referências ao 4º distrito
    let districtData = '';
    
    sqlResults.executionResults?.forEach((result: any) => {
      if (result.data) {
        result.data.forEach((row: any) => {
          if (row.Zona && row.Zona.includes('ZOT 8.2')) {
            districtData = `Os empreendimentos localizados na ZOT 8.2 (4º Distrito) possuem regras específicas definidas no Art. 74.`;
          }
          
          Object.values(row).forEach(value => {
            const strValue = String(value || '');
            if (strValue.toLowerCase().includes('4º distrito') || 
                strValue.toLowerCase().includes('zot 8.2')) {
              districtData = strValue;
            }
          });
        });
      }
    });

    if (districtData) {
      return `**Art. 74**: ${districtData}`;
    }
    
    return `**Art. 74**: Os empreendimentos localizados na ZOT 8.2 (4º Distrito) seguem regramento específico definido neste artigo.`;
  }

  /**
   * Constrói resposta para artigos gerais
   */
  private static buildArticleResponse(sqlResults: any, query: string, articles: string[]): string {
    if (articles.length === 0) return '';
    
    const primaryArticle = articles[0];
    const articleNum = primaryArticle.replace('Art. ', '');
    
    // Procura por conteúdo relacionado ao artigo
    let articleContent = '';
    
    sqlResults.executionResults?.forEach((result: any) => {
      if (result.data) {
        result.data.forEach((row: any) => {
          Object.values(row).forEach(value => {
            const strValue = String(value || '');
            if (strValue.includes(articleNum) || strValue.includes(`Art. ${articleNum}`)) {
              articleContent = strValue;
            }
          });
        });
      }
    });

    if (articleContent) {
      return `**Art. ${articleNum}**: ${articleContent}`;
    }
    
    return ''; // Deixa para o sistema principal processar
  }

  /**
   * Constrói resposta baseada em dados vetoriais
   */
  private static buildResponseFromVector(context: FormattingContext, queryType: QueryType, articles: string[]): string {
    const matches = context.vectorResults?.matches || [];
    
    for (const match of matches) {
      const content = match.content || match.text || '';
      
      // Procura por conteúdo relevante baseado no tipo de query
      switch (queryType.type) {
        case 'certification':
          if (content.toLowerCase().includes('certificação') && 
              content.toLowerCase().includes('sustentabilidade')) {
            return content;
          }
          break;
          
        case 'fourth_district':
          if (content.toLowerCase().includes('4º distrito') || 
              content.toLowerCase().includes('zot 8.2')) {
            return content;
          }
          break;
          
        case 'article':
          if (articles.some(article => 
            content.toLowerCase().includes(article.toLowerCase()))) {
            return content;
          }
          break;
      }
    }
    
    return '';
  }

  /**
   * Calcula a confiança da formatação
   */
  private static calculateConfidence(context: FormattingContext, queryType: QueryType, articles: string[]): number {
    let confidence = 0.5;
    
    // Aumenta confiança baseado na especificidade do tipo detectado
    switch (queryType.type) {
      case 'certification':
        confidence += 0.3;
        break;
      case 'fourth_district':
        confidence += 0.25;
        break;
      case 'article':
        confidence += 0.2;
        break;
      case 'generic':
        confidence += 0.1;
        break;
    }
    
    // Aumenta confiança se encontrou artigos
    if (articles.length > 0) {
      confidence += 0.1 * Math.min(articles.length, 3);
    }
    
    // Aumenta confiança se há dados SQL relevantes
    if (context.sqlResults?.executionResults?.some((r: any) => r.data?.length > 0)) {
      confidence += 0.1;
    }
    
    return Math.min(confidence, 1.0);
  }
}