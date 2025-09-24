#!/usr/bin/env node

/**
 * Script para Popular Knowledge Graph com Relações Jurídico-Urbanísticas
 * Cria nós e relações baseados nos documentos do Plano Diretor
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

// Definição dos nós principais do Knowledge Graph
const KNOWLEDGE_NODES = {
    laws: [
        {
            type: 'law',
            label: 'LUOS',
            properties: {
                full_name: 'Lei de Uso e Ocupação do Solo',
                year: 2025,
                status: 'vigente',
                total_articles: 150
            },
            importance: 1.0
        },
        {
            type: 'law',
            label: 'PDUS',
            properties: {
                full_name: 'Plano Diretor Urbano Sustentável',
                year: 2025,
                status: 'vigente',
                total_articles: 180
            },
            importance: 1.0
        }
    ],
    
    articles: [
        // LUOS - Artigos principais
        {
            type: 'article',
            label: 'LUOS - Art. 89',
            properties: {
                law: 'LUOS',
                number: 89,
                title: 'Estudo de Impacto de Vizinhança',
                defines: 'EIV'
            },
            importance: 0.95
        },
        {
            type: 'article',
            label: 'LUOS - Art. 81',
            properties: {
                law: 'LUOS',
                number: 81,
                title: 'Certificação em Sustentabilidade',
                defines: 'Certificação Ambiental'
            },
            importance: 0.85
        },
        {
            type: 'article',
            label: 'LUOS - Art. 86',
            properties: {
                law: 'LUOS',
                number: 86,
                title: 'Outorga Onerosa do Direito de Construir',
                defines: 'Outorga Onerosa'
            },
            importance: 0.9
        },
        {
            type: 'article',
            label: 'LUOS - Art. 82',
            properties: {
                law: 'LUOS',
                number: 82,
                title: 'Coeficiente de Aproveitamento',
                defines: 'Índices Construtivos'
            },
            importance: 0.9
        },
        {
            type: 'article',
            label: 'LUOS - Art. 83',
            properties: {
                law: 'LUOS',
                number: 83,
                title: 'Recuos Obrigatórios',
                defines: 'Afastamentos'
            },
            importance: 0.8
        },
        {
            type: 'article',
            label: 'LUOS - Art. 84',
            properties: {
                law: 'LUOS',
                number: 84,
                title: 'Taxa de Permeabilidade',
                defines: 'Área Permeável Mínima'
            },
            importance: 0.85
        },
        {
            type: 'article',
            label: 'LUOS - Art. 74',
            properties: {
                law: 'LUOS',
                number: 74,
                title: '4º Distrito',
                defines: 'Zona de Inovação'
            },
            importance: 0.9
        },
        
        // PDUS - Artigos principais
        {
            type: 'article',
            label: 'PDUS - Art. 92',
            properties: {
                law: 'PDUS',
                number: 92,
                title: 'Zonas Especiais de Interesse Social',
                defines: 'ZEIS'
            },
            importance: 0.95
        },
        {
            type: 'article',
            label: 'PDUS - Art. 95',
            properties: {
                law: 'PDUS',
                number: 95,
                title: 'Áreas de Preservação Permanente',
                defines: 'APP'
            },
            importance: 0.9
        },
        {
            type: 'article',
            label: 'PDUS - Art. 101',
            properties: {
                law: 'PDUS',
                number: 101,
                title: 'Habitação de Interesse Social',
                defines: 'HIS'
            },
            importance: 0.85
        },
        {
            type: 'article',
            label: 'PDUS - Art. 104',
            properties: {
                law: 'PDUS',
                number: 104,
                title: 'Conselho Municipal de Desenvolvimento Urbano Ambiental',
                defines: 'CMDUA'
            },
            importance: 0.8
        }
    ],
    
    concepts: [
        {
            type: 'concept',
            label: 'EIV',
            properties: {
                full_name: 'Estudo de Impacto de Vizinhança',
                category: 'instrumento_urbanistico',
                requires_approval: true
            },
            importance: 0.95
        },
        {
            type: 'concept',
            label: 'ZEIS',
            properties: {
                full_name: 'Zonas Especiais de Interesse Social',
                category: 'zoneamento',
                social_function: true
            },
            importance: 0.95
        },
        {
            type: 'concept',
            label: 'Outorga Onerosa',
            properties: {
                full_name: 'Outorga Onerosa do Direito de Construir',
                category: 'instrumento_financeiro',
                generates_revenue: true
            },
            importance: 0.9
        },
        {
            type: 'concept',
            label: 'APP',
            properties: {
                full_name: 'Área de Preservação Permanente',
                category: 'proteção_ambiental',
                restrictions: 'total'
            },
            importance: 0.9
        },
        {
            type: 'concept',
            label: 'Coeficiente de Aproveitamento',
            properties: {
                category: 'índice_urbanístico',
                type: 'multiplicador',
                applies_to: 'área_construída'
            },
            importance: 0.85
        },
        {
            type: 'concept',
            label: 'Taxa de Permeabilidade',
            properties: {
                category: 'índice_urbanístico',
                type: 'percentual',
                minimum: 0.15
            },
            importance: 0.8
        }
    ],
    
    zones: [
        {
            type: 'zone',
            label: 'ZOT 08.1',
            properties: {
                name: 'Centro Histórico',
                altura_maxima: 130,
                coef_basico: 2.0,
                coef_maximo: 4.0
            },
            importance: 0.9
        },
        {
            type: 'zone',
            label: 'ZOT 01',
            properties: {
                name: 'Zona Residencial 1',
                altura_maxima: 18,
                coef_basico: 1.0,
                coef_maximo: 1.5
            },
            importance: 0.7
        },
        {
            type: 'zone',
            label: 'ZOT 09',
            properties: {
                name: '4º Distrito',
                altura_maxima: 60,
                coef_basico: 1.5,
                coef_maximo: 3.0,
                special: 'innovation_district'
            },
            importance: 0.85
        }
    ],
    
    parameters: [
        {
            type: 'parameter',
            label: 'Altura Máxima',
            properties: {
                unit: 'metros',
                type: 'dimensional',
                varies_by: 'zone'
            },
            importance: 0.9
        },
        {
            type: 'parameter',
            label: 'Coeficiente Básico',
            properties: {
                type: 'multiplicador',
                free_right: true,
                varies_by: 'zone'
            },
            importance: 0.85
        },
        {
            type: 'parameter',
            label: 'Taxa de Ocupação',
            properties: {
                type: 'percentual',
                maximum: 0.75,
                varies_by: 'zone'
            },
            importance: 0.8
        }
    ]
};

// Definição das relações do Knowledge Graph
const KNOWLEDGE_RELATIONS = [
    // Leis definem artigos
    { source: 'LUOS', target: 'LUOS - Art. 89', type: 'CONTAINS', weight: 1.0 },
    { source: 'LUOS', target: 'LUOS - Art. 81', type: 'CONTAINS', weight: 1.0 },
    { source: 'LUOS', target: 'LUOS - Art. 86', type: 'CONTAINS', weight: 1.0 },
    { source: 'LUOS', target: 'LUOS - Art. 82', type: 'CONTAINS', weight: 1.0 },
    { source: 'PDUS', target: 'PDUS - Art. 92', type: 'CONTAINS', weight: 1.0 },
    { source: 'PDUS', target: 'PDUS - Art. 95', type: 'CONTAINS', weight: 1.0 },
    
    // Artigos definem conceitos
    { source: 'LUOS - Art. 89', target: 'EIV', type: 'DEFINES', weight: 1.0 },
    { source: 'PDUS - Art. 92', target: 'ZEIS', type: 'DEFINES', weight: 1.0 },
    { source: 'LUOS - Art. 86', target: 'Outorga Onerosa', type: 'DEFINES', weight: 1.0 },
    { source: 'PDUS - Art. 95', target: 'APP', type: 'DEFINES', weight: 1.0 },
    { source: 'LUOS - Art. 82', target: 'Coeficiente de Aproveitamento', type: 'DEFINES', weight: 1.0 },
    { source: 'LUOS - Art. 84', target: 'Taxa de Permeabilidade', type: 'DEFINES', weight: 1.0 },
    
    // Zonas têm parâmetros
    { source: 'ZOT 08.1', target: 'Altura Máxima', type: 'HAS_PARAMETER', weight: 0.9 },
    { source: 'ZOT 08.1', target: 'Coeficiente Básico', type: 'HAS_PARAMETER', weight: 0.9 },
    { source: 'ZOT 08.1', target: 'Taxa de Ocupação', type: 'HAS_PARAMETER', weight: 0.8 },
    { source: 'ZOT 01', target: 'Altura Máxima', type: 'HAS_PARAMETER', weight: 0.9 },
    { source: 'ZOT 09', target: 'Altura Máxima', type: 'HAS_PARAMETER', weight: 0.9 },
    
    // Referências cruzadas entre artigos
    { source: 'LUOS - Art. 89', target: 'LUOS - Art. 82', type: 'REFERENCES', weight: 0.7 },
    { source: 'LUOS - Art. 86', target: 'LUOS - Art. 82', type: 'REFERENCES', weight: 0.8 },
    { source: 'PDUS - Art. 92', target: 'PDUS - Art. 101', type: 'REFERENCES', weight: 0.9 },
    
    // Conceitos complementares
    { source: 'EIV', target: 'Outorga Onerosa', type: 'COMPLEMENTS', weight: 0.6 },
    { source: 'ZEIS', target: 'HIS', type: 'IMPLEMENTS', weight: 0.9 },
    { source: 'Coeficiente de Aproveitamento', target: 'Outorga Onerosa', type: 'REGULATES', weight: 0.8 }
];

/**
 * Cria ou atualiza um nó no Knowledge Graph
 */
