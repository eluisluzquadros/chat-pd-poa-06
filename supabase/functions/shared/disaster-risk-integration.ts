// Integração de dados de risco de desastre com o sistema RAG

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0"

// Interface para dados de risco
export interface DisasterRiskData {
  bairro: string;
  riscos_ativos: string[];
  nivel_risco: number;
  descricao_riscos: string;
  areas_criticas?: string;
  observacoes?: string;
}

// Função para enriquecer resposta com dados de risco
export async function enrichResponseWithDisasterRisk(
  supabase: ReturnType<typeof createClient>,
  response: string,
  entities: { neighborhoods?: string[] }
): Promise<string> {
  
  if (!entities.neighborhoods || entities.neighborhoods.length === 0) {
    return response;
  }
  
  const riskData: DisasterRiskData[] = [];
  
  // Busca dados de risco para cada bairro mencionado
  for (const bairro of entities.neighborhoods) {
    const { data, error } = await supabase
      .rpc('get_riscos_bairro', { nome_bairro: bairro });
    
    if (!error && data && data.length > 0) {
      riskData.push(...data);
    }
  }
  
  if (riskData.length === 0) {
    return response;
  }
  
  // Adiciona informações de risco à resposta
  let enrichedResponse = response;
  
  // Se a resposta já tem uma tabela, adiciona coluna de risco
  if (response.includes('|') && response.includes('Bairro')) {
    // TODO: Implementar adição de coluna de risco em tabelas existentes
    return response;
  }
  
  // Adiciona seção de riscos ao final da resposta
  enrichedResponse += '\n\n### ⚠️ Informações de Risco de Desastre\n\n';
  
  // Agrupa por nível de risco
  const highRiskBairros = riskData.filter(d => d.nivel_risco >= 4);
  const mediumRiskBairros = riskData.filter(d => d.nivel_risco === 3);
  const lowRiskBairros = riskData.filter(d => d.nivel_risco <= 2);
  
  if (highRiskBairros.length > 0) {
    enrichedResponse += '**🔴 Bairros de Alto Risco:**\n';
    highRiskBairros.forEach(risk => {
      enrichedResponse += `- **${risk.bairro}** (${risk.descricao_riscos}): ${risk.riscos_ativos.join(', ')}\n`;
      if (risk.areas_criticas) {
        enrichedResponse += `  - Áreas críticas: ${risk.areas_criticas}\n`;
      }
    });
    enrichedResponse += '\n';
  }
  
  if (mediumRiskBairros.length > 0) {
    enrichedResponse += '**🟡 Bairros de Risco Médio:**\n';
    mediumRiskBairros.forEach(risk => {
      enrichedResponse += `- **${risk.bairro}**: ${risk.riscos_ativos.join(', ')}\n`;
    });
    enrichedResponse += '\n';
  }
  
  if (lowRiskBairros.length > 0) {
    enrichedResponse += '**🟢 Bairros de Baixo Risco:**\n';
    lowRiskBairros.forEach(risk => {
      enrichedResponse += `- ${risk.bairro}: ${risk.riscos_ativos.join(', ') || 'Riscos mínimos'}\n`;
    });
  }
  
  return enrichedResponse;
}

// Função para detectar queries sobre riscos
export function isDisasterRiskQuery(query: string): boolean {
  const lowerQuery = query.toLowerCase();
  const riskKeywords = [
    'risco', 'desastre', 'inundação', 'alagamento', 'deslizamento',
    'vendaval', 'granizo', 'calamidade', 'emergência', 'perigo',
    'área de risco', 'zona de risco', 'segurança', 'vulnerável',
    'enchente', 'temporal', 'chuva'
  ];
  
  return riskKeywords.some(keyword => lowerQuery.includes(keyword));
}

// Função para buscar bairros por tipo de risco
export async function searchBairrosByRiskType(
  supabase: ReturnType<typeof createClient>,
  riskType: string,
  minLevel: number = 3
): Promise<any[]> {
  
  const { data, error } = await supabase
    .rpc('get_bairros_por_tipo_risco', {
      tipo_risco: riskType,
      nivel_minimo: minLevel
    });
  
  if (error) {
    console.error('Erro ao buscar bairros por tipo de risco:', error);
    return [];
  }
  
  return data || [];
}

