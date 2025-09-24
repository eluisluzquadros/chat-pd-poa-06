const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

console.log('=== PROCESSADOR SIMPLES DE ARQUIVOS EXCEL ===');

// Criar diretório de saída
const outputDir = './processed-data';
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log(`Diretório criado: ${outputDir}`);
}

// Processar Regime Urbanístico
function processRegimeUrbanistico() {
    console.log('\n--- PROCESSANDO REGIME URBANÍSTICO ---');
    
    try {
        const filePath = './knowledgebase/PDPOA2025-Regime_Urbanistico.xlsx';
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        console.log(`Planilha: ${sheetName}`);
        console.log(`Total de linhas: ${data.length}`);
        console.log(`Cabeçalhos: ${data[0].length} colunas`);
        
        // Análise dos dados
        const headers = data[0];
        const rows = data.slice(1);
        
        const bairros = new Set();
        const zonas = new Set();
        
        rows.forEach(row => {
            if (row[1]) bairros.add(row[1]); // Coluna Bairro
            if (row[2]) zonas.add(row[2]);   // Coluna Zona
        });
        
        const result = {
            source: 'PDPOA2025-Regime_Urbanistico.xlsx',
            sheet: sheetName,
            headers: headers,
            totalRows: rows.length,
            uniqueBairros: Array.from(bairros).sort(),
            uniqueZonas: Array.from(zonas).sort(),
            sampleData: rows.slice(0, 5) // Primeiras 5 linhas
        };
        
        console.log(`Bairros únicos: ${result.uniqueBairros.length}`);
        console.log(`Zonas únicas: ${result.uniqueZonas.length}`);
        
        // Salvar resultado
        const outputFile = path.join(outputDir, 'regime-urbanistico-processed.json');
        fs.writeFileSync(outputFile, JSON.stringify(result, null, 2));
        console.log(`Dados salvos em: ${outputFile}`);
        
        return result;
        
    } catch (error) {
        console.error('Erro ao processar Regime Urbanístico:', error.message);
        return null;
    }
}

// Processar ZOTs vs Bairros
function processZotsVsBairros() {
    console.log('\n--- PROCESSANDO ZOTS VS BAIRROS ---');
    
    try {
        const filePath = './knowledgebase/PDPOA2025-ZOTs_vs_Bairros.xlsx';
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        console.log(`Planilha: ${sheetName}`);
        console.log(`Total de linhas: ${data.length}`);
        console.log(`Cabeçalhos: ${JSON.stringify(data[0])}`);
        
        // Análise dos dados
        const headers = data[0];
        const rows = data.slice(1);
        
        const bairros = new Set();
        const zonas = new Set();
        const bairrosComZonaEspecial = new Set();
        
        rows.forEach(row => {
            if (row[1]) bairros.add(row[1]); // Coluna Bairro
            if (row[2]) zonas.add(row[2]);   // Coluna Zona
            if (row[4] === 'Sim' && row[1]) bairrosComZonaEspecial.add(row[1]); // Tem zona especial
        });
        
        const result = {
            source: 'PDPOA2025-ZOTs_vs_Bairros.xlsx',
            sheet: sheetName,
            headers: headers,
            totalRows: rows.length,
            uniqueBairros: Array.from(bairros).sort(),
            uniqueZonas: Array.from(zonas).sort(),
            bairrosComZonaEspecial: Array.from(bairrosComZonaEspecial).sort(),
            sampleData: rows.slice(0, 5) // Primeiras 5 linhas
        };
        
        console.log(`Bairros únicos: ${result.uniqueBairros.length}`);
        console.log(`Zonas únicas: ${result.uniqueZonas.length}`);
        console.log(`Bairros com zona especial: ${result.bairrosComZonaEspecial.length}`);
        
        // Salvar resultado
        const outputFile = path.join(outputDir, 'zots-bairros-processed.json');
        fs.writeFileSync(outputFile, JSON.stringify(result, null, 2));
        console.log(`Dados salvos em: ${outputFile}`);
        
        return result;
        
    } catch (error) {
        console.error('Erro ao processar ZOTs vs Bairros:', error.message);
        return null;
    }
}