async function createOrUpdateNode(node) {
    try {
        // Verificar se já existe
        const { data: existing } = await supabase
            .from('knowledge_graph_nodes')
            .select('id')
            .eq('label', node.label)
            .single();
        
        if (existing) {
            // Atualizar nó existente
            const { error } = await supabase
                .from('knowledge_graph_nodes')
                .update({
                    properties: node.properties,
                    importance_score: node.importance,
                    updated_at: new Date().toISOString()
                })
                .eq('id', existing.id);
            
            if (error) throw error;
            console.log(chalk.yellow(`  ⟲ Atualizado: ${node.label}`));
            return existing.id;
        } else {
            // Criar novo nó
            const { data, error } = await supabase
                .from('knowledge_graph_nodes')
                .insert({
                    node_type: node.type,
                    label: node.label,
                    properties: node.properties,
                    importance_score: node.importance
                })
                .select('id')
                .single();
            
            if (error) throw error;
            console.log(chalk.green(`  ✓ Criado: ${node.label}`));
            return data.id;
        }
    } catch (error) {
        console.error(chalk.red(`  ✗ Erro em ${node.label}:`), error.message);
        return null;
    }
}

/**
 * Cria uma relação entre dois nós
 */
async function createRelation(relation, nodeMap) {
    try {
        const sourceId = nodeMap[relation.source];
        const targetId = nodeMap[relation.target];
        
        if (!sourceId || !targetId) {
            console.log(chalk.yellow(`  ⚠️ Nós não encontrados para relação: ${relation.source} -> ${relation.target}`));
            return;
        }
        
        // Verificar se relação já existe
        const { data: existing } = await supabase
            .from('knowledge_graph_edges')
            .select('id')
            .eq('source_id', sourceId)
            .eq('target_id', targetId)
            .eq('relationship_type', relation.type)
            .single();
        
        if (existing) {
            console.log(chalk.gray(`  → Relação já existe: ${relation.source} -[${relation.type}]-> ${relation.target}`));
            return;
        }
        
        // Criar nova relação
        const { error } = await supabase
            .from('knowledge_graph_edges')
            .insert({
                source_id: sourceId,
                target_id: targetId,
                relationship_type: relation.type,
                weight: relation.weight || 1.0
            });
        
        if (error) throw error;
        console.log(chalk.green(`  → Criada: ${relation.source} -[${relation.type}]-> ${relation.target}`));
        
    } catch (error) {
        console.error(chalk.red(`  ✗ Erro na relação:`), error.message);
    }
}

