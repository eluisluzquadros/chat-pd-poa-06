const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

/**
 * Script para importar dados Excel diretamente no Supabase
 * Gera os comandos SQL INSERT para importação
 */

function generateInsertStatements() {
    console.log('=== GERANDO COMANDOS INSERT PARA SUPABASE ===\n');
    
    const outputDir = './processed-data';
    let insertSQL = `-- Comandos INSERT para importação no Supabase\n`;
    insertSQL += `-- Gerado em: ${new Date().toISOString()}\n\n`;
    
    // Processar Regime Urbanístico
    try {
        console.log('Processando REGIME URBANÍSTICO...');
        const regimeWorkbook = XLSX.readFile('./knowledgebase/PDPOA2025-Regime_Urbanistico.xlsx');
        const regimeSheet = regimeWorkbook.Sheets['Sheet'];
        const regimeData = XLSX.utils.sheet_to_json(regimeSheet, { header: 1 });
        
        const regimeHeaders = regimeData[0];
        const regimeRows = regimeData.slice(1);
        
        insertSQL += `-- ======================================\n`;
        insertSQL += `-- INSERÇÃO: regime_urbanistico\n`;
        insertSQL += `-- Registros: ${regimeRows.length}\n`;
        insertSQL += `-- ======================================\n\n`;
        
        // Limpar dados antigos
        insertSQL += `DELETE FROM regime_urbanistico;\n\n`;
        
        // Preparar campos para insert
        const campos = [
            'bairro', 'zona', 'altura_maxima_edificacao_isolada', 
            'coef_aproveitamento_basico', 'coef_aproveitamento_maximo',
            'area_minima_lote', 'testada_minima_lote', 'modulo_fracionamento',
            'face_maxima_quarteirao', 'area_maxima_quarteirao', 'area_minima_quarteirao',
            'enquadramento_fracionamento', 'area_publica_viaria_fracionamento',
            'area_publica_equipamentos_fracionamento', 'enquadramento_desmembramento_tipo1',
            'area_publica_viaria_desmembramento_tipo1', 'area_publica_equipamentos_desmembramento_tipo1',
            'enquadramento_desmembramento_tipo2', 'area_publica_viaria_desmembramento_tipo2',
            'area_publica_equipamentos_desmembramento_tipo2', 'enquadramento_desmembramento_tipo3',
            'area_publica_viaria_desmembramento_tipo3', 'area_publica_equipamentos_desmembramento_tipo3',
            'enquadramento_loteamento', 'area_publica_viaria_loteamento',
            'area_publica_equipamentos_loteamento', 'coef_aproveitamento_basico_4d',
            'coef_aproveitamento_maximo_4d', 'afastamentos_frente',
            'afastamentos_laterais', 'afastamentos_fundos', 'taxa_permeabilidade_acima_1500',
            'taxa_permeabilidade_ate_1500', 'fator_conversao_taxa_permeabilidade',
            'recuo_jardim', 'comercio_varejista_inocuo', 'comercio_varejista_ia1',
            'comercio_varejista_ia2', 'comercio_atacadista_ia1', 'comercio_atacadista_ia2',
            'comercio_atacadista_ia3', 'servico_inocuo', 'servico_ia1', 'servico_ia2',
            'servico_ia3', 'industria_inocua', 'industria_interferencia_ambiental',
            'nivel_controle_entretenimento_noturno'
        ];
        
        insertSQL += `INSERT INTO regime_urbanistico (${campos.join(', ')}) VALUES\n`;
        
        const regimeValues = regimeRows.map((row, index) => {
            const values = row.slice(1).map(cell => { // Pular coluna ID
                if (cell === null || cell === undefined || cell === '') {
                    return 'NULL';
                }
                return `'${String(cell).replace(/'/g, "''")}'`;
            });
            
            // Preencher com NULL se houver menos colunas
            while (values.length < campos.length) {
                values.push('NULL');
            }
            
            return `  (${values.join(', ')})`;
        });
        
        insertSQL += regimeValues.join(',\n');
        insertSQL += `;\n\n`;
        
        console.log(`✓ ${regimeRows.length} registros de regime urbanístico preparados`);
        
    } catch (error) {
        console.error('Erro ao processar regime urbanístico:', error.message);
    }
    
    // Processar ZOTs vs Bairros
    try {
        console.log('Processando ZOTS VS BAIRROS...');
        const zotsWorkbook = XLSX.readFile('./knowledgebase/PDPOA2025-ZOTs_vs_Bairros.xlsx');
        const zotsSheet = zotsWorkbook.Sheets['Sheet'];
        const zotsData = XLSX.utils.sheet_to_json(zotsSheet, { header: 1 });
        
        const zotsHeaders = zotsData[0];
        const zotsRows = zotsData.slice(1);
        
        insertSQL += `-- ======================================\n`;
        insertSQL += `-- INSERÇÃO: zots_bairros\n`;
        insertSQL += `-- Registros: ${zotsRows.length}\n`;
        insertSQL += `-- ======================================\n\n`;
        
        // Limpar dados antigos
        insertSQL += `DELETE FROM zots_bairros;\n\n`;
        
        insertSQL += `INSERT INTO zots_bairros (bairro, zona, total_zonas_no_bairro, tem_zona_especial) VALUES\n`;
        
        const zotsValues = zotsRows.map(row => {
            const bairro = row[1] || '';
            const zona = row[2] || '';
            const totalZonas = row[3] || 0;
            const temZonaEspecial = row[4] === 'Sim' ? 'TRUE' : 'FALSE';
            
            return `  ('${bairro.replace(/'/g, "''")}', '${zona.replace(/'/g, "''")}', ${totalZonas}, ${temZonaEspecial})`;
        });
        
        insertSQL += zotsValues.join(',\n');
        insertSQL += `;\n\n`;
        
        console.log(`✓ ${zotsRows.length} registros de ZOTs vs Bairros preparados`);
        
    } catch (error) {
        console.error('Erro ao processar ZOTs vs Bairros:', error.message);
    }
    
    // Adicionar comandos de verificação
    insertSQL += `-- ======================================\n`;
    insertSQL += `-- COMANDOS DE VERIFICAÇÃO\n`;
    insertSQL += `-- ======================================\n\n`;
    
    insertSQL += `-- Verificar contagem de registros\n`;
    insertSQL += `SELECT 'regime_urbanistico' as tabela, COUNT(*) as registros FROM regime_urbanistico\n`;
    insertSQL += `UNION ALL\n`;
    insertSQL += `SELECT 'zots_bairros' as tabela, COUNT(*) as registros FROM zots_bairros;\n\n`;
    
    insertSQL += `-- Verificar bairros únicos\n`;
    insertSQL += `SELECT 'Bairros únicos em regime_urbanistico' as info, COUNT(DISTINCT bairro) as total FROM regime_urbanistico\n`;
    insertSQL += `UNION ALL\n`;
    insertSQL += `SELECT 'Bairros únicos em zots_bairros' as info, COUNT(DISTINCT bairro) as total FROM zots_bairros;\n\n`;
    
    insertSQL += `-- Verificar zonas únicas\n`;
    insertSQL += `SELECT 'Zonas únicas em regime_urbanistico' as info, COUNT(DISTINCT zona) as total FROM regime_urbanistico\n`;
    insertSQL += `UNION ALL\n`;
    insertSQL += `SELECT 'Zonas únicas em zots_bairros' as info, COUNT(DISTINCT zona) as total FROM zots_bairros;\n\n`;
    
    insertSQL += `-- Verificar bairros com zona especial\n`;
    insertSQL += `SELECT bairro, COUNT(*) as zonas_especiais \n`;
    insertSQL += `FROM zots_bairros \n`;
    insertSQL += `WHERE tem_zona_especial = TRUE \n`;
    insertSQL += `GROUP BY bairro \n`;
    insertSQL += `ORDER BY bairro;\n\n`;
    
    // Salvar arquivo SQL
    const sqlFile = path.join(outputDir, 'supabase-import.sql');
    fs.writeFileSync(sqlFile, insertSQL);
    console.log(`\n✓ Comandos SQL salvos em: ${sqlFile}`);
    
    return sqlFile;
}

