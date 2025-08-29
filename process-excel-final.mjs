#!/usr/bin/env node

import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

/**
 * Script final para processar arquivos Excel da knowledgebase
 * Baseado na estrutura real dos dados encontrados
 */

const KNOWLEDGEBASE_PATH = './knowledgebase';
const OUTPUT_PATH = './processed-data';

// Criar diretório de saída se não existir
if (!fs.existsSync(OUTPUT_PATH)) {
    fs.mkdirSync(OUTPUT_PATH, { recursive: true });
    console.log(`Diretório criado: ${OUTPUT_PATH}`);
}

/**
 * Função para processar arquivo de Regime Urbanístico
 */
function processRegimeUrbanistico() {
    console.log('\n=== PROCESSANDO REGIME URBANÍSTICO ===');
    
    const filePath = path.join(KNOWLEDGEBASE_PATH, 'PDPOA2025-Regime_Urbanistico.xlsx');
    
    try {
        const workbook = XLSX.readFile(filePath);
        const sheet = workbook.Sheets['Sheet'];
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        
        console.log(`Total de linhas: ${data.length}`);
        
        const headers = data[0];
        const rows = data.slice(1);
        
        console.log(`Cabeçalhos (${headers.length}):`);
        headers.forEach((header, index) => {
            console.log(`  ${index + 1}: ${header}`);
        });
        
        console.log(`\nPrimeiras 3 linhas de dados:`);
        rows.slice(0, 3).forEach((row, index) => {
            console.log(`  Linha ${index + 1}: Bairro=${row[1]}, Zona=${row[2]}`);
        });
        
        // Análise dos dados
        const bairros = new Set();
        const zonas = new Set();
        
        rows.forEach(row => {
            if (row[1]) bairros.add(row[1]);
            if (row[2]) zonas.add(row[2]);
        });
        
        console.log(`\nEstatísticas:`);
        console.log(`  Bairros únicos: ${bairros.size}`);
        console.log(`  Zonas únicas: ${zonas.size}`);
        console.log(`  Registros válidos: ${rows.filter(row => row[1] && row[2]).length}`);
        
        return {
            headers,
            data: rows,
            stats: {
                totalRows: rows.length,
                uniqueBairros: Array.from(bairros).sort(),
                uniqueZonas: Array.from(zonas).sort()
            }
        };
        
    } catch (error) {
        console.error('Erro ao processar Regime Urbanístico:', error);
        return null;
    }
}

/**
 * Função para processar arquivo de ZOTs vs Bairros
 */
function processZotsVsBairros() {
    console.log('\n=== PROCESSANDO ZOTS VS BAIRROS ===');
    
    const filePath = path.join(KNOWLEDGEBASE_PATH, 'PDPOA2025-ZOTs_vs_Bairros.xlsx');
    
    try {
        const workbook = XLSX.readFile(filePath);
        const sheet = workbook.Sheets['Sheet'];
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        
        console.log(`Total de linhas: ${data.length}`);
        
        const headers = data[0];
        const rows = data.slice(1);
        
        console.log(`Cabeçalhos: ${headers.join(', ')}`);
        
        console.log(`\nPrimeiras 5 linhas de dados:`);
        rows.slice(0, 5).forEach((row, index) => {
            console.log(`  ${index + 1}: Bairro=${row[1]}, Zona=${row[2]}, Total_Zonas=${row[3]}, Zona_Especial=${row[4]}`);
        });
        
        // Análise dos dados
        const bairros = new Set();
        const zonas = new Set();
        const bairrosComZonaEspecial = new Set();
        
        rows.forEach(row => {
            if (row[1]) bairros.add(row[1]);
            if (row[2]) zonas.add(row[2]);
            if (row[4] === 'Sim' && row[1]) bairrosComZonaEspecial.add(row[1]);
        });
        
        console.log(`\nEstatísticas:`);
        console.log(`  Bairros únicos: ${bairros.size}`);
        console.log(`  Zonas únicas: ${zonas.size}`);
        console.log(`  Bairros com zona especial: ${bairrosComZonaEspecial.size}`);
        
        return {
            headers,
            data: rows,
            stats: {
                totalRows: rows.length,
                uniqueBairros: Array.from(bairros).sort(),
                uniqueZonas: Array.from(zonas).sort(),
                bairrosComZonaEspecial: Array.from(bairrosComZonaEspecial).sort()
            }
        };
        
    } catch (error) {
        console.error('Erro ao processar ZOTs vs Bairros:', error);
        return null;
    }
}