/**
 * Popular Knowledge Graph completo
 */
async function populateKnowledgeGraph() {
    console.log(chalk.cyan.bold('\n🧠 POPULANDO KNOWLEDGE GRAPH\n'));
    
    const nodeMap = {};
    let totalNodes = 0;
    let totalRelations = 0;
    
    // Criar nós por categoria
    const categories = ['laws', 'articles', 'concepts', 'zones', 'parameters'];
    
    for (const category of categories) {
        const nodes = KNOWLEDGE_NODES[category];
        if (!nodes) continue;
        
        console.log(chalk.cyan(`\n📌 ${category.toUpperCase()} (${nodes.length} nós)`));
        
        for (const node of nodes) {
            const nodeId = await createOrUpdateNode(node);
            if (nodeId) {
                nodeMap[node.label] = nodeId;
                totalNodes++;
            }
        }
    }
    
    // Criar relações
    console.log(chalk.cyan(`\n🔗 RELAÇÕES (${KNOWLEDGE_RELATIONS.length} relações)`));
    
    for (const relation of KNOWLEDGE_RELATIONS) {
        await createRelation(relation, nodeMap);
        totalRelations++;
    }
    
    // Estatísticas finais
    console.log(chalk.cyan.bold('\n📊 RESUMO'));
    console.log(chalk.white(`  Total de nós: ${totalNodes}`));
    console.log(chalk.white(`  Total de relações: ${totalRelations}`));
    
    // Testar traversal
    await testGraphTraversal();
}

