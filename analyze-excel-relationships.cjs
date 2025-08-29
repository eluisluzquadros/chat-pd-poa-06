const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

/**
 * Script para análise avançada dos dados Excel
 * Mapeia relações entre ZOTs e bairros e gera insights
 */

function analyzeData() {
    console.log('=== ANÁLISE AVANÇADA DOS DADOS EXCEL ===\n');
    
    let analysis = {
        timestamp: new Date().toISOString(),
        regimeUrbanistico: null,
        zotsBairros: null,
        relationships: null,
        insights: []
    };
    
    // Carregar dados do Regime Urbanístico
    try {
        console.log('📊 Analisando REGIME URBANÍSTICO...');
        const regimeWorkbook = XLSX.readFile('./knowledgebase/PDPOA2025-Regime_Urbanistico.xlsx');
        const regimeSheet = regimeWorkbook.Sheets['Sheet'];
        const regimeData = XLSX.utils.sheet_to_json(regimeSheet, { header: 1 });
        
        const regimeHeaders = regimeData[0];
        const regimeRows = regimeData.slice(1);
        
        // Análise estatística do regime
        const regimeStats = {
            totalRegistros: regimeRows.length,
            colunas: regimeHeaders.length,
            bairros: {},
            zonas: {},
            parametrosUrbanisticos: {}
        };
        
        // Analisar cada registro
        regimeRows.forEach(row => {
            const bairro = row[1];
            const zona = row[2];
            
            if (bairro) {
                if (!regimeStats.bairros[bairro]) {
                    regimeStats.bairros[bairro] = {
                        count: 0,
                        zonas: new Set()
                    };
                }
                regimeStats.bairros[bairro].count++;
                if (zona) regimeStats.bairros[bairro].zonas.add(zona);
            }
            
            if (zona) {
                if (!regimeStats.zonas[zona]) {
                    regimeStats.zonas[zona] = {
                        count: 0,
                        bairros: new Set()
                    };
                }
                regimeStats.zonas[zona].count++;
                if (bairro) regimeStats.zonas[zona].bairros.add(bairro);
            }
            
            // Analisar parâmetros urbanísticos importantes
            const alturaMax = row[3];
            const coefBasico = row[4];
            const coefMaximo = row[5];
            
            if (alturaMax) {
                if (!regimeStats.parametrosUrbanisticos.altura) {
                    regimeStats.parametrosUrbanisticos.altura = {};
                }
                regimeStats.parametrosUrbanisticos.altura[alturaMax] = 
                    (regimeStats.parametrosUrbanisticos.altura[alturaMax] || 0) + 1;
            }
        });
        
        // Converter Sets para Arrays
        Object.keys(regimeStats.bairros).forEach(bairro => {
            regimeStats.bairros[bairro].zonas = Array.from(regimeStats.bairros[bairro].zonas);
        });
        
        Object.keys(regimeStats.zonas).forEach(zona => {
            regimeStats.zonas[zona].bairros = Array.from(regimeStats.zonas[zona].bairros);
        });
        
        analysis.regimeUrbanistico = regimeStats;
        console.log(`✓ ${regimeStats.totalRegistros} registros analisados`);
        console.log(`✓ ${Object.keys(regimeStats.bairros).length} bairros únicos`);
        console.log(`✓ ${Object.keys(regimeStats.zonas).length} zonas únicas`);
        
    } catch (error) {
        console.error('❌ Erro ao analisar regime urbanístico:', error.message);
    }
    
    // Carregar dados do ZOTs vs Bairros
    try {
        console.log('\\n📊 Analisando ZOTS VS BAIRROS...');
        const zotsWorkbook = XLSX.readFile('./knowledgebase/PDPOA2025-ZOTs_vs_Bairros.xlsx');
        const zotsSheet = zotsWorkbook.Sheets['Sheet'];
        const zotsData = XLSX.utils.sheet_to_json(zotsSheet, { header: 1 });
        
        const zotsHeaders = zotsData[0];
        const zotsRows = zotsData.slice(1);
        
        // Análise estatística do ZOTs
        const zotsStats = {
            totalRegistros: zotsRows.length,
            bairros: {},
            zonas: {},
            distribuicaoZonas: {},
            zonasEspeciais: {
                bairros: [],
                total: 0
            }
        };
        
        // Analisar cada registro
        zotsRows.forEach(row => {
            const bairro = row[1];
            const zona = row[2];
            const totalZonas = parseInt(row[3]) || 0;
            const temZonaEspecial = row[4] === 'Sim';
            
            if (bairro) {
                if (!zotsStats.bairros[bairro]) {
                    zotsStats.bairros[bairro] = {
                        zonas: [],
                        totalZonas: 0,
                        temZonaEspecial: false
                    };
                }
                
                zotsStats.bairros[bairro].zonas.push(zona);
                zotsStats.bairros[bairro].totalZonas = Math.max(
                    zotsStats.bairros[bairro].totalZonas, 
                    totalZonas
                );
                
                if (temZonaEspecial) {
                    zotsStats.bairros[bairro].temZonaEspecial = true;
                    if (!zotsStats.zonasEspeciais.bairros.includes(bairro)) {
                        zotsStats.zonasEspeciais.bairros.push(bairro);
                    }
                }
            }
            
            if (zona) {
                if (!zotsStats.zonas[zona]) {
                    zotsStats.zonas[zona] = {
                        bairros: [],
                        count: 0
                    };
                }
                zotsStats.zonas[zona].bairros.push(bairro);
                zotsStats.zonas[zona].count++;
            }
            
            // Distribuição de zonas por bairro
            if (totalZonas > 0) {
                if (!zotsStats.distribuicaoZonas[totalZonas]) {
                    zotsStats.distribuicaoZonas[totalZonas] = 0;
                }
                zotsStats.distribuicaoZonas[totalZonas]++;
            }
        });
        
        zotsStats.zonasEspeciais.total = zotsStats.zonasEspeciais.bairros.length;
        
        analysis.zotsBairros = zotsStats;
        console.log(`✓ ${zotsStats.totalRegistros} registros analisados`);
        console.log(`✓ ${Object.keys(zotsStats.bairros).length} bairros únicos`);
        console.log(`✓ ${Object.keys(zotsStats.zonas).length} zonas únicas`);
        console.log(`✓ ${zotsStats.zonasEspeciais.total} bairros com zonas especiais`);
        
    } catch (error) {
        console.error('❌ Erro ao analisar ZOTs vs Bairros:', error.message);
    }
    
    return analysis;
}

