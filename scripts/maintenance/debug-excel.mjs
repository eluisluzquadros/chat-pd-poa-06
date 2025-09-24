#!/usr/bin/env node

import XLSX from 'xlsx';
import fs from 'fs';

console.log('Iniciando debug...');

const regimeFile = './knowledgebase/PDPOA2025-Regime_Urbanistico.xlsx';
const zotsFile = './knowledgebase/PDPOA2025-ZOTs_vs_Bairros.xlsx';

console.log('Verificando arquivos...');
console.log('Regime file exists:', fs.existsSync(regimeFile));
console.log('ZOTs file exists:', fs.existsSync(zotsFile));

if (fs.existsSync(regimeFile)) {
    try {
        console.log('Tentando ler arquivo de regime...');
        const workbook = XLSX.readFile(regimeFile);
        console.log('Planilhas encontradas:', workbook.SheetNames);
        
        workbook.SheetNames.forEach(sheetName => {
            console.log(`\nProcessando planilha: ${sheetName}`);
            const worksheet = workbook.Sheets[sheetName];
            const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            console.log(`  Linhas: ${data.length}`);
            if (data.length > 0) {
                console.log(`  Primeira linha: ${JSON.stringify(data[0])}`);
            }
        });
    } catch (error) {
        console.error('Erro ao processar regime:', error);
    }
}

if (fs.existsSync(zotsFile)) {
    try {
        console.log('\nTentando ler arquivo de ZOTs...');
        const workbook = XLSX.readFile(zotsFile);
        console.log('Planilhas encontradas:', workbook.SheetNames);
        
        workbook.SheetNames.forEach(sheetName => {
            console.log(`\nProcessando planilha: ${sheetName}`);
            const worksheet = workbook.Sheets[sheetName];
            const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            console.log(`  Linhas: ${data.length}`);
            if (data.length > 0) {
                console.log(`  Primeira linha: ${JSON.stringify(data[0])}`);
            }
        });
    } catch (error) {
        console.error('Erro ao processar ZOTs:', error);
    }
}

console.log('Debug concluído.');