#!/usr/bin/env node

import XLSX from 'xlsx';
import fs from 'fs';

console.log('🔍 Analisando dados reais do Regime Urbanístico...\n');

const regimeFile = './knowledgebase/PDPOA2025-Regime_Urbanistico.xlsx';

if (fs.existsSync(regimeFile)) {
    const workbook = XLSX.readFile(regimeFile);
    const worksheet = workbook.Sheets['Sheet'];
    const data = XLSX.utils.sheet_to_json(worksheet);
    
    console.log(`📊 Total de registros: ${data.length}`);
    console.log('\n📋 Primeiros 5 registros:\n');
    
    data.slice(0, 5).forEach((row, idx) => {
        console.log(`Registro ${idx + 1}:`);
        console.log(`  Bairro: ${row.Bairro}`);
        console.log(`  Zona: ${row.Zona}`);
        console.log(`  Altura Máxima: ${row['Altura Máxima - Edificação Isolada']}`);
        console.log(`  Coef. Aproveitamento Básico: ${row['Coeficiente de Aproveitamento - Básico']}`);
        console.log(`  Coef. Aproveitamento Máximo: ${row['Coeficiente de Aproveitamento - Máximo']}`);
        console.log(`  Área Mínima do Lote: ${row['Área Mínima do Lote']}`);
        console.log(`  Testada Mínima: ${row['Testada Mínima do Lote']}`);
        console.log('---');
    });
    
    // Verificar todos os bairros únicos
    const bairrosUnicos = [...new Set(data.map(row => row.Bairro))];
    console.log(`\n📍 Total de bairros únicos: ${bairrosUnicos.length}`);
    console.log('Primeiros 10 bairros:', bairrosUnicos.slice(0, 10).join(', '));
    
    // Verificar zonas únicas
    const zonasUnicas = [...new Set(data.map(row => row.Zona))];
    console.log(`\n🏢 Total de zonas únicas: ${zonasUnicas.length}`);
    console.log('Primeiras 10 zonas:', zonasUnicas.slice(0, 10).join(', '));
}

// Analisar ZOTs
console.log('\n\n🔍 Analisando dados de ZOTs vs Bairros...\n');

const zotsFile = './knowledgebase/PDPOA2025-ZOTs_vs_Bairros.xlsx';

if (fs.existsSync(zotsFile)) {
    const workbook = XLSX.readFile(zotsFile);
    const worksheet = workbook.Sheets['Sheet'];
    const data = XLSX.utils.sheet_to_json(worksheet);
    
    console.log(`📊 Total de registros: ${data.length}`);
    console.log('\n📋 Primeiros 5 registros:\n');
    
    data.slice(0, 5).forEach((row, idx) => {
        console.log(`Registro ${idx + 1}:`);
        console.log(`  Bairro: ${row.Bairro}`);
        console.log(`  Zona: ${row.Zona}`);
        console.log(`  Total Zonas no Bairro: ${row.Total_Zonas_no_Bairro}`);
        console.log(`  Tem Zona Especial: ${row.Tem_Zona_Especial}`);
        console.log('---');
    });
}