function generateRelationshipMapping(analysis) {
    console.log('\\n🔗 MAPEANDO RELAÇÕES ENTRE ZOTS E BAIRROS...');
    
    if (!analysis.regimeUrbanistico || !analysis.zotsBairros) {
        console.error('❌ Dados insuficientes para análise de relações');
        return null;
    }
    
    const relationships = {
        bairrosComuns: [],
        zonasComuns: [],
        discrepancias: {
            bairrosSoNoRegime: [],
            bairrosSoNoZots: [],
            zonasSoNoRegime: [],
            zonasSoNoZots: []
        },
        estatisticas: {
            convergencia: 0,
            cobertura: 0
        }
    };
    
    const regimeBairros = Object.keys(analysis.regimeUrbanistico.bairros);
    const zotsBarrios = Object.keys(analysis.zotsBairros.bairros);
    const regimeZonas = Object.keys(analysis.regimeUrbanistico.zonas);
    const zotsZonas = Object.keys(analysis.zotsBairros.zonas);
    
    // Encontrar bairros comuns
    relationships.bairrosComuns = regimeBairros.filter(bairro => 
        zotsBarrios.includes(bairro)
    );
    
    // Encontrar zonas comuns
    relationships.zonasComuns = regimeZonas.filter(zona => 
        zotsZonas.includes(zona)
    );
    
    // Encontrar discrepâncias
    relationships.discrepancias.bairrosSoNoRegime = regimeBairros.filter(bairro => 
        !zotsBarrios.includes(bairro)
    );
    
    relationships.discrepancias.bairrosSoNoZots = zotsBarrios.filter(bairro => 
        !regimeBairros.includes(bairro)
    );
    
    relationships.discrepancias.zonasSoNoRegime = regimeZonas.filter(zona => 
        !zotsZonas.includes(zona)
    );
    
    relationships.discrepancias.zonasSoNoZots = zotsZonas.filter(zona => 
        !regimeZonas.includes(zona)
    );
    
    // Calcular estatísticas de convergência
    relationships.estatisticas.convergencia = {
        bairros: (relationships.bairrosComuns.length / Math.max(regimeBairros.length, zotsBarrios.length) * 100).toFixed(2),
        zonas: (relationships.zonasComuns.length / Math.max(regimeZonas.length, zotsZonas.length) * 100).toFixed(2)
    };
    
    relationships.estatisticas.cobertura = {
        bairros: {
            total: Math.max(regimeBairros.length, zotsBarrios.length),
            comuns: relationships.bairrosComuns.length,
            percentual: (relationships.bairrosComuns.length / Math.max(regimeBairros.length, zotsBarrios.length) * 100).toFixed(2)
        },
        zonas: {
            total: Math.max(regimeZonas.length, zotsZonas.length),
            comuns: relationships.zonasComuns.length,
            percentual: (relationships.zonasComuns.length / Math.max(regimeZonas.length, zotsZonas.length) * 100).toFixed(2)
        }
    };
    
    console.log(`✓ ${relationships.bairrosComuns.length} bairros comuns identificados`);
    console.log(`✓ ${relationships.zonasComuns.length} zonas comuns identificadas`);
    console.log(`✓ Convergência de bairros: ${relationships.estatisticas.convergencia.bairros}%`);
    console.log(`✓ Convergência de zonas: ${relationships.estatisticas.convergencia.zonas}%`);
    
    return relationships;
}

