#!/usr/bin/env tsx

/**
 * Script de Importação Segura - Dados de Regime Urbanístico
 * Executa importação em lotes para evitar timeout
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

interface RegimeUrbanistico {
    bairro: string;
    zona: string;
    altura_m_xima_edifica_o_isolada?: string;
    coeficiente_de_aproveitamento_b_sico?: string;
    coeficiente_de_aproveitamento_m_ximo?: string;
    rea_m_nima_do_lote?: string;
    testada_m_nima_do_lote?: string;
    m_dulo_de_fracionamento?: string;
    face_m_xima_do_quarteir_o?: string;
    rea_m_xima_do_quarteir_o?: string;
    rea_m_nima_do_quarteir_o?: string;
    enquadramento_fracionamento?: string;
    rea_de_destina_o_p_blica_malha_vi_ria_fracionamento?: string;
    rea_de_destina_o_p_blica_equipamentos_fracionamento?: string;
    enquadramento_desmembramento_tipo_1?: string;
    rea_p_blica_malha_vi_ria_desmembramento_tipo_1?: string;
    rea_p_blica_equipamentos_desmembramento_tipo_1?: string;
    enquadramento_desmembramento_tipo_2?: string;
    rea_p_blica_malha_vi_ria_desmembramento_tipo_2?: string;
    rea_p_blica_equipamentos_desmembramento_tipo_2?: string;
    enquadramento_desmembramento_tipo_3?: string;
    rea_p_blica_malha_vi_ria_desmembramento_tipo_3?: string;
    rea_p_blica_equipamentos_desmembramento_tipo_3?: string;
    enquadramento_loteamento?: string;
    rea_p_blica_malha_vi_ria_loteamento?: string;
    rea_p_blica_equipamentos_loteamento?: string;
    coeficiente_de_aproveitamento_b_sico_4d?: string;
    coeficiente_de_aproveitamento_m_ximo_4d?: string;
    afastamentos_frente?: string;
    afastamentos_laterais?: string;
    afastamentos_fundos?: string;
    taxa_de_permeabilidade_acima_de_1_500_m?: string;
    taxa_de_permeabilidade_at_1_500_m?: string;
    fator_de_convers_o_da_taxa_de_permeabilidade?: string;
    recuo_de_jardim?: string;
    com_rcio_varejista_in_cuo_restri_o_porte?: string;
    com_rcio_varejista_ia1_restri_o_porte?: string;
    com_rcio_varejista_ia2_restri_o_porte?: string;
    com_rcio_atacadista_ia1_restri_o_porte?: string;
    com_rcio_atacadista_ia2_restri_o_porte?: string;
    com_rcio_atacadista_ia3_restri_o_porte?: string;
    servi_o_in_cuo_restri_o_porte?: string;
    servi_o_ia1_restri_o_porte?: string;
    servi_o_ia2_restri_o_porte?: string;
    servi_o_ia3_restri_o_porte?: string;
    ind_stria_in_cua_restri_o_porte?: string;
    ind_stria_com_interfer_ncia_ambiental_restri_o_porte?: string;
    n_vel_de_controle_de_polariza_o_de_entretenimento_noturno?: string;
}

interface ZotsBairros {
    bairro: string;
    zona: string;
    total_zonas_no_bairro: number;
    tem_zona_especial: boolean;
}

async function verificarTabelasExistem(): Promise<boolean> {
    console.log('🔍 Verificando se as tabelas existem...');
    
    try {
        const { data: regimeData, error: regimeError } = await supabase
            .from('regime_urbanistico')
            .select('count')
            .limit(1);
            
        const { data: zotsData, error: zotsError } = await supabase
            .from('zots_bairros')
            .select('count')
            .limit(1);
            
        if (regimeError || zotsError) {
            console.log('❌ Tabelas não existem. Criando estrutura...');
            return false;
        }
        
        console.log('✅ Tabelas já existem.');
        return true;
    } catch (error) {
        console.log('❌ Erro ao verificar tabelas:', error);
        return false;
    }
}

async function criarTabelas(): Promise<void> {
    console.log('🏗️ Criando estrutura das tabelas...');
    
    const schemaPath = join(process.cwd(), 'processed-data', 'database-schema.sql');
    const schemaSql = readFileSync(schemaPath, 'utf-8');
    
    try {
        const { error } = await supabase.rpc('exec_sql', { sql: schemaSql });
        
        if (error) {
            console.error('❌ Erro ao criar tabelas:', error);
            throw error;
        }
        
        console.log('✅ Tabelas criadas com sucesso!');
    } catch (error) {
        console.error('❌ Erro na criação das tabelas:', error);
        throw error;
    }
}

async function limparTabelasExistentes(): Promise<void> {
    console.log('🧹 Limpando dados existentes...');
    
    try {
        await supabase.from('regime_urbanistico').delete().neq('id', 0);
        await supabase.from('zots_bairros').delete().neq('id', 0);
        
        console.log('✅ Dados existentes limpos.');
    } catch (error) {
        console.error('❌ Erro ao limpar dados:', error);
        throw error;
    }
}

async function importarRegimeUrbanistico(): Promise<void> {
    console.log('📊 Importando dados de Regime Urbanístico...');
    
    const dataPath = join(process.cwd(), 'processed-data', 'regime-urbanistico-processed.json');
    const rawData = readFileSync(dataPath, 'utf-8');
    const jsonData = JSON.parse(rawData);
    
    const registros: RegimeUrbanistico[] = jsonData.data.map((item: any) => ({
        bairro: item.Bairro,
        zona: item.Zona,
        altura_m_xima_edifica_o_isolada: item['Altura Máxima - Edificação Isolada'] || null,
        coeficiente_de_aproveitamento_b_sico: item['Coeficiente de Aproveitamento - Básico'] || null,
        coeficiente_de_aproveitamento_m_ximo: item['Coeficiente de Aproveitamento - Máximo'] || null,
        rea_m_nima_do_lote: item['Área Mínima do Lote'] || null,
        testada_m_nima_do_lote: item['Testada Mínima do Lote'] || null,
        m_dulo_de_fracionamento: item['Módulo de Fracionamento'] || null,
        face_m_xima_do_quarteir_o: item['Face Máxima do Quarteirão'] || null,
        rea_m_xima_do_quarteir_o: item['Área Máxima do Quarteirão'] || null,
        rea_m_nima_do_quarteir_o: item['Área Mínima do Quarteirão'] || null,
        enquadramento_fracionamento: item['Enquadramento (Fracionamento)'] || null,
        rea_de_destina_o_p_blica_malha_vi_ria_fracionamento: item['Área de Destinação Pública – Malha Viária (Fracionamento)'] || null,
        rea_de_destina_o_p_blica_equipamentos_fracionamento: item['Área de Destinação Pública – Equipamentos (Fracionamento)'] || null,
        enquadramento_desmembramento_tipo_1: item['Enquadramento (Desmembramento Tipo 1)'] || null,
        rea_p_blica_malha_vi_ria_desmembramento_tipo_1: item['Área Pública – Malha Viária (Desmembramento Tipo 1)'] || null,
        rea_p_blica_equipamentos_desmembramento_tipo_1: item['Área Pública – Equipamentos (Desmembramento Tipo 1)'] || null,
        enquadramento_desmembramento_tipo_2: item['Enquadramento (Desmembramento Tipo 2)'] || null,
        rea_p_blica_malha_vi_ria_desmembramento_tipo_2: item['Área Pública – Malha Viária (Desmembramento Tipo 2)'] || null,
        rea_p_blica_equipamentos_desmembramento_tipo_2: item['Área Pública – Equipamentos (Desmembramento Tipo 2)'] || null,
        enquadramento_desmembramento_tipo_3: item['Enquadramento (Desmembramento Tipo 3)'] || null,
        rea_p_blica_malha_vi_ria_desmembramento_tipo_3: item['Área Pública – Malha Viária (Desmembramento Tipo 3)'] || null,
        rea_p_blica_equipamentos_desmembramento_tipo_3: item['Área Pública – Equipamentos (Desmembramento Tipo 3)'] || null,
        enquadramento_loteamento: item['Enquadramento (Loteamento)'] || null,
        rea_p_blica_malha_vi_ria_loteamento: item['Área Pública – Malha Viária (Loteamento)'] || null,
        rea_p_blica_equipamentos_loteamento: item['Área Pública – Equipamentos (Loteamento)'] || null,
        coeficiente_de_aproveitamento_b_sico_4d: item['Coeficiente de Aproveitamento Básico +4D'] || null,
        coeficiente_de_aproveitamento_m_ximo_4d: item['Coeficiente de Aproveitamento Máximo +4D'] || null,
        afastamentos_frente: item['Afastamentos - Frente'] || null,
        afastamentos_laterais: item['Afastamentos - Laterais'] || null,
        afastamentos_fundos: item['Afastamentos - Fundos'] || null,
        taxa_de_permeabilidade_acima_de_1_500_m: item['Taxa de Permeabilidade (acima de 1.500 m²)'] || null,
        taxa_de_permeabilidade_at_1_500_m: item['Taxa de Permeabilidade (até 1.500 m²)'] || null,
        fator_de_convers_o_da_taxa_de_permeabilidade: item['Fator de Conversão da Taxa de Permeabilidade'] || null,
        recuo_de_jardim: item['Recuo de Jardim'] || null,
        com_rcio_varejista_in_cuo_restri_o_porte: item['Comércio Varejista Inócuo – Restrição / Porte'] || null,
        com_rcio_varejista_ia1_restri_o_porte: item['Comércio Varejista IA1 – Restrição / Porte'] || null,
        com_rcio_varejista_ia2_restri_o_porte: item['Comércio Varejista IA2 – Restrição / Porte'] || null,
        com_rcio_atacadista_ia1_restri_o_porte: item['Comércio Atacadista IA1 – Restrição / Porte'] || null,
        com_rcio_atacadista_ia2_restri_o_porte: item['Comércio Atacadista IA2 – Restrição / Porte'] || null,
        com_rcio_atacadista_ia3_restri_o_porte: item['Comércio Atacadista IA3 – Restrição / Porte'] || null,
        servi_o_in_cuo_restri_o_porte: item['Serviço Inócuo – Restrição / Porte'] || null,
        servi_o_ia1_restri_o_porte: item['Serviço IA1 – Restrição / Porte'] || null,
        servi_o_ia2_restri_o_porte: item['Serviço IA2 – Restrição / Porte'] || null,
        servi_o_ia3_restri_o_porte: item['Serviço IA3 – Restrição / Porte'] || null,
        ind_stria_in_cua_restri_o_porte: item['Indústria Inócua – Restrição / Porte'] || null,
        ind_stria_com_interfer_ncia_ambiental_restri_o_porte: item['Indústria com Interferência Ambiental – Restrição / Porte'] || null,
        n_vel_de_controle_de_polariza_o_de_entretenimento_noturno: item['Nível de Controle de Polarização de Entretenimento Noturno'] || null
    }));
    
    console.log(`📈 Total de registros para importar: ${registros.length}`);
    
    // Importação em lotes de 50 registros
    const batchSize = 50;
    let importedCount = 0;
    
    for (let i = 0; i < registros.length; i += batchSize) {
        const batch = registros.slice(i, i + batchSize);
        
        try {
            const { error } = await supabase
                .from('regime_urbanistico')
                .insert(batch);
                
            if (error) {
                console.error(`❌ Erro no lote ${Math.floor(i/batchSize) + 1}:`, error);
                throw error;
            }
            
            importedCount += batch.length;
            console.log(`✅ Lote ${Math.floor(i/batchSize) + 1} importado: ${importedCount}/${registros.length} registros`);
            
            // Pausa de 1 segundo entre lotes para evitar rate limiting
            await new Promise(resolve => setTimeout(resolve, 1000));
            
        } catch (error) {
            console.error(`❌ Erro crítico no lote ${Math.floor(i/batchSize) + 1}:`, error);
            throw error;
        }
    }
    
    console.log(`✅ Regime Urbanístico importado: ${importedCount} registros`);
}

async function importarZotsBairros(): Promise<void> {
    console.log('📊 Importando dados de ZOTs vs Bairros...');
    
    const dataPath = join(process.cwd(), 'processed-data', 'zots-bairros-processed.json');
    const rawData = readFileSync(dataPath, 'utf-8');
    const jsonData = JSON.parse(rawData);
    
    const registros: ZotsBairros[] = jsonData.data.map((item: any) => ({
        bairro: item.Bairro,
        zona: item.Zona,
        total_zonas_no_bairro: parseInt(item.Total_Zonas_no_Bairro) || 0,
        tem_zona_especial: item.Tem_Zona_Especial === 'Sim' || item.Tem_Zona_Especial === true
    }));
    
    console.log(`📈 Total de registros para importar: ${registros.length}`);
    
    // Importação em lotes de 50 registros
    const batchSize = 50;
    let importedCount = 0;
    
    for (let i = 0; i < registros.length; i += batchSize) {
        const batch = registros.slice(i, i + batchSize);
        
        try {
            const { error } = await supabase
                .from('zots_bairros')
                .insert(batch);
                
            if (error) {
                console.error(`❌ Erro no lote ${Math.floor(i/batchSize) + 1}:`, error);
                throw error;
            }
            
            importedCount += batch.length;
            console.log(`✅ Lote ${Math.floor(i/batchSize) + 1} importado: ${importedCount}/${registros.length} registros`);
            
            // Pausa de 1 segundo entre lotes para evitar rate limiting
            await new Promise(resolve => setTimeout(resolve, 1000));
            
        } catch (error) {
            console.error(`❌ Erro crítico no lote ${Math.floor(i/batchSize) + 1}:`, error);
            throw error;
        }
    }
    
    console.log(`✅ ZOTs vs Bairros importado: ${importedCount} registros`);
}

async function verificarImportacao(): Promise<void> {
    console.log('🔍 Verificando dados após importação...');
    
    try {
        // Verificar regime_urbanistico
        const { count: regimeCount, error: regimeError } = await supabase
            .from('regime_urbanistico')
            .select('*', { count: 'exact', head: true });
            
        if (regimeError) {
            console.error('❌ Erro ao verificar regime_urbanistico:', regimeError);
        } else {
            console.log(`✅ Regime Urbanístico: ${regimeCount} registros`);
        }
        
        // Verificar zots_bairros
        const { count: zotsCount, error: zotsError } = await supabase
            .from('zots_bairros')
            .select('*', { count: 'exact', head: true });
            
        if (zotsError) {
            console.error('❌ Erro ao verificar zots_bairros:', zotsError);
        } else {
            console.log(`✅ ZOTs vs Bairros: ${zotsCount} registros`);
        }
        
        // Verificar bairros únicos
        const { data: bairrosUnicos, error: bairrosError } = await supabase
            .from('regime_urbanistico')
            .select('bairro')
            .distinct();
            
        if (!bairrosError && bairrosUnicos) {
            console.log(`✅ Bairros únicos no regime: ${bairrosUnicos.length}`);
        }
        
        // Verificar zonas únicas
        const { data: zonasUnicas, error: zonasError } = await supabase
            .from('regime_urbanistico')
            .select('zona')
            .distinct();
            
        if (!zonasError && zonasUnicas) {
            console.log(`✅ Zonas únicas no regime: ${zonasUnicas.length}`);
        }
        
        // Amostra de dados
        const { data: amostra, error: amostraError } = await supabase
            .from('regime_urbanistico')
            .select('bairro, zona')
            .limit(5);
            
        if (!amostraError && amostra) {
            console.log('📋 Amostra de dados importados:');
            amostra.forEach((item, index) => {
                console.log(`   ${index + 1}. ${item.bairro} - ${item.zona}`);
            });
        }
        
    } catch (error) {
        console.error('❌ Erro na verificação:', error);
    }
}

async function main(): Promise<void> {
    console.log('🚀 Iniciando importação segura dos dados de Regime Urbanístico');
    console.log('=' .repeat(70));
    
    try {
        // Verificar conexão com Supabase
        console.log('🔗 Testando conexão com Supabase...');
        const { data, error } = await supabase.auth.getSession();
        if (error && error.message !== 'Auth session missing!') {
            throw error;
        }
        console.log('✅ Conexão com Supabase estabelecida.');
        
        // Verificar se tabelas existem
        const tabelasExistem = await verificarTabelasExistem();
        
        if (!tabelasExistem) {
            await criarTabelas();
        } else {
            await limparTabelasExistentes();
        }
        
        // Executar importações
        await importarRegimeUrbanistico();
        await importarZotsBairros();
        
        // Verificar resultados
        await verificarImportacao();
        
        console.log('=' .repeat(70));
        console.log('🎉 Importação concluída com sucesso!');
        
    } catch (error) {
        console.error('💥 Erro crítico na importação:', error);
        process.exit(1);
    }
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

export { main as importarDados };