/**
 * Gerar SQL para criação das tabelas e importação
 */
function generateSQL(regimeData, zotsData) {
    console.log('\n=== GERANDO SQL ===');
    
    const timestamp = new Date().toISOString();
    let sql = `-- SQL gerado automaticamente em ${timestamp}\n`;
    sql += `-- Dados extraídos dos arquivos Excel da knowledgebase\n\n`;
    
    // Tabela de Regime Urbanístico
    sql += `-- =============================================\n`;
    sql += `-- TABELA: regime_urbanistico\n`;
    sql += `-- Fonte: PDPOA2025-Regime_Urbanistico.xlsx\n`;
    sql += `-- =============================================\n\n`;
    
    sql += `DROP TABLE IF EXISTS regime_urbanistico;\n\n`;
    
    sql += `CREATE TABLE regime_urbanistico (\n`;
    sql += `    id SERIAL PRIMARY KEY,\n`;
    sql += `    bairro TEXT NOT NULL,\n`;
    sql += `    zona TEXT NOT NULL,\n`;
    sql += `    altura_maxima_edificacao_isolada TEXT,\n`;
    sql += `    coef_aproveitamento_basico TEXT,\n`;
    sql += `    coef_aproveitamento_maximo TEXT,\n`;
    sql += `    area_minima_lote TEXT,\n`;
    sql += `    testada_minima_lote TEXT,\n`;
    sql += `    modulo_fracionamento TEXT,\n`;
    sql += `    face_maxima_quarteirao TEXT,\n`;
    sql += `    area_maxima_quarteirao TEXT,\n`;
    sql += `    area_minima_quarteirao TEXT,\n`;
    sql += `    enquadramento_fracionamento TEXT,\n`;
    sql += `    area_publica_viaria_fracionamento TEXT,\n`;
    sql += `    area_publica_equipamentos_fracionamento TEXT,\n`;
    sql += `    enquadramento_desmembramento_tipo1 TEXT,\n`;
    sql += `    area_publica_viaria_desmembramento_tipo1 TEXT,\n`;
    sql += `    area_publica_equipamentos_desmembramento_tipo1 TEXT,\n`;
    sql += `    enquadramento_desmembramento_tipo2 TEXT,\n`;
    sql += `    area_publica_viaria_desmembramento_tipo2 TEXT,\n`;
    sql += `    area_publica_equipamentos_desmembramento_tipo2 TEXT,\n`;
    sql += `    enquadramento_desmembramento_tipo3 TEXT,\n`;
    sql += `    area_publica_viaria_desmembramento_tipo3 TEXT,\n`;
    sql += `    area_publica_equipamentos_desmembramento_tipo3 TEXT,\n`;
    sql += `    enquadramento_loteamento TEXT,\n`;
    sql += `    area_publica_viaria_loteamento TEXT,\n`;
    sql += `    area_publica_equipamentos_loteamento TEXT,\n`;
    sql += `    coef_aproveitamento_basico_4d TEXT,\n`;
    sql += `    coef_aproveitamento_maximo_4d TEXT,\n`;
    sql += `    afastamentos_frente TEXT,\n`;
    sql += `    afastamentos_laterais TEXT,\n`;
    sql += `    afastamentos_fundos TEXT,\n`;
    sql += `    taxa_permeabilidade_acima_1500 TEXT,\n`;
    sql += `    taxa_permeabilidade_ate_1500 TEXT,\n`;
    sql += `    fator_conversao_taxa_permeabilidade TEXT,\n`;
    sql += `    recuo_jardim TEXT,\n`;
    sql += `    comercio_varejista_inocuo TEXT,\n`;
    sql += `    comercio_varejista_ia1 TEXT,\n`;
    sql += `    comercio_varejista_ia2 TEXT,\n`;
    sql += `    comercio_atacadista_ia1 TEXT,\n`;
    sql += `    comercio_atacadista_ia2 TEXT,\n`;
    sql += `    comercio_atacadista_ia3 TEXT,\n`;
    sql += `    servico_inocuo TEXT,\n`;
    sql += `    servico_ia1 TEXT,\n`;
    sql += `    servico_ia2 TEXT,\n`;
    sql += `    servico_ia3 TEXT,\n`;
    sql += `    industria_inocua TEXT,\n`;
    sql += `    industria_interferencia_ambiental TEXT,\n`;
    sql += `    nivel_controle_entretenimento_noturno TEXT,\n`;
    sql += `    created_at TIMESTAMP DEFAULT NOW(),\n`;
    sql += `    updated_at TIMESTAMP DEFAULT NOW()\n`;
    sql += `);\n\n`;
    
    // Tabela de ZOTs vs Bairros
    sql += `-- =============================================\n`;
    sql += `-- TABELA: zots_bairros\n`;
    sql += `-- Fonte: PDPOA2025-ZOTs_vs_Bairros.xlsx\n`;
    sql += `-- =============================================\n\n`;
    
    sql += `DROP TABLE IF EXISTS zots_bairros;\n\n`;
    
    sql += `CREATE TABLE zots_bairros (\n`;
    sql += `    id SERIAL PRIMARY KEY,\n`;
    sql += `    bairro TEXT NOT NULL,\n`;
    sql += `    zona TEXT NOT NULL,\n`;
    sql += `    total_zonas_no_bairro INTEGER,\n`;
    sql += `    tem_zona_especial BOOLEAN DEFAULT FALSE,\n`;
    sql += `    created_at TIMESTAMP DEFAULT NOW(),\n`;
    sql += `    updated_at TIMESTAMP DEFAULT NOW()\n`;
    sql += `);\n\n`;
    
    // Índices
    sql += `-- =============================================\n`;
    sql += `-- ÍNDICES\n`;
    sql += `-- =============================================\n\n`;
    
    sql += `CREATE INDEX idx_regime_urbanistico_bairro ON regime_urbanistico(bairro);\n`;
    sql += `CREATE INDEX idx_regime_urbanistico_zona ON regime_urbanistico(zona);\n`;
    sql += `CREATE INDEX idx_regime_urbanistico_bairro_zona ON regime_urbanistico(bairro, zona);\n\n`;
    
    sql += `CREATE INDEX idx_zots_bairros_bairro ON zots_bairros(bairro);\n`;
    sql += `CREATE INDEX idx_zots_bairros_zona ON zots_bairros(zona);\n`;
    sql += `CREATE INDEX idx_zots_bairros_zona_especial ON zots_bairros(tem_zona_especial);\n\n`;
    
    // Comentários sobre os dados
    sql += `-- =============================================\n`;
    sql += `-- COMENTÁRIOS SOBRE OS DADOS\n`;
    sql += `-- =============================================\n\n`;
    
    if (regimeData) {
        sql += `-- REGIME URBANÍSTICO:\n`;
        sql += `--   Total de registros: ${regimeData.stats.totalRows}\n`;
        sql += `--   Bairros únicos: ${regimeData.stats.uniqueBairros.length}\n`;
        sql += `--   Zonas únicas: ${regimeData.stats.uniqueZonas.length}\n\n`;
    }
    
    if (zotsData) {
        sql += `-- ZOTS VS BAIRROS:\n`;
        sql += `--   Total de registros: ${zotsData.stats.totalRows}\n`;
        sql += `--   Bairros únicos: ${zotsData.stats.uniqueBairros.length}\n`;
        sql += `--   Zonas únicas: ${zotsData.stats.uniqueZonas.length}\n`;
        sql += `--   Bairros com zona especial: ${zotsData.stats.bairrosComZonaEspecial.length}\n\n`;
    }
    
    return sql;
}

