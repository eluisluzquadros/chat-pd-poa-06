#!/usr/bin/env node

/**
 * Script para popular dados de teste básicos
 * Adiciona artigos essenciais ao Knowledge Graph para testes
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import chalk from 'chalk';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

config({ path: path.join(__dirname, '..', '.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Dados de teste essenciais
const TEST_DATA = {
  legal_chunks: [
    {
      document_id: 'LUOS-2025',
      level: 6,
      level_type: 'artigo',
      sequence_number: 89,
      numero_artigo: 89,
      title: 'Art. 89º - Estudo de Impacto de Vizinhança (EIV)',
      content: 'O Estudo de Impacto de Vizinhança (EIV) é um instrumento de avaliação dos impactos de empreendimentos ou atividades no meio urbano.',
      full_path: 'LUOS/TITULO_VI/CAPITULO_I/SECAO_II/Art_89'
    },
    {
      document_id: 'PDUS-2025',
      level: 6,
      level_type: 'artigo',
      sequence_number: 92,
      numero_artigo: 92,
      title: 'Art. 92º - Zonas Especiais de Interesse Social (ZEIS)',
      content: 'As Zonas Especiais de Interesse Social (ZEIS) são porções do território destinadas predominantemente à população de baixa renda.',
      full_path: 'PDUS/TITULO_IV/CAPITULO_II/Art_92'
    },
    {
      document_id: 'LUOS-2025',
      level: 6,
      level_type: 'artigo',
      sequence_number: 86,
      numero_artigo: 86,
      title: 'Art. 86º - Outorga Onerosa do Direito de Construir',
      content: 'A outorga onerosa do direito de construir é o instrumento jurídico que permite ao proprietário de um terreno exercer o direito de construir acima do coeficiente de aproveitamento básico.',
      full_path: 'LUOS/TITULO_VI/CAPITULO_I/Art_86'
    },
    {
      document_id: 'LUOS-2025',
      level: 6,
      level_type: 'artigo',
      sequence_number: 82,
      numero_artigo: 82,
      title: 'Art. 82º - Coeficiente de Aproveitamento',
      content: 'O coeficiente de aproveitamento é a relação entre a área edificável e a área do terreno.',
      full_path: 'LUOS/TITULO_V/CAPITULO_II/Art_82'
    }
  ],
  
  knowledge_nodes: [
    { node_type: 'law', label: 'LUOS', properties: { full_name: 'Lei de Uso e Ocupação do Solo', year: 2025 } },
    { node_type: 'law', label: 'PDUS', properties: { full_name: 'Plano Diretor Urbano Sustentável', year: 2025 } },
    { node_type: 'article', label: 'LUOS - Art. 89', properties: { number: 89, law: 'LUOS', defines: ['EIV'] } },
    { node_type: 'article', label: 'PDUS - Art. 92', properties: { number: 92, law: 'PDUS', defines: ['ZEIS'] } },
    { node_type: 'article', label: 'LUOS - Art. 86', properties: { number: 86, law: 'LUOS', defines: ['Outorga Onerosa'] } },
    { node_type: 'article', label: 'LUOS - Art. 82', properties: { number: 82, law: 'LUOS', defines: ['Coeficiente de Aproveitamento'] } },
    { node_type: 'concept', label: 'EIV', properties: { full_name: 'Estudo de Impacto de Vizinhança' } },
    { node_type: 'concept', label: 'ZEIS', properties: { full_name: 'Zonas Especiais de Interesse Social' } },
    { node_type: 'concept', label: 'Outorga Onerosa', properties: { description: 'Instrumento de política urbana' } },
    { node_type: 'concept', label: 'Coeficiente de Aproveitamento', properties: { description: 'Relação entre área edificável e área do terreno' } },
    { node_type: 'zone', label: 'ZOT 08.1', properties: { name: 'Zona de Ocupação Tradicional 08.1', area: 'Centro Histórico' } },
    { node_type: 'neighborhood', label: 'Centro Histórico', properties: { zone: 'ZOT 08.1', altitude_max: 130 } },
    { node_type: 'neighborhood', label: 'Boa Vista', properties: { zone: 'Multiple', altitude_max: 90 } }
  ],
  
  knowledge_edges: [
    { source: 'LUOS - Art. 89', target: 'EIV', type: 'DEFINES' },
    { source: 'PDUS - Art. 92', target: 'ZEIS', type: 'DEFINES' },
    { source: 'LUOS - Art. 86', target: 'Outorga Onerosa', type: 'DEFINES' },
    { source: 'LUOS - Art. 82', target: 'Coeficiente de Aproveitamento', type: 'DEFINES' },
    { source: 'LUOS', target: 'LUOS - Art. 89', type: 'CONTAINS' },
    { source: 'LUOS', target: 'LUOS - Art. 86', type: 'CONTAINS' },
    { source: 'LUOS', target: 'LUOS - Art. 82', type: 'CONTAINS' },
    { source: 'PDUS', target: 'PDUS - Art. 92', type: 'CONTAINS' },
    { source: 'Centro Histórico', target: 'ZOT 08.1', type: 'BELONGS_TO' },
    { source: 'ZOT 08.1', target: 'Centro Histórico', type: 'REGULATES' }
  ]
};

async function clearExistingData() {
  console.log(chalk.yellow('🧹 Clearing existing test data...'));
  
  try {
    // Clear in dependency order
    await supabase.from('knowledge_graph_edges').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('chunk_cross_references').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('knowledge_graph_nodes').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('legal_document_chunks').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    console.log(chalk.green('✅ Existing data cleared'));
  } catch (error) {
    console.log(chalk.yellow('⚠️ Clear data warning:', error.message));
  }
}

async function populateChunks() {
  console.log(chalk.cyan('📄 Populating legal document chunks...'));
  
  for (const chunk of TEST_DATA.legal_chunks) {
    try {
      const { error } = await supabase
        .from('legal_document_chunks')
        .insert(chunk);
      
      if (error) {
        console.log(chalk.red(`❌ Chunk error:`, error.message));
      } else {
        console.log(chalk.green(`✅ Added chunk: ${chunk.title}`));
      }
    } catch (err) {
      console.log(chalk.red(`❌ Chunk exception:`, err.message));
    }
  }
}

async function populateNodes() {
  console.log(chalk.cyan('\n🧠 Populating knowledge graph nodes...'));
  
  for (const node of TEST_DATA.knowledge_nodes) {
    try {
      const { error } = await supabase
        .from('knowledge_graph_nodes')
        .insert(node);
      
      if (error) {
        console.log(chalk.red(`❌ Node error:`, error.message));
      } else {
        console.log(chalk.green(`✅ Added node: ${node.label} (${node.node_type})`));
      }
    } catch (err) {
      console.log(chalk.red(`❌ Node exception:`, err.message));
    }
  }
}

async function populateEdges() {
  console.log(chalk.cyan('\n🔗 Populating knowledge graph edges...'));
  
  // Get node IDs for edges
  const { data: nodes } = await supabase
    .from('knowledge_graph_nodes')
    .select('id, label');
  
  const nodeMap = {};
  nodes?.forEach(node => {
    nodeMap[node.label] = node.id;
  });
  
  for (const edge of TEST_DATA.knowledge_edges) {
    try {
      const sourceId = nodeMap[edge.source];
      const targetId = nodeMap[edge.target];
      
      if (!sourceId || !targetId) {
        console.log(chalk.yellow(`⚠️ Skipping edge ${edge.source} -> ${edge.target}: nodes not found`));
        continue;
      }
      
      const { error } = await supabase
        .from('knowledge_graph_edges')
        .insert({
          source_id: sourceId,
          target_id: targetId,
          relationship_type: edge.type,
          weight: 1.0
        });
      
      if (error) {
        console.log(chalk.red(`❌ Edge error:`, error.message));
      } else {
        console.log(chalk.green(`✅ Added edge: ${edge.source} --${edge.type}--> ${edge.target}`));
      }
    } catch (err) {
      console.log(chalk.red(`❌ Edge exception:`, err.message));
    }
  }
}

async function validateData() {
  console.log(chalk.cyan('\n🔍 Validating populated data...'));
  
  try {
    const { data: chunks, error: chunksError } = await supabase
      .from('legal_document_chunks')
      .select('*');
    
    const { data: nodes, error: nodesError } = await supabase
      .from('knowledge_graph_nodes')
      .select('*');
    
    const { data: edges, error: edgesError } = await supabase
      .from('knowledge_graph_edges')
      .select('*');
    
    if (chunksError) console.log(chalk.red('❌ Chunks validation error:', chunksError.message));
    if (nodesError) console.log(chalk.red('❌ Nodes validation error:', nodesError.message));
    if (edgesError) console.log(chalk.red('❌ Edges validation error:', edgesError.message));
    
    console.log(chalk.green(`✅ Legal chunks: ${chunks?.length || 0}`));
    console.log(chalk.green(`✅ Knowledge nodes: ${nodes?.length || 0}`));
    console.log(chalk.green(`✅ Knowledge edges: ${edges?.length || 0}`));
    
    // Test specific queries
    const { data: eivArticle } = await supabase
      .from('legal_document_chunks')
      .select('*')
      .eq('numero_artigo', 89)
      .single();
    
    if (eivArticle) {
      console.log(chalk.green(`✅ EIV Article found: ${eivArticle.title}`));
    } else {
      console.log(chalk.red('❌ EIV Article not found'));
    }
    
  } catch (error) {
    console.log(chalk.red('❌ Validation error:', error.message));
  }
}

async function main() {
  console.log(chalk.bold.cyan('🚀 POPULATING TEST DATA FOR AGENTIC-RAG\n'));
  
  await clearExistingData();
  await populateChunks();
  await populateNodes();
  await populateEdges();
  await validateData();
  
  console.log(chalk.bold.green('\n🎉 Test data population completed!'));
  console.log(chalk.gray('Now you can run the Agentic-RAG tests again.'));
}

main().catch(error => {
  console.error(chalk.red('\n❌ Population failed:'), error);
  process.exit(1);
});