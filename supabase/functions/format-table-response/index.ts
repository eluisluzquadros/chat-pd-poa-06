import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * Formata dados do regime urbanístico em tabela HTML/Markdown
 */
// Normaliza chaves vindas com alias variados para nomes canônicos
function normalizeRecords(data: any[]): any[] {
  if (!Array.isArray(data)) return data as any;
  const aliasPairs: Array<[string, string]> = [
    ['Altura Máxima - Edificação Isolada', 'altura_maxima'],
    ['Coeficiente de Aproveitamento - Básico', 'coef_aproveitamento_basico'],
    ['Coeficiente de Aproveitamento - Máximo', 'coef_aproveitamento_maximo'],
    ['Zona', 'zona'],
    ['ZONA', 'zona'],
    ['BAIRRO', 'bairro'],
    ['Bairro', 'bairro'],
  ];
  return data.map((rec) => {
    if (!rec || typeof rec !== 'object') return rec;
    const r: Record<string, any> = { ...rec };
    for (const [from, to] of aliasPairs) {
      if (r[from] !== undefined && (r[to] === undefined || r[to] === null)) {
        r[to] = r[from];
      }
    }
    return r;
  });
}

function formatRegimeTable(data: any[]): string {
  if (!data || data.length === 0) {
    return "Nenhum dado encontrado.";
  }

  // Markdown table para melhor visualização
  let table = `
| Campo | Valor |
|-------|-------|
`;

  // Campos prioritários para exibir
  const priorityFields = [
    { key: 'bairro', label: 'Bairro' },
    { key: 'zona', label: 'Zona (ZOT)' },
    { key: 'altura_maxima', label: 'Altura Máxima' },
    { key: 'coef_aproveitamento_basico', label: 'Coef. Aproveitamento Básico' },
    { key: 'coef_aproveitamento_maximo', label: 'Coef. Aproveitamento Máximo' },
    { key: 'area_minima_lote', label: 'Área Mínima do Lote' },
    { key: 'testada_minima_lote', label: 'Testada Mínima' },
    { key: 'taxa_de_ocupacao', label: 'Taxa de Ocupação' },
    { key: 'recuo_jardim', label: 'Recuo de Jardim' },
    { key: 'afastamento_frente', label: 'Afastamento Frontal' },
    { key: 'afastamento_lateral', label: 'Afastamento Lateral' },
    { key: 'afastamento_fundos', label: 'Afastamento Fundos' }
  ];

  const normalized = normalizeRecords(data);
  const record = normalized[0];
  
  priorityFields.forEach(field => {
    const value = record[field.key];
    if (value && value !== 'null' && value !== 'NULL') {
      // Formatar valores
      let formattedValue = value;
      
      if (field.key === 'altura_maxima') {
        formattedValue = `${value}m`;
      } else if (field.key.includes('coef')) {
        formattedValue = value === 'Não se aplica' ? value : `${value}`;
      } else if (field.key.includes('area') || field.key.includes('testada')) {
        formattedValue = value === 'Não se aplica' ? value : `${value}m²`;
      } else if (field.key.includes('recuo') || field.key.includes('afastamento')) {
        formattedValue = value === 'Isento' ? value : `${value}m`;
      }
      
      table += `| **${field.label}** | ${formattedValue} |\n`;
    }
  });

  return table;
}

/**
 * Formata comparação entre bairros/zonas
 */
function formatComparisonTable(data: any[]): string {
  if (!data || data.length === 0) {
    return "Nenhum dado para comparar.";
  }

  let table = `
| Bairro | Zona | Altura Máx | Coef. Básico | Coef. Máximo |
|--------|------|------------|--------------|--------------|
`;

  const normalized = normalizeRecords(data);
  normalized.forEach(record => {
    const bairro = record.bairro || '-';
    const zona = record.zona || '-';
    const altura = (record.altura_maxima !== null && record.altura_maxima !== undefined)
      ? `${record.altura_maxima}m`
      : '-';
    const coefBasico = (record.coef_aproveitamento_basico !== null && record.coef_aproveitamento_basico !== undefined)
      ? `${record.coef_aproveitamento_basico}`
      : '-';
    const coefMaximo = (record.coef_aproveitamento_maximo !== null && record.coef_aproveitamento_maximo !== undefined)
      ? `${record.coef_aproveitamento_maximo}`
      : '-';
    
    table += `| ${bairro} | ${zona} | ${altura} | ${coefBasico} | ${coefMaximo} |\n`;
  });

  return table;
}

/**
 * Detecta o tipo de resposta e formata adequadamente
 */
function formatResponse(query: string, data: any): string {
  // Converter string JSON se necessário
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data);
    } catch {
      return data; // Retornar como está se não for JSON
    }
  }

  // Detectar tipo de query
  const queryLower = query.toLowerCase();
  
  // Query sobre regime específico
  if (queryLower.includes('regime') || 
      queryLower.includes('altura') || 
      queryLower.includes('coeficiente') ||
      queryLower.includes('bairro')) {
    
    if (Array.isArray(data) && data.length > 0) {
      // Se múltiplos registros, fazer comparação
      if (data.length > 1) {
        return formatComparisonTable(data);
      }
      // Se único registro, mostrar detalhado
      return formatRegimeTable(data);
    }
  }

  // Query sobre ZEIS, outorga, etc - resposta textual
  if (data.resposta) {
    return data.resposta;
  }

  // Fallback para JSON formatado
  return JSON.stringify(data, null, 2);
}

serve(async (req) => {
  // CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { query, response, type } = await req.json()

    // Se não houver dados, retornar resposta original
    if (!response) {
      return new Response(
        JSON.stringify({ formatted: "Sem dados para formatar." }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Formatar baseado no tipo
    let formatted = response;
    
    if (type === 'regime' || type === 'comparison') {
      formatted = formatResponse(query, response);
    }

    // Adicionar informações extras se disponível
    if (type === 'regime' && formatted.includes('|')) {
      formatted += `\n\n📍 **Observação**: Os valores apresentados são baseados no Plano Diretor de Porto Alegre (PDUS 2025).`;
      formatted += `\n🔍 Para informações detalhadas, consulte a legislação completa ou procure a Secretaria de Planejamento e Assuntos Estratégicos.`;
    }

    return new Response(
      JSON.stringify({ 
        formatted,
        type,
        has_table: formatted.includes('|')
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ 
        error: error.message,
        formatted: "Erro ao formatar resposta."
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})