function generateInsights(analysis) {
    console.log('\\n💡 GERANDO INSIGHTS...');
    
    const insights = [];
    
    if (analysis.regimeUrbanistico) {
        const regime = analysis.regimeUrbanistico;
        
        // Insight sobre distribuição de zonas
        const zonasMaisComuns = Object.entries(regime.zonas)
            .sort((a, b) => b[1].count - a[1].count)
            .slice(0, 5);
            
        insights.push({
            categoria: 'Distribuição de Zonas',
            titulo: 'Zonas com Maior Cobertura',
            descricao: `As 5 zonas mais comuns são: ${zonasMaisComuns.map(z => `${z[0]} (${z[1].count} registros)`).join(', ')}`,
            dados: zonasMaisComuns
        });
        
        // Insight sobre bairros com múltiplas zonas
        const bairrosMultiZonas = Object.entries(regime.bairros)
            .filter(([bairro, info]) => info.zonas.length > 1)
            .sort((a, b) => b[1].zonas.length - a[1].zonas.length);
            
        insights.push({
            categoria: 'Complexidade Urbana',
            titulo: 'Bairros com Múltiplas Zonas',
            descricao: `${bairrosMultiZonas.length} bairros possuem mais de uma zona urbanística`,
            dados: bairrosMultiZonas.slice(0, 10).map(([bairro, info]) => ({
                bairro,
                totalZonas: info.zonas.length,
                zonas: info.zonas
            }))
        });
    }
    
    if (analysis.zotsBairros) {
        const zots = analysis.zotsBairros;
        
        // Insight sobre zonas especiais
        insights.push({
            categoria: 'Zonas Especiais',
            titulo: 'Bairros com Regulamentação Especial',
            descricao: `${zots.zonasEspeciais.total} bairros possuem zonas especiais: ${zots.zonasEspeciais.bairros.join(', ')}`,
            dados: zots.zonasEspeciais.bairros
        });
        
        // Insight sobre distribuição de zonas
        const distribuicao = Object.entries(zots.distribuicaoZonas)
            .sort((a, b) => parseInt(b[0]) - parseInt(a[0]));
            
        insights.push({
            categoria: 'Distribuição Espacial',
            titulo: 'Padrão de Divisão Territorial',
            descricao: `Distribuição de zonas por bairro varia de 1 a ${Math.max(...Object.keys(zots.distribuicaoZonas).map(k => parseInt(k)))} zonas`,
            dados: distribuicao
        });
    }
    
    if (analysis.relationships) {
        const rel = analysis.relationships;
        
        // Insight sobre consistência dos dados
        insights.push({
            categoria: 'Qualidade dos Dados',
            titulo: 'Consistência entre Fontes',
            descricao: `Convergência de ${rel.estatisticas.convergencia.bairros}% nos bairros e ${rel.estatisticas.convergencia.zonas}% nas zonas entre os dois arquivos`,
            dados: {
                convergencia: rel.estatisticas.convergencia,
                discrepancias: {
                    bairrosSoNoRegime: rel.discrepancias.bairrosSoNoRegime.length,
                    bairrosSoNoZots: rel.discrepancias.bairrosSoNoZots.length,
                    zonasSoNoRegime: rel.discrepancias.zonasSoNoRegime.length,
                    zonasSoNoZots: rel.discrepancias.zonasSoNoZots.length
                }
            }
        });
    }
    
    console.log(`✓ ${insights.length} insights gerados`);
    
    return insights;
}