/**
 * Gerar script de importação dos dados
 */
function generateImportScript(regimeData, zotsData) {
    console.log('\n=== GERANDO SCRIPT DE IMPORTAÇÃO ===');
    
    let importSQL = `-- Script de importação dos dados\n`;
    importSQL += `-- Gerado em ${new Date().toISOString()}\n\n`;
    
    // Importação do Regime Urbanístico
    if (regimeData) {
        importSQL += `-- =============================================\n`;
        importSQL += `-- IMPORTAÇÃO: regime_urbanistico\n`;
        importSQL += `-- =============================================\n\n`;
        
        importSQL += `INSERT INTO regime_urbanistico (\n`;
        importSQL += `    bairro, zona, altura_maxima_edificacao_isolada, coef_aproveitamento_basico,\n`;
        importSQL += `    coef_aproveitamento_maximo, area_minima_lote, testada_minima_lote,\n`;
        importSQL += `    modulo_fracionamento, face_maxima_quarteirao, area_maxima_quarteirao,\n`;
        importSQL += `    area_minima_quarteirao, enquadramento_fracionamento,\n`;
        importSQL += `    area_publica_viaria_fracionamento, area_publica_equipamentos_fracionamento,\n`;
        importSQL += `    enquadramento_desmembramento_tipo1, area_publica_viaria_desmembramento_tipo1,\n`;
        importSQL += `    area_publica_equipamentos_desmembramento_tipo1, enquadramento_desmembramento_tipo2,\n`;
        importSQL += `    area_publica_viaria_desmembramento_tipo2, area_publica_equipamentos_desmembramento_tipo2,\n`;
        importSQL += `    enquadramento_desmembramento_tipo3, area_publica_viaria_desmembramento_tipo3,\n`;
        importSQL += `    area_publica_equipamentos_desmembramento_tipo3, enquadramento_loteamento,\n`;
        importSQL += `    area_publica_viaria_loteamento, area_publica_equipamentos_loteamento,\n`;
        importSQL += `    coef_aproveitamento_basico_4d, coef_aproveitamento_maximo_4d,\n`;
        importSQL += `    afastamentos_frente, afastamentos_laterais, afastamentos_fundos,\n`;
        importSQL += `    taxa_permeabilidade_acima_1500, taxa_permeabilidade_ate_1500,\n`;
        importSQL += `    fator_conversao_taxa_permeabilidade, recuo_jardim, comercio_varejista_inocuo,\n`;
        importSQL += `    comercio_varejista_ia1, comercio_varejista_ia2, comercio_atacadista_ia1,\n`;
        importSQL += `    comercio_atacadista_ia2, comercio_atacadista_ia3, servico_inocuo,\n`;
        importSQL += `    servico_ia1, servico_ia2, servico_ia3, industria_inocua,\n`;
        importSQL += `    industria_interferencia_ambiental, nivel_controle_entretenimento_noturno\n`;
        importSQL += `) VALUES\n`;
        
        const regimeValues = regimeData.data.slice(0, 10).map(row => {
            const values = row.map(cell => {
                if (cell === null || cell === undefined || cell === '') {
                    return 'NULL';
                }
                return `'${String(cell).replace(/'/g, "''")}'`;
            });
            
            // Preencher com NULL se houver menos colunas
            while (values.length < 47) { // 47 colunas de dados
                values.push('NULL');
            }
            
            return `    (${values.slice(1).join(', ')})`;
        });
        
        importSQL += regimeValues.join(',\n');
        importSQL += `;\n\n`;
        
        importSQL += `-- Nota: Apenas as primeiras 10 linhas foram incluídas como exemplo\n`;
        importSQL += `-- Para importar todos os dados, use um script de importação em lote\n\n`;
    }
    
    // Importação do ZOTs vs Bairros
    if (zotsData) {
        importSQL += `-- =============================================\n`;
        importSQL += `-- IMPORTAÇÃO: zots_bairros\n`;
        importSQL += `-- =============================================\n\n`;
        
        importSQL += `INSERT INTO zots_bairros (bairro, zona, total_zonas_no_bairro, tem_zona_especial) VALUES\n`;
        
        const zotsValues = zotsData.data.slice(0, 10).map(row => {
            const bairro = row[1] || '';
            const zona = row[2] || '';
            const totalZonas = row[3] || 0;
            const temZonaEspecial = row[4] === 'Sim' ? 'TRUE' : 'FALSE';
            
            return `    ('${bairro.replace(/'/g, "''")}', '${zona.replace(/'/g, "''")}', ${totalZonas}, ${temZonaEspecial})`;
        });
        
        importSQL += zotsValues.join(',\n');
        importSQL += `;\n\n`;
        
        importSQL += `-- Nota: Apenas as primeiras 10 linhas foram incluídas como exemplo\n`;
        importSQL += `-- Para importar todos os dados, use um script de importação em lote\n\n`;
    }
    
    return importSQL;
}