// Gerar SQL Schema
function generateSQLSchema(regimeData, zotsData) {
    console.log('\n--- GERANDO SCHEMA SQL ---');
    
    let sql = `-- Schema SQL gerado em ${new Date().toISOString()}\n\n`;
    
    // Tabela regime_urbanistico
    if (regimeData) {
        sql += `-- Tabela para dados de Regime Urbanístico\n`;
        sql += `-- Fonte: ${regimeData.source}\n`;
        sql += `-- Registros: ${regimeData.totalRows}\n`;
        sql += `DROP TABLE IF EXISTS regime_urbanistico;\n\n`;
        
        sql += `CREATE TABLE regime_urbanistico (\n`;
        sql += `    id SERIAL PRIMARY KEY,\n`;
        sql += `    bairro TEXT NOT NULL,\n`;
        sql += `    zona TEXT NOT NULL,\n`;
        
        // Adicionar colunas baseadas nos cabeçalhos
        regimeData.headers.slice(3).forEach((header, index) => {
            if (header && typeof header === 'string') {
                const columnName = header
                    .toLowerCase()
                    .replace(/[^a-z0-9]/g, '_')
                    .replace(/_+/g, '_')
                    .replace(/^_|_$/g, '');
                
                if (columnName && columnName.length > 0) {
                    sql += `    ${columnName} TEXT, -- ${header}\n`;
                }
            }
        });
        
        sql += `    created_at TIMESTAMP DEFAULT NOW(),\n`;
        sql += `    updated_at TIMESTAMP DEFAULT NOW()\n`;
        sql += `);\n\n`;
        
        sql += `CREATE INDEX idx_regime_bairro ON regime_urbanistico(bairro);\n`;
        sql += `CREATE INDEX idx_regime_zona ON regime_urbanistico(zona);\n\n`;
    }
    
    // Tabela zots_bairros
    if (zotsData) {
        sql += `-- Tabela para dados de ZOTs vs Bairros\n`;
        sql += `-- Fonte: ${zotsData.source}\n`;
        sql += `-- Registros: ${zotsData.totalRows}\n`;
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
        
        sql += `CREATE INDEX idx_zots_bairro ON zots_bairros(bairro);\n`;
        sql += `CREATE INDEX idx_zots_zona ON zots_bairros(zona);\n`;
        sql += `CREATE INDEX idx_zots_zona_especial ON zots_bairros(tem_zona_especial);\n\n`;
    }
    
    // Salvar arquivo SQL
    const sqlFile = path.join(outputDir, 'database-schema.sql');
    fs.writeFileSync(sqlFile, sql);
    console.log(`Schema SQL salvo em: ${sqlFile}`);
    
    return sql;
}

// Gerar relatório final
function generateReport(regimeData, zotsData) {
    console.log('\n--- GERANDO RELATÓRIO ---');
    
    let report = `RELATÓRIO DE PROCESSAMENTO DOS ARQUIVOS EXCEL\n`;
    report += `${'='.repeat(60)}\n`;
    report += `Data: ${new Date().toLocaleString()}\n\n`;
    
    if (regimeData) {
        report += `REGIME URBANÍSTICO:\n`;
        report += `  Arquivo: ${regimeData.source}\n`;
        report += `  Planilha: ${regimeData.sheet}\n`;
        report += `  Total de registros: ${regimeData.totalRows}\n`;
        report += `  Bairros únicos: ${regimeData.uniqueBairros.length}\n`;
        report += `  Zonas únicas: ${regimeData.uniqueZonas.length}\n`;
        report += `  Colunas: ${regimeData.headers.length}\n\n`;
        
        report += `  Primeiros 10 bairros: ${regimeData.uniqueBairros.slice(0, 10).join(', ')}\n`;
        report += `  Primeiras 10 zonas: ${regimeData.uniqueZonas.slice(0, 10).join(', ')}\n\n`;
    }
    
    if (zotsData) {
        report += `ZOTS VS BAIRROS:\n`;
        report += `  Arquivo: ${zotsData.source}\n`;
        report += `  Planilha: ${zotsData.sheet}\n`;
        report += `  Total de registros: ${zotsData.totalRows}\n`;
        report += `  Bairros únicos: ${zotsData.uniqueBairros.length}\n`;
        report += `  Zonas únicas: ${zotsData.uniqueZonas.length}\n`;
        report += `  Bairros com zona especial: ${zotsData.bairrosComZonaEspecial.length}\n\n`;
        
        report += `  Bairros com zona especial: ${zotsData.bairrosComZonaEspecial.join(', ')}\n\n`;
    }
    
    // Análise cruzada
    if (regimeData && zotsData) {
        const bairrosComuns = regimeData.uniqueBairros.filter(b => 
            zotsData.uniqueBairros.includes(b)
        );
        const zonasComuns = regimeData.uniqueZonas.filter(z => 
            zotsData.uniqueZonas.includes(z)
        );
        
        report += `ANÁLISE CRUZADA:\n`;
        report += `  Bairros em ambos os arquivos: ${bairrosComuns.length}\n`;
        report += `  Zonas em ambos os arquivos: ${zonasComuns.length}\n\n`;
    }
    
    const reportFile = path.join(outputDir, 'processing-report.txt');
    fs.writeFileSync(reportFile, report);
    console.log(`Relatório salvo em: ${reportFile}`);
    
    return report;
}

// Função principal
function main() {
    console.log('Iniciando processamento...\n');
    
    const regimeData = processRegimeUrbanistico();
    const zotsData = processZotsVsBairros();
    
    if (regimeData || zotsData) {
        generateSQLSchema(regimeData, zotsData);
        generateReport(regimeData, zotsData);
        
        console.log('\n' + '='.repeat(60));
        console.log('PROCESSAMENTO CONCLUÍDO COM SUCESSO!');
        console.log('='.repeat(60));
        console.log('Verifique os arquivos gerados na pasta processed-data/');
        
    } else {
        console.error('Nenhum arquivo foi processado com sucesso.');
    }
}

// Executar
main();