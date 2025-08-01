#!/usr/bin/env tsx

/**
 * Script Principal - Importação Completa
 * Executa importação e validação dos dados de Regime Urbanístico
 * Data: 2025-07-31
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

// Importar funções dos outros scripts
import { importarDados } from './safe-supabase-import';
import { validarDados } from './validate-imported-data';

async function verificarPreRequisitos(): Promise<boolean> {
    console.log('🔍 Verificando pré-requisitos...');
    
    // Verificar se os arquivos de dados existem
    const arquivosNecessarios = [
        'processed-data/database-schema.sql',
        'processed-data/regime-urbanistico-processed.json',
        'processed-data/zots-bairros-processed.json'
    ];
    
    let tudoOk = true;
    
    for (const arquivo of arquivosNecessarios) {
        const caminhoCompleto = join(process.cwd(), arquivo);
        if (!existsSync(caminhoCompleto)) {
            console.error(`❌ Arquivo não encontrado: ${arquivo}`);
            tudoOk = false;
        } else {
            console.log(`✅ Arquivo encontrado: ${arquivo}`);
        }
    }
    
    // Verificar variáveis de ambiente
    if (!process.env.SUPABASE_URL && !process.env.SUPABASE_ANON_KEY && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
        console.error('❌ Variáveis de ambiente do Supabase não configuradas');
        console.log('   Configure SUPABASE_URL e SUPABASE_ANON_KEY ou SUPABASE_SERVICE_ROLE_KEY');
        tudoOk = false;
    } else {
        console.log('✅ Variáveis de ambiente configuradas');
    }
    
    // Verificar dependências npm
    try {
        execSync('npm list @supabase/supabase-js', { stdio: 'ignore' });
        console.log('✅ Dependências npm instaladas');
    } catch (error) {
        console.error('❌ Dependência @supabase/supabase-js não encontrada');
        console.log('   Execute: npm install @supabase/supabase-js');
        tudoOk = false;
    }
    
    return tudoOk;
}

async function executarImportacaoCompleta(): Promise<void> {
    console.log('🚀 Iniciando processo completo de importação');
    console.log('=' .repeat(70));
    
    const inicioTempo = Date.now();
    
    try {
        // Etapa 1: Verificar pré-requisitos
        console.log('\n📋 ETAPA 1: Verificação de Pré-requisitos');
        const preRequisitosOk = await verificarPreRequisitos();
        
        if (!preRequisitosOk) {
            console.error('\n❌ Pré-requisitos não atendidos. Abortando importação.');
            process.exit(1);
        }
        
        console.log('\n✅ Todos os pré-requisitos atendidos. Prosseguindo...');
        
        // Etapa 2: Executar importação
        console.log('\n📊 ETAPA 2: Importação dos Dados');
        console.log('Iniciando importação segura...');
        
        await importarDados();
        
        console.log('\n✅ Importação concluída com sucesso!');
        
        // Etapa 3: Validar dados importados
        console.log('\n🔍 ETAPA 3: Validação dos Dados Importados');
        console.log('Iniciando validação...');
        
        await validarDados();
        
        console.log('\n✅ Validação concluída!');
        
        // Etapa 4: Relatório final
        const fimTempo = Date.now();
        const tempoTotalSegundos = Math.round((fimTempo - inicioTempo) / 1000);
        
        console.log('\n🎉 PROCESSO COMPLETO FINALIZADO');
        console.log('=' .repeat(70));
        console.log(`⏱️ Tempo total: ${tempoTotalSegundos} segundos`);
        console.log('📄 Relatório de validação salvo em: validation-report.json');
        console.log('\n📊 Dados importados:');
        console.log('   • Regime Urbanístico: 387 registros esperados');
        console.log('   • ZOTs vs Bairros: 385 registros esperados');
        console.log('   • Total: 772 registros');
        
        console.log('\n🔍 Próximos passos recomendados:');
        console.log('   1. Revisar o relatório de validação (validation-report.json)');
        console.log('   2. Testar queries no sistema RAG');
        console.log('   3. Verificar performance das consultas');
        console.log('   4. Criar índices adicionais se necessário');
        
    } catch (error) {
        console.error('\n💥 ERRO CRÍTICO NO PROCESSO:', error);
        console.log('\n🔧 Passos para resolução:');
        console.log('   1. Verificar conectividade com Supabase');
        console.log('   2. Confirmar permissões de acesso ao banco');
        console.log('   3. Verificar integridade dos arquivos de dados');
        console.log('   4. Consultar logs detalhados acima');
        
        process.exit(1);
    }
}

async function mostrarAjuda(): Promise<void> {
    console.log('📚 Script de Importação Completa - Regime Urbanístico');
    console.log('=' .repeat(70));
    console.log('');
    console.log('Este script executa o processo completo de importação dos dados');
    console.log('de Regime Urbanístico para o banco Supabase.');
    console.log('');
    console.log('🔧 Pré-requisitos:');
    console.log('   • Variáveis de ambiente configuradas (SUPABASE_URL, SUPABASE_ANON_KEY)');
    console.log('   • Dependência @supabase/supabase-js instalada');
    console.log('   • Arquivos de dados processados na pasta processed-data/');
    console.log('');
    console.log('📊 Dados que serão importados:');
    console.log('   • Regime Urbanístico: 387 registros');
    console.log('   • ZOTs vs Bairros: 385 registros');
    console.log('   • Total: 772 registros');
    console.log('');
    console.log('🚀 Uso:');
    console.log('   npx tsx scripts/execute-full-import.ts');
    console.log('   npx tsx scripts/execute-full-import.ts --help');
    console.log('');
    console.log('📋 O processo inclui:');
    console.log('   1. Verificação de pré-requisitos');
    console.log('   2. Importação segura em lotes');
    console.log('   3. Validação completa dos dados');
    console.log('   4. Relatório final detalhado');
    console.log('');
}

// Função principal
async function main(): Promise<void> {
    const args = process.argv.slice(2);
    
    if (args.includes('--help') || args.includes('-h')) {
        await mostrarAjuda();
        return;
    }
    
    await executarImportacaoCompleta();
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(error => {
        console.error('Erro fatal:', error);
        process.exit(1);
    });
}

export { executarImportacaoCompleta };