function saveAnalysis(analysis) {
    console.log('\\n💾 SALVANDO ANÁLISE...');
    
    const outputDir = './processed-data';
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    // Salvar análise completa em JSON
    const analysisFile = path.join(outputDir, `excel-analysis-${timestamp}.json`);
    fs.writeFileSync(analysisFile, JSON.stringify(analysis, null, 2));
    console.log(`✓ Análise completa salva: ${analysisFile}`);
    
    // Salvar relatório de insights em texto
    const reportFile = path.join(outputDir, `insights-report-${timestamp}.txt`);
    let report = `RELATÓRIO DE INSIGHTS - DADOS EXCEL\\n`;
    report += `${'='.repeat(60)}\\n`;
    report += `Data: ${new Date().toLocaleString()}\\n\\n`;
    
    analysis.insights.forEach((insight, index) => {
        report += `${index + 1}. ${insight.titulo} (${insight.categoria})\\n`;
        report += `   ${insight.descricao}\\n\\n`;
    });
    
    if (analysis.relationships) {
        report += `ESTATÍSTICAS DE RELACIONAMENTO:\\n`;
        report += `  Bairros comuns: ${analysis.relationships.bairrosComuns.length}\\n`;
        report += `  Zonas comuns: ${analysis.relationships.zonasComuns.length}\\n`;
        report += `  Convergência de bairros: ${analysis.relationships.estatisticas.convergencia.bairros}%\\n`;
        report += `  Convergência de zonas: ${analysis.relationships.estatisticas.convergencia.zonas}%\\n\\n`;
        
        if (analysis.relationships.discrepancias.bairrosSoNoRegime.length > 0) {
            report += `BAIRROS APENAS NO REGIME URBANÍSTICO:\\n`;
            report += `  ${analysis.relationships.discrepancias.bairrosSoNoRegime.join(', ')}\\n\\n`;
        }
        
        if (analysis.relationships.discrepancias.bairrosSoNoZots.length > 0) {
            report += `BAIRROS APENAS NO ZOTS:\\n`;
            report += `  ${analysis.relationships.discrepancias.bairrosSoNoZots.join(', ')}\\n\\n`;
        }
    }
    
    fs.writeFileSync(reportFile, report);
    console.log(`✓ Relatório de insights salvo: ${reportFile}`);
    
    // Salvar mapeamento de relações em CSV para fácil visualização
    if (analysis.relationships) {
        const csvFile = path.join(outputDir, `bairros-zonas-mapping-${timestamp}.csv`);
        let csv = 'Bairro,Zona,Fonte,TemZonaEspecial\\n';
        
        // Adicionar dados do regime urbanístico
        Object.entries(analysis.regimeUrbanistico?.bairros || {}).forEach(([bairro, info]) => {
            info.zonas.forEach(zona => {
                const temEspecial = analysis.zotsBairros?.bairros[bairro]?.temZonaEspecial || false;
                csv += `"${bairro}","${zona}","Regime","${temEspecial}"\\n`;
            });
        });
        
        fs.writeFileSync(csvFile, csv);
        console.log(`✓ Mapeamento CSV salvo: ${csvFile}`);
    }
    
    return { analysisFile, reportFile };
}

// Função principal
function main() {
    console.log('ANÁLISE AVANÇADA DOS DADOS EXCEL');
    console.log('='.repeat(50));
    
    try {
        // Executar análise
        const analysis = analyzeData();
        
        // Mapear relações
        analysis.relationships = generateRelationshipMapping(analysis);
        
        // Gerar insights
        analysis.insights = generateInsights(analysis);
        
        // Salvar resultados
        const savedFiles = saveAnalysis(analysis);
        
        console.log('\\n' + '='.repeat(50));
        console.log('ANÁLISE CONCLUÍDA COM SUCESSO!');
        console.log('='.repeat(50));
        console.log('Resultados principais:');
        
        if (analysis.regimeUrbanistico) {
            console.log(`  📊 Regime Urbanístico: ${analysis.regimeUrbanistico.totalRegistros} registros`);
            console.log(`      Bairros: ${Object.keys(analysis.regimeUrbanistico.bairros).length}`);
            console.log(`      Zonas: ${Object.keys(analysis.regimeUrbanistico.zonas).length}`);
        }
        
        if (analysis.zotsBairros) {
            console.log(`  📊 ZOTs vs Bairros: ${analysis.zotsBairros.totalRegistros} registros`);
            console.log(`      Bairros: ${Object.keys(analysis.zotsBairros.bairros).length}`);
            console.log(`      Zonas: ${Object.keys(analysis.zotsBairros.zonas).length}`);
            console.log(`      Bairros c/ zona especial: ${analysis.zotsBairros.zonasEspeciais.total}`);
        }
        
        if (analysis.relationships) {
            console.log(`  🔗 Relacionamentos:`);
            console.log(`      Convergência bairros: ${analysis.relationships.estatisticas.convergencia.bairros}%`);
            console.log(`      Convergência zonas: ${analysis.relationships.estatisticas.convergencia.zonas}%`);
        }
        
        console.log(`\\n  💡 Insights gerados: ${analysis.insights.length}`);
        console.log('\\nArquivos salvos na pasta processed-data/');
        
    } catch (error) {
        console.error('❌ Erro durante a análise:', error);
    }
}

// Executar
main();