#!/usr/bin/env node

/**
 * Script de teste de conexão e reprocessamento simplificado
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carregar variáveis de ambiente
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

console.log('🔧 === VERIFICANDO CONFIGURAÇÃO ===\n');

// Verificar variáveis
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

console.log('SUPABASE_URL:', SUPABASE_URL ? '✅ Configurado' : '❌ Não configurado');
console.log('SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_KEY ? '✅ Configurado' : '❌ Não configurado');
console.log('SUPABASE_ANON_KEY:', SUPABASE_ANON_KEY ? '✅ Configurado' : '❌ Não configurado');
console.log('OPENAI_API_KEY:', OPENAI_API_KEY ? '✅ Configurado' : '❌ Não configurado');

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !OPENAI_API_KEY) {
  console.error('\n❌ Variáveis de ambiente faltando!');
  process.exit(1);
}

console.log('\n🔗 === TESTANDO CONEXÃO COM SUPABASE ===\n');

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Testar conexão
try {
  const { count: regimeCount, error: regimeError } = await supabase
    .from('regime_urbanistico')
    .select('*', { count: 'exact', head: true });
  
  if (regimeError) {
    console.error('❌ Erro ao conectar com regime_urbanistico:', regimeError.message);
  } else {
    console.log(`✅ Tabela regime_urbanistico: ${regimeCount || 0} registros`);
  }
  
  const { count: sectionsCount, error: sectionsError } = await supabase
    .from('document_sections')
    .select('*', { count: 'exact', head: true });
  
  if (sectionsError) {
    console.error('❌ Erro ao conectar com document_sections:', sectionsError.message);
  } else {
    console.log(`✅ Tabela document_sections: ${sectionsCount || 0} registros`);
  }
  
} catch (error) {
  console.error('❌ Erro de conexão:', error.message);
  process.exit(1);
}

console.log('\n📁 === VERIFICANDO ARQUIVOS DE CONHECIMENTO ===\n');

const knowledgebaseDir = path.join(__dirname, '..', 'knowledgebase');
const requiredFiles = [
  'PDPOA2025-Regime_Urbanistico.xlsx',
  'PDPOA2025-Minuta_Preliminar_LUOS.docx',
  'PDPOA2025-Minuta_Preliminar_PLANO_DIRETOR.docx',
  'PDPOA2025-Objetivos_Previstos.docx',
  'PDPOA2025-QA.docx'
];

for (const file of requiredFiles) {
  const filePath = path.join(knowledgebaseDir, file);
  try {
    const stats = await fs.stat(filePath);
    console.log(`✅ ${file} (${(stats.size / 1024).toFixed(1)} KB)`);
  } catch {
    console.log(`❌ ${file} - NÃO ENCONTRADO`);
  }
}

console.log('\n🚀 === INICIANDO REPROCESSAMENTO SIMPLIFICADO ===\n');

// 1. LIMPAR DADOS ANTIGOS
console.log('🗑️ Limpando dados antigos...');

try {
  // Limpar regime_urbanistico
  const { error: deleteRegimeError } = await supabase
    .from('regime_urbanistico')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');
  
  if (deleteRegimeError) {
    console.log('⚠️ Erro ao limpar regime_urbanistico:', deleteRegimeError.message);
  } else {
    console.log('✅ Tabela regime_urbanistico limpa');
  }
  
  // Limpar document_sections dos arquivos DOCX
  const docxFiles = requiredFiles.filter(f => f.endsWith('.docx'));
  for (const file of docxFiles) {
    const { error: deleteSectionsError } = await supabase
      .from('document_sections')
      .delete()
      .eq('metadata->source_file', file);
    
    if (deleteSectionsError) {
      console.log(`⚠️ Erro ao limpar sections de ${file}:`, deleteSectionsError.message);
    }
  }
  console.log('✅ Document sections dos DOCX limpos');
  
} catch (error) {
  console.error('❌ Erro ao limpar dados:', error);
}

// 2. IMPORTAR DADOS BÁSICOS DE TESTE
console.log('\n📊 Importando dados de teste do regime urbanístico...');

// Criar alguns registros de teste
const testData = [
  {
    id: crypto.randomUUID(),
    zona: 'ZOT-1',
    bairro: 'Centro Histórico',
    altura_maxima: '52',
    coef_aproveitamento_basico: '3.0',
    coef_aproveitamento_maximo: '4.0',
    created_at: new Date().toISOString()
  },
  {
    id: crypto.randomUUID(),
    zona: 'ZOT-2',
    bairro: 'Moinhos de Vento',
    altura_maxima: '42',
    coef_aproveitamento_basico: '2.4',
    coef_aproveitamento_maximo: '3.0',
    created_at: new Date().toISOString()
  },
  {
    id: crypto.randomUUID(),
    zona: 'ZOT-3',
    bairro: 'Petrópolis',
    altura_maxima: '33',
    coef_aproveitamento_basico: '1.9',
    coef_aproveitamento_maximo: '2.4',
    created_at: new Date().toISOString()
  },
  {
    id: crypto.randomUUID(),
    zona: 'ZOT-4',
    bairro: 'Bela Vista',
    altura_maxima: '27',
    coef_aproveitamento_basico: '1.3',
    coef_aproveitamento_maximo: '1.9',
    created_at: new Date().toISOString()
  },
  {
    id: crypto.randomUUID(),
    zona: 'ZOT-8.2',
    bairro: '4º Distrito',
    altura_maxima: '60',
    coef_aproveitamento_basico: '3.5',
    coef_aproveitamento_maximo: '5.0',
    created_at: new Date().toISOString()
  }
];

const { data: insertedData, error: insertError } = await supabase
  .from('regime_urbanistico')
  .insert(testData);

if (insertError) {
  console.error('❌ Erro ao inserir dados de teste:', insertError.message);
} else {
  console.log(`✅ ${testData.length} registros de teste inseridos`);
}

// 3. CRIAR ALGUNS DOCUMENT SECTIONS DE TESTE
console.log('\n📄 Criando document sections de teste...');

const testSections = [
  {
    id: crypto.randomUUID(),
    content: `ARTIGO 81 - Da Certificação de Sustentabilidade Ambiental
    
    III - A certificação de sustentabilidade ambiental permite acréscimos no potencial construtivo do empreendimento, conforme regulamentação específica.
    
    Os empreendimentos que obtiverem certificação de sustentabilidade ambiental reconhecida pelo município poderão ter benefícios adicionais no aproveitamento do terreno.`,
    embedding: `[${new Array(1536).fill(0.1).join(',')}]`,
    metadata: {
      source_file: 'PDPOA2025-Minuta_Preliminar_PLANO_DIRETOR.docx',
      type: 'article',
      article_number: 81,
      created_at: new Date().toISOString()
    }
  },
  {
    id: crypto.randomUUID(),
    content: `ARTIGO 74 - Do 4º Distrito
    
    O 4º Distrito é uma área especial de revitalização urbana, localizada na ZOT 8.2, com regras específicas para promover o desenvolvimento econômico e a transformação urbana da região.
    
    Os empreendimentos no 4º Distrito terão incentivos especiais, incluindo maior potencial construtivo e flexibilização de parâmetros urbanísticos.`,
    embedding: `[${new Array(1536).fill(0.1).join(',')}]`,
    metadata: {
      source_file: 'PDPOA2025-Minuta_Preliminar_PLANO_DIRETOR.docx',
      type: 'article',
      article_number: 74,
      created_at: new Date().toISOString()
    }
  },
  {
    id: crypto.randomUUID(),
    content: `ARTIGO 86 - Da Outorga Onerosa do Direito de Construir
    
    A outorga onerosa do direito de construir é a contrapartida financeira paga ao município para construir acima do coeficiente de aproveitamento básico, até o limite do coeficiente máximo estabelecido para cada zona.
    
    Os recursos arrecadados com a outorga onerosa serão destinados ao Fundo Municipal de Desenvolvimento Urbano.`,
    embedding: `[${new Array(1536).fill(0.1).join(',')}]`,
    metadata: {
      source_file: 'PDPOA2025-Minuta_Preliminar_PLANO_DIRETOR.docx',
      type: 'article',
      article_number: 86,
      created_at: new Date().toISOString()
    }
  },
  {
    id: crypto.randomUUID(),
    content: `ARTIGO 92 - Das Zonas Especiais de Interesse Social (ZEIS)
    
    As ZEIS são áreas destinadas prioritariamente à habitação de interesse social e regularização fundiária, com parâmetros urbanísticos especiais para facilitar a produção de moradia popular.
    
    Nas ZEIS, são permitidos lotes menores e coeficientes diferenciados para viabilizar habitação de interesse social.`,
    embedding: `[${new Array(1536).fill(0.1).join(',')}]`,
    metadata: {
      source_file: 'PDPOA2025-Minuta_Preliminar_PLANO_DIRETOR.docx',
      type: 'article',
      article_number: 92,
      created_at: new Date().toISOString()
    }
  },
  {
    id: crypto.randomUUID(),
    content: `Pergunta: Quais são os principais objetivos do novo Plano Diretor de Porto Alegre?
    
    Resposta: Os principais objetivos do PDUS 2025 são:
    1. Promover o desenvolvimento sustentável da cidade
    2. Garantir o direito à cidade para todos os cidadãos
    3. Preservar o patrimônio ambiental e cultural
    4. Ordenar o crescimento urbano de forma equilibrada
    5. Melhorar a mobilidade urbana e acessibilidade
    6. Incentivar a habitação de interesse social
    7. Fortalecer a economia local com sustentabilidade`,
    embedding: `[${new Array(1536).fill(0.1).join(',')}]`,
    metadata: {
      source_file: 'PDPOA2025-QA.docx',
      type: 'qa_pair',
      created_at: new Date().toISOString()
    }
  }
];

const { error: sectionsError } = await supabase
  .from('document_sections')
  .insert(testSections);

if (sectionsError) {
  console.error('❌ Erro ao inserir sections de teste:', sectionsError.message);
} else {
  console.log(`✅ ${testSections.length} document sections de teste inseridos`);
}

// 4. VERIFICAR RESULTADOS
console.log('\n📊 === VERIFICANDO RESULTADOS ===\n');

const { count: finalRegimeCount } = await supabase
  .from('regime_urbanistico')
  .select('*', { count: 'exact', head: true });

const { count: finalSectionsCount } = await supabase
  .from('document_sections')
  .select('*', { count: 'exact', head: true });

console.log(`✅ Regime urbanístico: ${finalRegimeCount || 0} registros`);
console.log(`✅ Document sections: ${finalSectionsCount || 0} registros`);

console.log('\n✅ === TESTE CONCLUÍDO ===');
console.log('\nPróximos passos:');
console.log('1. Execute o script completo de reprocessamento quando possível');
console.log('2. Use: node scripts/validate-reprocessing.mjs para testar');
console.log('3. Monitore com: node scripts/monitor-knowledge-base.mjs');

process.exit(0);