/**
 * Testa traversal do Knowledge Graph
 */
async function testGraphTraversal() {
    console.log(chalk.cyan.bold('\n🧪 TESTANDO TRAVERSAL DO KNOWLEDGE GRAPH\n'));
    
    try {
        // Teste 1: Encontrar tudo relacionado ao EIV
        console.log(chalk.yellow('Teste 1: Relações do EIV'));
        const { data: eivRelations, error: error1 } = await supabase
            .rpc('traverse_knowledge_graph', {
                start_node_label: 'EIV',
                max_depth: 2
            });
        
        if (error1) throw error1;
        
        console.log(chalk.gray('  Nós relacionados:'));
        eivRelations?.forEach(node => {
            console.log(chalk.gray(`    - ${node.node_label} (${node.node_type}, profundidade: ${node.depth})`));
        });
        
        // Teste 2: Encontrar artigos da LUOS
        console.log(chalk.yellow('\nTeste 2: Artigos da LUOS'));
        const { data: luosArticles, error: error2 } = await supabase
            .from('knowledge_graph_edges')
            .select(`
                target:target_id (
                    label,
                    properties
                )
            `)
            .eq('source_id', (
                await supabase
                    .from('knowledge_graph_nodes')
                    .select('id')
                    .eq('label', 'LUOS')
                    .single()
            ).data?.id)
            .eq('relationship_type', 'CONTAINS');
        
        if (error2) throw error2;
        
        console.log(chalk.gray('  Artigos encontrados:'));
        luosArticles?.forEach(rel => {
            console.log(chalk.gray(`    - ${rel.target.label}`));
        });
        
    } catch (error) {
        console.error(chalk.red('Erro no teste de traversal:'), error.message);
    }
}

/**
 * Função principal
 */
async function main() {
    try {
        await populateKnowledgeGraph();
        
        console.log(chalk.green.bold('\n✅ Knowledge Graph populado com sucesso!\n'));
        
    } catch (error) {
        console.error(chalk.red.bold('\n❌ Erro ao popular Knowledge Graph:'), error);
        process.exit(1);
    }
}

// Executar
main();