/**
 * Salvar todos os arquivos gerados
 */
function saveAllFiles(regimeData, zotsData, sql, importSQL) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    // Dados processados em JSON
    const processedData = {
        timestamp: new Date().toISOString(),
        regimeUrbanistico: regimeData,
        zotsBairros: zotsData,
        summary: {
            regimeRows: regimeData?.stats?.totalRows || 0,
            zotsRows: zotsData?.stats?.totalRows || 0,
            totalBairros: new Set([
                ...(regimeData?.stats?.uniqueBairros || []),
                ...(zotsData?.stats?.uniqueBairros || [])
            ]).size,
            totalZonas: new Set([
                ...(regimeData?.stats?.uniqueZonas || []),
                ...(zotsData?.stats?.uniqueZonas || [])
            ]).size
        }
    };
    
    const files = [];
    
    // Salvar JSON
    const jsonPath = path.join(OUTPUT_PATH, `excel-data-processed-${timestamp}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(processedData, null, 2));
    files.push(jsonPath);
    console.log(`✓ Dados JSON salvos: ${jsonPath}`);
    
    // Salvar SQL Schema
    const sqlPath = path.join(OUTPUT_PATH, `database-schema-${timestamp}.sql`);
    fs.writeFileSync(sqlPath, sql);
    files.push(sqlPath);
    console.log(`✓ Schema SQL salvo: ${sqlPath}`);
    
    // Salvar SQL Import
    const importPath = path.join(OUTPUT_PATH, `import-data-${timestamp}.sql`);
    fs.writeFileSync(importPath, importSQL);
    files.push(importPath);
    console.log(`✓ Script de importação salvo: ${importPath}`);
    
    // Salvar relatório em texto
    const reportPath = path.join(OUTPUT_PATH, `processing-report-${timestamp}.txt`);
    let report = `RELATÓRIO DE PROCESSAMENTO DOS ARQUIVOS EXCEL\n`;
    report += `${'='.repeat(60)}\n\n`;
    report += `Data/Hora: ${new Date().toLocaleString()}\n\n`;
    
    if (regimeData) {
        report += `REGIME URBANÍSTICO:\n`;
        report += `  Arquivo: PDPOA2025-Regime_Urbanistico.xlsx\n`;
        report += `  Registros: ${regimeData.stats.totalRows}\n`;
        report += `  Bairros únicos: ${regimeData.stats.uniqueBairros.length}\n`;
        report += `  Zonas únicas: ${regimeData.stats.uniqueZonas.length}\n`;
        report += `  Colunas: ${regimeData.headers.length}\n\n`;
        
        report += `  Bairros encontrados: ${regimeData.stats.uniqueBairros.slice(0, 10).join(', ')}${regimeData.stats.uniqueBairros.length > 10 ? '...' : ''}\n`;
        report += `  Zonas encontradas: ${regimeData.stats.uniqueZonas.slice(0, 10).join(', ')}${regimeData.stats.uniqueZonas.length > 10 ? '...' : ''}\n\n`;
    }
    
    if (zotsData) {
        report += `ZOTS VS BAIRROS:\n`;
        report += `  Arquivo: PDPOA2025-ZOTs_vs_Bairros.xlsx\n`;
        report += `  Registros: ${zotsData.stats.totalRows}\n`;
        report += `  Bairros únicos: ${zotsData.stats.uniqueBairros.length}\n`;
        report += `  Zonas únicas: ${zotsData.stats.uniqueZonas.length}\n`;
        report += `  Bairros com zona especial: ${zotsData.stats.bairrosComZonaEspecial.length}\n\n`;
        
        report += `  Bairros com zona especial: ${zotsData.stats.bairrosComZonaEspecial.slice(0, 10).join(', ')}${zotsData.stats.bairrosComZonaEspecial.length > 10 ? '...' : ''}\n\n`;
    }
    
    report += `ARQUIVOS GERADOS:\n`;
    files.forEach(file => {
        report += `  - ${file}\n`;
    });
    
    fs.writeFileSync(reportPath, report);
    files.push(reportPath);
    console.log(`✓ Relatório salvo: ${reportPath}`);
    
    return files;
}

/**
 * Função principal
 */
async function main() {
    console.log('PROCESSADOR DE DADOS EXCEL - KNOWLEDGEBASE');
    console.log('='.repeat(60));
    
    try {
        // Processar arquivos
        const regimeData = processRegimeUrbanistico();
        const zotsData = processZotsVsBairros();
        
        if (!regimeData && !zotsData) {
            console.error('Nenhum arquivo foi processado com sucesso');
            return;
        }
        
        // Gerar SQL
        const sql = generateSQL(regimeData, zotsData);
        const importSQL = generateImportScript(regimeData, zotsData);
        
        // Salvar todos os arquivos
        const savedFiles = saveAllFiles(regimeData, zotsData, sql, importSQL);
        
        console.log('\n' + '='.repeat(60));
        console.log('PROCESSAMENTO CONCLUÍDO COM SUCESSO!');
        console.log('='.repeat(60));
        console.log(`Arquivos gerados: ${savedFiles.length}`);
        savedFiles.forEach(file => console.log(`  ✓ ${file}`));
        
        console.log('\nPróximos passos:');
        console.log('  1. Execute o schema SQL no banco de dados');
        console.log('  2. Use o script de importação para carregar os dados');
        console.log('  3. Verifique os dados importados');
        
    } catch (error) {
        console.error('Erro durante o processamento:', error);
    }
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(console.error);
}