// Função para gerar prompt adicional com contexto de risco
export function generateRiskContextPrompt(riskData: DisasterRiskData[]): string {
  if (riskData.length === 0) return '';
  
  let prompt = '\n\nCONTEXTO ADICIONAL - RISCOS DE DESASTRE:\n';
  
  riskData.forEach(risk => {
    prompt += `\n${risk.bairro}:\n`;
    prompt += `- Nível de risco: ${risk.descricao_riscos}\n`;
    prompt += `- Tipos de risco: ${risk.riscos_ativos.join(', ')}\n`;
    if (risk.areas_criticas) {
      prompt += `- Áreas críticas: ${risk.areas_criticas}\n`;
    }
    if (risk.observacoes) {
      prompt += `- Observações: ${risk.observacoes}\n`;
    }
  });
  
  prompt += '\nConsidere estas informações de risco ao formular sua resposta.';
  
  return prompt;
}

// Função para criar chunks especiais para dados de risco
export function createDisasterRiskChunks(riskData: any[]): Array<{
  content: string;
  metadata: {
    type: 'disaster_risk';
    bairro: string;
    nivel_risco: number;
    riscos: string[];
    keywords: string[];
  };
}> {
  
  return riskData.map(risk => {
    const content = `Informações de Risco de Desastre - ${risk.bairro_nome}:
Nível de Risco Geral: ${risk.nivel_risco_geral} (${getDescricaoRisco(risk.nivel_risco_geral)})
${risk.risco_inundacao ? '- Risco de Inundação' + (risk.nivel_risco_inundacao ? ` (Nível ${risk.nivel_risco_inundacao})` : '') + '\n' : ''}
${risk.risco_deslizamento ? '- Risco de Deslizamento' + (risk.nivel_risco_deslizamento ? ` (Nível ${risk.nivel_risco_deslizamento})` : '') + '\n' : ''}
${risk.risco_alagamento ? '- Risco de Alagamento\n' : ''}
${risk.risco_vendaval ? '- Risco de Vendaval\n' : ''}
${risk.risco_granizo ? '- Risco de Granizo\n' : ''}
${risk.areas_criticas ? `Áreas Críticas: ${risk.areas_criticas}\n` : ''}
${risk.observacoes ? `Observações: ${risk.observacoes}\n` : ''}
${risk.ultima_ocorrencia ? `Última Ocorrência: ${risk.ultima_ocorrencia}\n` : ''}
${risk.frequencia_anual ? `Frequência Anual: ${risk.frequencia_anual} eventos\n` : ''}`;
    
    const riscos = [];
    if (risk.risco_inundacao) riscos.push('inundação');
    if (risk.risco_deslizamento) riscos.push('deslizamento');
    if (risk.risco_alagamento) riscos.push('alagamento');
    if (risk.risco_vendaval) riscos.push('vendaval');
    if (risk.risco_granizo) riscos.push('granizo');
    
    const keywords = [
      risk.bairro_nome,
      'risco de desastre',
      ...riscos,
      `nível ${risk.nivel_risco_geral}`,
      getDescricaoRisco(risk.nivel_risco_geral).toLowerCase()
    ];
    
    if (risk.areas_criticas) {
      keywords.push('áreas críticas');
    }
    
    return {
      content,
      metadata: {
        type: 'disaster_risk' as const,
        bairro: risk.bairro_nome,
        nivel_risco: risk.nivel_risco_geral,
        riscos,
        keywords
      }
    };
  });
}

function getDescricaoRisco(nivel: number): string {
  switch (nivel) {
    case 5: return 'Risco Muito Alto';
    case 4: return 'Risco Alto';
    case 3: return 'Risco Médio';
    case 2: return 'Risco Baixo';
    case 1: return 'Risco Muito Baixo';
    default: return 'Sem classificação';
  }
}