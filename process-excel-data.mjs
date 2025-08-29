#!/usr/bin/env node

import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

/**
 * Script para processar arquivos Excel da knowledgebase
 * Extrai dados estruturados e gera SQL para importação
 */

const KNOWLEDGEBASE_PATH = './knowledgebase';
const OUTPUT_PATH = './processed-data';

// Criar diretório de saída se não existir
if (!fs.existsSync(OUTPUT_PATH)) {
    fs.mkdirSync(OUTPUT_PATH, { recursive: true });
}

/**
 * Função para ler e processar arquivo Excel
 */
function readExcelFile(filePath) {
    try {
        console.log(`Processando arquivo: ${filePath}`);
        const workbook = XLSX.readFile(filePath);
        
        const sheets = {};
        workbook.SheetNames.forEach(sheetName => {
            console.log(`  Processando planilha: ${sheetName}`);
            const worksheet = workbook.Sheets[sheetName];
            const data = XLSX.utils.sheet_to_json(worksheet, { 
                header: 1,
                defval: null,
                raw: false
            });
            
            // Remover linhas vazias
            const cleanData = data.filter(row => 
                row.some(cell => cell !== null && cell !== undefined && cell !== '')
            );
            
            sheets[sheetName] = {
                raw: cleanData,
                headers: cleanData[0] || [],
                data: cleanData.slice(1) || []
            };
            
            console.log(`    Linhas: ${cleanData.length - 1} (dados) + 1 (cabeçalho)`);
            console.log(`    Colunas: ${cleanData[0]?.length || 0}`);
        });
        
        return sheets;
    } catch (error) {
        console.error(`Erro ao processar ${filePath}:`, error.message);
        return null;
    }
}

/**
 * Processar arquivo de Regimes Urbanísticos
 */
function processRegimeUrbanistico(sheets) {
    console.log('\n=== PROCESSANDO REGIME URBANÍSTICO ===');
    
    const results = {};
    
    Object.keys(sheets).forEach(sheetName => {
        const sheet = sheets[sheetName];
        console.log(`\nPlanilha: ${sheetName}`);
        console.log(`Cabeçalhos: ${JSON.stringify(sheet.headers)}`);
        
        if (sheet.data.length > 0) {
            console.log(`Primeira linha de dados: ${JSON.stringify(sheet.data[0])}`);
            console.log(`Últimas 3 linhas de dados:`);
            sheet.data.slice(-3).forEach((row, index) => {
                console.log(`  ${sheet.data.length - 3 + index}: ${JSON.stringify(row)}`);
            });
        }
        
        results[sheetName] = {
            headers: sheet.headers,
            rowCount: sheet.data.length,
            sample: sheet.data.slice(0, 5) // Primeiras 5 linhas
        };
    });
    
    return results;
}

/**
 * Processar arquivo de ZOTs vs Bairros
 */
function processZotsVsBairros(sheets) {
    console.log('\n=== PROCESSANDO ZOTS VS BAIRROS ===');
    
    const results = {};
    
    Object.keys(sheets).forEach(sheetName => {
        const sheet = sheets[sheetName];
        console.log(`\nPlanilha: ${sheetName}`);
        console.log(`Cabeçalhos: ${JSON.stringify(sheet.headers)}`);
        
        if (sheet.data.length > 0) {
            console.log(`Primeira linha de dados: ${JSON.stringify(sheet.data[0])}`);
            console.log(`Últimas 3 linhas de dados:`);
            sheet.data.slice(-3).forEach((row, index) => {
                console.log(`  ${sheet.data.length - 3 + index}: ${JSON.stringify(row)}`);
            });
        }
        
        results[sheetName] = {
            headers: sheet.headers,
            rowCount: sheet.data.length,
            sample: sheet.data.slice(0, 5) // Primeiras 5 linhas
        };
    });
    
    return results;
}

/**
 * Gerar SQL baseado nos dados processados
 */
function generateSQL(regimeData, zotsData) {
    console.log('\n=== GERANDO SQL ===');
    
    let sql = `-- SQL gerado automaticamente em ${new Date().toISOString()}\n\n`;
    
    // SQL para tabela de regimes urbanísticos
    sql += `-- Tabela para Regimes Urbanísticos\n`;
    sql += `CREATE TABLE IF NOT EXISTS regime_urbanistico (\n`;
    sql += `    id SERIAL PRIMARY KEY,\n`;
    sql += `    created_at TIMESTAMP DEFAULT NOW(),\n`;
    sql += `    updated_at TIMESTAMP DEFAULT NOW()\n`;
    
    // Adicionar colunas baseadas nos cabeçalhos encontrados
    Object.keys(regimeData).forEach(sheetName => {
        const sheet = regimeData[sheetName];
        sql += `    -- Colunas da planilha: ${sheetName}\n`;
        sheet.headers.forEach((header, index) => {
            if (header && typeof header === 'string') {
                const columnName = header
                    .toLowerCase()
                    .replace(/[^a-z0-9]/g, '_')
                    .replace(/_+/g, '_')
                    .replace(/^_|_$/g, '');
                
                if (columnName) {
                    sql += `    -- ${columnName} TEXT, -- Original: "${header}"\n`;
                }
            }
        });
    });
    
    sql += `);\n\n`;
    
    // SQL para tabela de ZOTs vs Bairros
    sql += `-- Tabela para ZOTs vs Bairros\n`;
    sql += `CREATE TABLE IF NOT EXISTS zots_bairros (\n`;
    sql += `    id SERIAL PRIMARY KEY,\n`;
    sql += `    created_at TIMESTAMP DEFAULT NOW(),\n`;
    sql += `    updated_at TIMESTAMP DEFAULT NOW()\n`;
    
    // Adicionar colunas baseadas nos cabeçalhos encontrados
    Object.keys(zotsData).forEach(sheetName => {
        const sheet = zotsData[sheetName];
        sql += `    -- Colunas da planilha: ${sheetName}\n`;
        sheet.headers.forEach((header, index) => {
            if (header && typeof header === 'string') {
                const columnName = header
                    .toLowerCase()
                    .replace(/[^a-z0-9]/g, '_')
                    .replace(/_+/g, '_')
                    .replace(/^_|_$/g, '');
                
                if (columnName) {
                    sql += `    -- ${columnName} TEXT, -- Original: "${header}"\n`;
                }
            }
        });
    });
    
    sql += `);\n\n`;
    
    return sql;
}

