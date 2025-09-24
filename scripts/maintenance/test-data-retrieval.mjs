#!/usr/bin/env node

/**
 * Test data retrieval to verify what the agents can find
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

async function testDataRetrieval() {
  console.log(chalk.cyan('🔍 Testing Data Retrieval...'));
  
  // Test 1: Check legal chunks
  console.log(chalk.yellow('\n1. Legal Document Chunks:'));
  const { data: chunks, error: chunksError } = await supabase
    .from('legal_document_chunks')
    .select('*');
  
  if (chunksError) {
    console.log(chalk.red('❌ Error:', chunksError.message));
  } else {
    console.log(chalk.green(`✅ Found ${chunks.length} chunks`));
    chunks.forEach(chunk => {
      console.log(chalk.gray(`  - Art. ${chunk.numero_artigo}: ${chunk.title.substring(0, 50)}...`));
    });
  }
  
  // Test 2: Check knowledge graph nodes
  console.log(chalk.yellow('\n2. Knowledge Graph Nodes:'));
  const { data: nodes, error: nodesError } = await supabase
    .from('knowledge_graph_nodes')
    .select('*');
  
  if (nodesError) {
    console.log(chalk.red('❌ Error:', nodesError.message));
  } else {
    console.log(chalk.green(`✅ Found ${nodes.length} nodes`));
    const byType = {};
    nodes.forEach(node => {
      byType[node.node_type] = (byType[node.node_type] || 0) + 1;
    });
    Object.entries(byType).forEach(([type, count]) => {
      console.log(chalk.gray(`  - ${type}: ${count} nodes`));
    });
  }
  
  // Test 3: Check knowledge graph edges
  console.log(chalk.yellow('\n3. Knowledge Graph Edges:'));
  const { data: edges, error: edgesError } = await supabase
    .from('knowledge_graph_edges')
    .select(`
      *,
      source:source_id(label),
      target:target_id(label)
    `);
  
  if (edgesError) {
    console.log(chalk.red('❌ Error:', edgesError.message));
  } else {
    console.log(chalk.green(`✅ Found ${edges.length} edges`));
    edges.forEach(edge => {
      console.log(chalk.gray(`  - ${edge.source?.label} --${edge.relationship_type}--> ${edge.target?.label}`));
    });
  }
  
  // Test 4: Specific searches that agents would do
  console.log(chalk.yellow('\n4. Specific Agent Searches:'));
  
  // Search for EIV
  const { data: eivSearch } = await supabase
    .from('legal_document_chunks')
    .select('*')
    .or('content.ilike.%EIV%,title.ilike.%EIV%');
  
  console.log(chalk.green(`✅ EIV search: ${eivSearch?.length || 0} results`));
  
  // Search for Article 89
  const { data: art89Search } = await supabase
    .from('legal_document_chunks')
    .select('*')
    .eq('numero_artigo', 89);
  
  console.log(chalk.green(`✅ Art. 89 search: ${art89Search?.length || 0} results`));
  
  // Search for ZEIS
  const { data: zeisSearch } = await supabase
    .from('knowledge_graph_nodes')
    .select('*')
    .eq('label', 'ZEIS');
  
  console.log(chalk.green(`✅ ZEIS search: ${zeisSearch?.length || 0} results`));
  
  // Test 5: Knowledge Graph traversal simulation
  console.log(chalk.yellow('\n5. Knowledge Graph Relationships:'));
  
  const { data: eivNode } = await supabase
    .from('knowledge_graph_nodes')
    .select('id, label')
    .eq('label', 'EIV')
    .single();
  
  if (eivNode) {
    const { data: eivRelations } = await supabase
      .from('knowledge_graph_edges')
      .select(`
        relationship_type,
        source:source_id(label),
        target:target_id(label)
      `)
      .or(`source_id.eq.${eivNode.id},target_id.eq.${eivNode.id}`);
    
    console.log(chalk.green(`✅ EIV relationships: ${eivRelations?.length || 0}`));
    eivRelations?.forEach(rel => {
      if (rel.source?.label === 'EIV') {
        console.log(chalk.gray(`  - EIV --${rel.relationship_type}--> ${rel.target?.label}`));
      } else {
        console.log(chalk.gray(`  - ${rel.source?.label} --${rel.relationship_type}--> EIV`));
      }
    });
  }
}

async function testAgentQueries() {
  console.log(chalk.cyan('\n🤖 Testing Agent-Style Queries...'));
  
  // Simulate legal agent query for EIV
  console.log(chalk.yellow('\n1. Legal Agent - EIV Definition:'));
  
  const eivQuery = `
    SELECT 
      ldc.numero_artigo,
      ldc.title,
      ldc.content,
      kgn.label as concept
    FROM legal_document_chunks ldc
    JOIN knowledge_graph_edges kge ON kge.target_id IN (
      SELECT id FROM knowledge_graph_nodes WHERE label = 'EIV'
    )
    JOIN knowledge_graph_nodes kgn_source ON kge.source_id = kgn_source.id
    JOIN legal_document_chunks ldc_source ON ldc_source.numero_artigo = CAST(SUBSTRING(kgn_source.label FROM 'Art\\. (\\d+)') AS INTEGER)
    JOIN knowledge_graph_nodes kgn ON kge.target_id = kgn.id
    WHERE kge.relationship_type = 'DEFINES'
      AND ldc.numero_artigo = ldc_source.numero_artigo
  `;
  
  try {
    const { data: eivResults, error } = await supabase.rpc('exec_sql', { query: eivQuery });
    
    if (error) {
      console.log(chalk.red('❌ Query error:', error.message));
    } else {
      console.log(chalk.green(`✅ EIV definition query: ${eivResults?.length || 0} results`));
    }
  } catch (err) {
    // Try simpler approach
    const { data: eivChunk } = await supabase
      .from('legal_document_chunks')
      .select('*')
      .eq('numero_artigo', 89);
    
    const { data: eivConcept } = await supabase
      .from('knowledge_graph_nodes')
      .select('*')
      .eq('label', 'EIV');
    
    console.log(chalk.green(`✅ Simple approach: Art. 89 chunks: ${eivChunk?.length || 0}, EIV concepts: ${eivConcept?.length || 0}`));
    
    if (eivChunk?.length > 0 && eivConcept?.length > 0) {
      console.log(chalk.blue('✨ The data exists! Agent should be able to connect:'));
      console.log(chalk.gray(`   Article: ${eivChunk[0].title}`));
      console.log(chalk.gray(`   Concept: ${eivConcept[0].label} (${eivConcept[0].properties.full_name})`));
    }
  }
}

async function main() {
  console.log(chalk.bold.cyan('🔧 DATA RETRIEVAL DIAGNOSTIC\n'));
  
  await testDataRetrieval();
  await testAgentQueries();
  
  console.log(chalk.bold.green('\n🎯 DIAGNOSIS COMPLETE'));
  console.log(chalk.gray('If data exists but tests fail, the issue is in agent query logic.'));
}

main().catch(console.error);