// Gerar scripts de execução
function generateExecutionScript() {
    console.log('\nGerando script de execução...');
    
    const scriptContent = `#!/usr/bin/env node

/**
 * Script para executar a importação no Supabase via API
 * Execute: node execute-supabase-import.cjs
 */

const fs = require('fs');
const path = require('path');

async function executeImport() {
    console.log('=== EXECUÇÃO DA IMPORTAÇÃO NO SUPABASE ===');
    
    const sqlFile = './processed-data/supabase-import.sql';
    
    if (!fs.existsSync(sqlFile)) {
        console.error('Arquivo SQL não encontrado:', sqlFile);
        return;
    }
    
    const sqlContent = fs.readFileSync(sqlFile, 'utf8');
    
    console.log('\\nPara executar no Supabase:');
    console.log('1. Acesse o Dashboard do Supabase');
    console.log('2. Vá para SQL Editor');
    console.log('3. Cole o conteúdo do arquivo:', sqlFile);
    console.log('4. Execute os comandos');
    console.log('\\nOu use a Supabase CLI:');
    console.log('supabase db reset --db-url "sua-connection-string"');
    console.log('psql "sua-connection-string" -f', sqlFile);
    
    console.log('\\n✓ Importação preparada para execução');
}

executeImport().catch(console.error);
`;
    
    const scriptFile = './execute-supabase-import.cjs';
    fs.writeFileSync(scriptFile, scriptContent);
    console.log(`✓ Script de execução criado: ${scriptFile}`);
    
    return scriptFile;
}

// Função principal
function main() {
    console.log('GERADOR DE IMPORTAÇÃO PARA SUPABASE');
    console.log('=' .repeat(50));
    
    try {
        const sqlFile = generateInsertStatements();
        const scriptFile = generateExecutionScript();
        
        console.log('\\n' + '='.repeat(50));
        console.log('GERAÇÃO CONCLUÍDA COM SUCESSO!');
        console.log('='.repeat(50));
        console.log('Arquivos gerados:');
        console.log(`  ✓ SQL: ${sqlFile}`);
        console.log(`  ✓ Script: ${scriptFile}`);
        
        console.log('\\nPróximos passos:');
        console.log('  1. Execute o schema SQL primeiro (database-schema.sql)');
        console.log('  2. Execute o import SQL (supabase-import.sql)');
        console.log('  3. Verifique os dados com os comandos de verificação');
        
    } catch (error) {
        console.error('Erro durante a geração:', error);
    }
}

// Executar
main();