/**
 * Salvar dados processados em JSON
 */
function saveProcessedData(regimeData, zotsData, sql) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    // Salvar dados estruturados
    const processedData = {
        timestamp,
        regimeUrbanistico: regimeData,
        zotsBairros: zotsData,
        summary: {
            regimeSheets: Object.keys(regimeData).length,
            zotsSheets: Object.keys(zotsData).length,
            totalRegimeRows: Object.values(regimeData).reduce((sum, sheet) => sum + sheet.rowCount, 0),
            totalZotsRows: Object.values(zotsData).reduce((sum, sheet) => sum + sheet.rowCount, 0)
        }
    };
    
    const jsonPath = path.join(OUTPUT_PATH, `processed-data-${timestamp}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(processedData, null, 2));
    console.log(`Dados processados salvos em: ${jsonPath}`);
    
    // Salvar SQL
    const sqlPath = path.join(OUTPUT_PATH, `database-schema-${timestamp}.sql`);
    fs.writeFileSync(sqlPath, sql);
    console.log(`Schema SQL salvo em: ${sqlPath}`);
    
    // Salvar sumário em formato legível
    const summaryPath = path.join(OUTPUT_PATH, `summary-${timestamp}.txt`);
    let summary = `SUMÁRIO DO PROCESSAMENTO - ${new Date().toLocaleString()}\n`;
    summary += `=".repeat(60)\n\n`;
    
    summary += `REGIME URBANÍSTICO:\n`;
    Object.keys(regimeData).forEach(sheetName => {
        const sheet = regimeData[sheetName];
        summary += `  Planilha: ${sheetName}\n`;
        summary += `    Linhas: ${sheet.rowCount}\n`;
        summary += `    Colunas: ${sheet.headers.length}\n`;
        summary += `    Cabeçalhos: ${sheet.headers.join(', ')}\n\n`;
    });
    
    summary += `ZOTS VS BAIRROS:\n`;
    Object.keys(zotsData).forEach(sheetName => {
        const sheet = zotsData[sheetName];
        summary += `  Planilha: ${sheetName}\n`;
        summary += `    Linhas: ${sheet.rowCount}\n`;
        summary += `    Colunas: ${sheet.headers.length}\n`;
        summary += `    Cabeçalhos: ${sheet.headers.join(', ')}\n\n`;
    });
    
    fs.writeFileSync(summaryPath, summary);
    console.log(`Sumário salvo em: ${summaryPath}`);
    
    return { jsonPath, sqlPath, summaryPath };
}

/**
 * Função principal
 */
async function main() {
    console.log('PROCESSADOR DE DADOS EXCEL - KNOWLEDGEBASE');
    console.log('='.repeat(50));
    
    const regimeFile = path.join(KNOWLEDGEBASE_PATH, 'PDPOA2025-Regime_Urbanistico.xlsx');
    const zotsFile = path.join(KNOWLEDGEBASE_PATH, 'PDPOA2025-ZOTs_vs_Bairros.xlsx');
    
    // Verificar se os arquivos existem
    if (!fs.existsSync(regimeFile)) {
        console.error(`Arquivo não encontrado: ${regimeFile}`);
        return;
    }
    
    if (!fs.existsSync(zotsFile)) {
        console.error(`Arquivo não encontrado: ${zotsFile}`);
        return;
    }
    
    try {
        // Processar arquivos
        const regimeSheets = readExcelFile(regimeFile);
        const zotsSheets = readExcelFile(zotsFile);
        
        if (!regimeSheets || !zotsSheets) {
            console.error('Erro ao processar um ou mais arquivos');
            return;
        }
        
        // Analisar dados
        const regimeData = processRegimeUrbanistico(regimeSheets);
        const zotsData = processZotsVsBairros(zotsSheets);
        
        // Gerar SQL
        const sql = generateSQL(regimeData, zotsData);
        
        // Salvar resultados
        const savedFiles = saveProcessedData(regimeData, zotsData, sql);
        
        console.log('\n=== PROCESSAMENTO CONCLUÍDO ===');
        console.log('Arquivos gerados:');
        console.log(`  JSON: ${savedFiles.jsonPath}`);
        console.log(`  SQL: ${savedFiles.sqlPath}`);
        console.log(`  Sumário: ${savedFiles.summaryPath}`);
        
    } catch (error) {
        console.error('Erro durante o processamento:', error);
    }
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(console.error);
}

export { main, readExcelFile, processRegimeUrbanistico, processZotsVsBairros };