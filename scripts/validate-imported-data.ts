#!/usr/bin/env tsx

/**
 * Script de Validação - Dados Importados
 * Valida integridade e completude dos dados importados
 * Data: 2025-07-31
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

// Configuração do Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseKey) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY ou NEXT_PUBLIC_SUPABASE_ANON_KEY não encontrada!');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface ValidationResult {
    table: string;
    test: string;
    passed: boolean;
    expected: number | string;
    actual: number | string;
    details?: string;
}

const validationResults: ValidationResult[] = [];

function addResult(table: string, test: string, passed: boolean, expected: any, actual: any, details?: string) {
    validationResults.push({ table, test, passed, expected, actual, details });
    
    const status = passed ? '✅' : '❌';
    console.log(`${status} ${table} - ${test}: ${passed ? 'PASSOU' : 'FALHOU'}`);
    if (!passed) {
        console.log(`   Esperado: ${expected}, Atual: ${actual}`);
        if (details) console.log(`   Detalhes: ${details}`);
    }
}

async function validarContadorRegistros(): Promise<void> {
    console.log('\n📊 Validando contador de registros...');
    
    try {
        // Regime Urbanístico
        const { count: regimeCount, error: regimeError } = await supabase
            .from('regime_urbanistico')
            .select('*', { count: 'exact', head: true });
        
        if (regimeError) {
            addResult('regime_urbanistico', 'Contagem total', false, 387, 'ERRO', regimeError.message);
        } else {
            addResult('regime_urbanistico', 'Contagem total', regimeCount === 387, 387, regimeCount || 0);
        }
        
        // ZOTs vs Bairros
        const { count: zotsCount, error: zotsError } = await supabase
            .from('zots_bairros')
            .select('*', { count: 'exact', head: true });
        
        if (zotsError) {
            addResult('zots_bairros', 'Contagem total', false, 385, 'ERRO', zotsError.message);
        } else {
            addResult('zots_bairros', 'Contagem total', zotsCount === 385, 385, zotsCount || 0);
        }
        
    } catch (error) {
        console.error('❌ Erro na validação de contadores:', error);
    }
}

async function validarCamposObrigatorios(): Promise<void> {
    console.log('\n🔍 Validando campos obrigatórios...');
    
    try {
        // Regime Urbanístico - bairro não nulo
        const { count: regimeBairroNulo } = await supabase
            .from('regime_urbanistico')
            .select('*', { count: 'exact', head: true })
            .is('bairro', null);
        
        addResult('regime_urbanistico', 'Bairros não nulos', regimeBairroNulo === 0, 0, regimeBairroNulo || 0);
        
        // Regime Urbanístico - zona não nula
        const { count: regimeZonaNula } = await supabase
            .from('regime_urbanistico')
            .select('*', { count: 'exact', head: true })
            .is('zona', null);
        
        addResult('regime_urbanistico', 'Zonas não nulas', regimeZonaNula === 0, 0, regimeZonaNula || 0);
        
        // ZOTs Bairros - bairro não nulo
        const { count: zotsBairroNulo } = await supabase
            .from('zots_bairros')
            .select('*', { count: 'exact', head: true })
            .is('bairro', null);
        
        addResult('zots_bairros', 'Bairros não nulos', zotsBairroNulo === 0, 0, zotsBairroNulo || 0);
        
        // ZOTs Bairros - zona não nula
        const { count: zotsZonaNula } = await supabase
            .from('zots_bairros')
            .select('*', { count: 'exact', head: true })
            .is('zona', null);
        
        addResult('zots_bairros', 'Zonas não nulas', zotsZonaNula === 0, 0, zotsZonaNula || 0);
        
    } catch (error) {
        console.error('❌ Erro na validação de campos obrigatórios:', error);
    }
}

async function validarBairrosUnicos(): Promise<void> {
    console.log('\n🏘️ Validando bairros únicos...');
    
    try {
        // Carregar bairros dos arquivos originais
        const regimeDataPath = join(process.cwd(), 'processed-data', 'regime-urbanistico-processed.json');
        const zotsDataPath = join(process.cwd(), 'processed-data', 'zots-bairros-processed.json');
        
        const regimeData = JSON.parse(readFileSync(regimeDataPath, 'utf-8'));
        const zotsData = JSON.parse(readFileSync(zotsDataPath, 'utf-8'));
        
        const bairrosOriginaisRegime = new Set(regimeData.data.map((item: any) => item.Bairro));
        const bairrosOriginaisZots = zotsData.uniqueBairros || [];
        
        // Verificar bairros no banco
        const { data: bairrosBanco } = await supabase
            .from('regime_urbanistico')
            .select('bairro')
            .distinct();
        
        const bairrosBancoSet = new Set(bairrosBanco?.map(item => item.bairro) || []);
        
        addResult('regime_urbanistico', 'Bairros únicos', 
            bairrosBancoSet.size === bairrosOriginaisRegime.size, 
            bairrosOriginaisRegime.size, 
            bairrosBancoSet.size);
        
        // Verificar se todos os bairros originais estão no banco
        const bairrosFaltando = Array.from(bairrosOriginaisRegime).filter(bairro => !bairrosBancoSet.has(bairro));
        addResult('regime_urbanistico', 'Bairros completos', 
            bairrosFaltando.length === 0, 
            0, 
            bairrosFaltando.length,
            bairrosFaltando.length > 0 ? `Faltando: ${bairrosFaltando.join(', ')}` : undefined);
            
    } catch (error) {
        console.error('❌ Erro na validação de bairros únicos:', error);
    }
}

async function validarZonasUnicas(): Promise<void> {
    console.log('\n🗺️ Validando zonas únicas...');
    
    try {
        // Verificar zonas no banco
        const { data: zonasBanco } = await supabase
            .from('regime_urbanistico')
            .select('zona')
            .distinct();
        
        const zonasCount = zonasBanco?.length || 0;
        
        // Esperamos ter pelo menos 10 zonas diferentes
        addResult('regime_urbanistico', 'Diversidade de zonas', 
            zonasCount >= 10, 
            '>=10', 
            zonasCount);
            
        // Verificar zonas específicas importantes
        const zonasImportantes = ['ZAI-1', 'ZAI-2', 'ZAI-3', 'ZR-1', 'ZR-2', 'ZR-3', 'ZR-4'];
        
        for (const zona of zonasImportantes) {
            const { count } = await supabase
                .from('regime_urbanistico')
                .select('*', { count: 'exact', head: true })
                .eq('zona', zona);
                
            addResult('regime_urbanistico', `Zona ${zona} presente`, 
                (count || 0) > 0, 
                '>0', 
                count || 0);
        }
        
    } catch (error) {
        console.error('❌ Erro na validação de zonas únicas:', error);
    }
}

async function validarConsistenciaEntreTabelas(): Promise<void> {
    console.log('\n🔗 Validando consistência entre tabelas...');
    
    try {
        // Verificar se todos os bairros do regime_urbanistico estão em zots_bairros
        const { data: bairrosRegime } = await supabase
            .from('regime_urbanistico')
            .select('bairro')
            .distinct();
            
        const { data: bairrosZots } = await supabase
            .from('zots_bairros')
            .select('bairro')
            .distinct();
        
        const bairrosRegimeSet = new Set(bairrosRegime?.map(item => item.bairro) || []);
        const bairrosZotsSet = new Set(bairrosZots?.map(item => item.bairro) || []);
        
        // Verificar interseção
        const bairrosComuns = Array.from(bairrosRegimeSet).filter(bairro => bairrosZotsSet.has(bairro));
        const percentualComum = (bairrosComuns.length / bairrosRegimeSet.size) * 100;
        
        addResult('consistencia', 'Bairros em comum', 
            percentualComum >= 80, 
            '>=80%', 
            `${percentualComum.toFixed(1)}%`);
        
        // Verificar zonas específicas
        const { data: zonasRegimeZots } = await supabase
            .from('regime_urbanistico')
            .select('bairro, zona')
            .in('bairro', Array.from(bairrosZotsSet));
            
        addResult('consistencia', 'Zonas para bairros comuns', 
            (zonasRegimeZots?.length || 0) > 0, 
            '>0', 
            zonasRegimeZots?.length || 0);
            
    } catch (error) {
        console.error('❌ Erro na validação de consistência:', error);
    }
}

async function validarTiposDados(): Promise<void> {
    console.log('\n🔢 Validando tipos de dados...');
    
    try {
        // Verificar se total_zonas_no_bairro é numérico
        const { data: zonasNumericas } = await supabase
            .from('zots_bairros')
            .select('total_zonas_no_bairro')
            .not('total_zonas_no_bairro', 'is', null)
            .limit(10);
            
        let todosNumericos = true;
        if (zonasNumericas) {
            for (const item of zonasNumericas) {
                if (isNaN(Number(item.total_zonas_no_bairro))) {
                    todosNumericos = false;
                    break;
                }
            }
        }
        
        addResult('zots_bairros', 'Total zonas numérico', todosNumericos, true, todosNumericos);
        
        // Verificar se tem_zona_especial é boolean
        const { data: zonasEspeciais } = await supabase
            .from('zots_bairros')
            .select('tem_zona_especial')
            .limit(10);
            
        let todosBooleanos = true;
        if (zonasEspeciais) {
            for (const item of zonasEspeciais) {
                if (typeof item.tem_zona_especial !== 'boolean') {
                    todosBooleanos = false;
                    break;
                }
            }
        }
        
        addResult('zots_bairros', 'Zona especial boolean', todosBooleanos, true, todosBooleanos);
        
    } catch (error) {
        console.error('❌ Erro na validação de tipos de dados:', error);
    }
}

async function gerarRelatorioFinal(): Promise<void> {
    console.log('\n📋 Relatório Final de Validação');
    console.log('=' .repeat(70));
    
    const totalTestes = validationResults.length;
    const testesPassaram = validationResults.filter(r => r.passed).length;
    const testesFalharam = totalTestes - testesPassaram;
    const percentualSucesso = (testesPassaram / totalTestes) * 100;
    
    console.log(`📊 Resumo Geral:`);
    console.log(`   Total de testes: ${totalTestes}`);
    console.log(`   ✅ Passou: ${testesPassaram} (${percentualSucesso.toFixed(1)}%)`);
    console.log(`   ❌ Falhou: ${testesFalharam}`);
    
    if (testesFalharam > 0) {
        console.log('\n❌ Testes que falharam:');
        validationResults
            .filter(r => !r.passed)
            .forEach(r => {
                console.log(`   • ${r.table} - ${r.test}`);
                console.log(`     Esperado: ${r.expected}, Atual: ${r.actual}`);
                if (r.details) console.log(`     ${r.details}`);
            });
    }
    
    console.log('\n🎯 Status da Importação:');
    if (percentualSucesso >= 90) {
        console.log('✅ SUCESSO: Dados importados com alta qualidade');
    } else if (percentualSucesso >= 80) {
        console.log('⚠️ ATENÇÃO: Dados importados com problemas menores');
    } else {
        console.log('❌ ERRO: Dados importados com problemas sérios');
    }
    
    // Salvar relatório em arquivo
    const relatorio = {
        timestamp: new Date().toISOString(),
        resumo: {
            totalTestes,
            testesPassaram,
            testesFalharam,
            percentualSucesso
        },
        detalhes: validationResults
    };
    
    const fs = require('fs');
    const reportPath = join(process.cwd(), 'validation-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(relatorio, null, 2));
    console.log(`\n📄 Relatório salvo em: ${reportPath}`);
}

async function main(): Promise<void> {
    console.log('🔍 Iniciando validação dos dados importados');
    console.log('=' .repeat(70));
    
    try {
        // Executar todas as validações
        await validarContadorRegistros();
        await validarCamposObrigatorios();
        await validarBairrosUnicos();
        await validarZonasUnicas();
        await validarConsistenciaEntreTabelas();
        await validarTiposDados();
        
        // Gerar relatório final
        await gerarRelatorioFinal();
        
    } catch (error) {
        console.error('💥 Erro crítico na validação:', error);
        process.exit(1);
    }
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

export { main as validarDados };