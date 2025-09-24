#!/usr/bin/env node

/**
 * Análise detalhada do conteúdo REAL da planilha Excel
 * Para identificar onde estão os dados que estão sendo perdidos
 */

import ExcelJS from 'exceljs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const excelPath = path.join(__dirname, '..', 'knowledgebase', 'PDPOA2025-Regime_Urbanistico.xlsx');

async function analyzeExcel() {
  console.log('📊 === ANÁLISE DETALHADA DA PLANILHA EXCEL ===\n');
  
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(excelPath);
  const worksheet = workbook.getWorksheet(1);
  
  // 1. Analisar todos os headers
  console.log('📋 TODOS OS HEADERS DA PLANILHA:\n');
  const headers = {};
  worksheet.getRow(1).eachCell((cell, colNumber) => {
    const value = cell.value?.toString() || '';
    headers[colNumber] = value;
    if (value && colNumber <= 50) {
      console.log(`Col ${colNumber}: ${value}`);
    }
  });
  
  // 2. Analisar primeiras 5 linhas completas
  console.log('\n📊 PRIMEIRAS 5 LINHAS DE DADOS (TODAS AS COLUNAS COM VALORES):\n');
  
  for (let rowNum = 2; rowNum <= 6; rowNum++) {
    const row = worksheet.getRow(rowNum);
    console.log(`\n${'='.repeat(80)}`);
    console.log(`LINHA ${rowNum}:`);
    console.log(`${'='.repeat(80)}`);
    
    // Mostrar apenas colunas que têm valores
    row.eachCell((cell, colNumber) => {
      const value = cell.value;
      const header = headers[colNumber] || `Col${colNumber}`;
      
      if (value !== null && value !== undefined && value !== '') {
        let displayValue = value;
        
        // Tratar diferentes tipos
        if (value instanceof Date) {
          displayValue = `[DATA] ${value.toLocaleDateString()}`;
        } else if (typeof value === 'object' && value?.result !== undefined) {
          displayValue = `[FÓRMULA] ${value.result}`;
        }
        
        console.log(`  ${header}: ${displayValue}`);
      }
    });
  }
  
  // 3. Análise específica de coeficientes
  console.log('\n🔍 ANÁLISE DE CAMPOS DE COEFICIENTES:\n');
  
  // Buscar colunas que contenham "coef" no header
  const coefColumns = [];
  Object.entries(headers).forEach(([col, header]) => {
    if (header.toLowerCase().includes('coef')) {
      coefColumns.push({ col: parseInt(col), header });
    }
  });
  
  console.log(`Encontradas ${coefColumns.length} colunas de coeficientes:`);
  coefColumns.forEach(({ col, header }) => {
    console.log(`  Col ${col}: ${header}`);
  });
  
  // Verificar valores nessas colunas
  console.log('\nValores de coeficientes nas primeiras 10 linhas:\n');
  
  for (let rowNum = 2; rowNum <= 11; rowNum++) {
    const row = worksheet.getRow(rowNum);
    const bairro = row.getCell(2).value;
    
    console.log(`Linha ${rowNum} - ${bairro}:`);
    coefColumns.forEach(({ col, header }) => {
      const value = row.getCell(col).value;
      if (value !== null && value !== undefined && value !== '') {
        console.log(`  ${header}: ${value}`);
      }
    });
  }
  
  // 4. Estatísticas gerais
  console.log('\n📈 ESTATÍSTICAS DA PLANILHA:\n');
  
  let totalRows = 0;
  let rowsWithCoef = 0;
  let rowsWithAltura = 0;
  const valoresUnicos = new Set();
  
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    totalRows++;
    
    // Verificar altura (coluna 4)
    const altura = row.getCell(4).value;
    if (altura && altura !== '' && altura !== 'Não se aplica') {
      rowsWithAltura++;
    }
    
    // Verificar coeficientes
    let hasCoef = false;
    coefColumns.forEach(({ col }) => {
      const value = row.getCell(col).value;
      if (value && value !== '' && value !== 'Não se aplica') {
        hasCoef = true;
        valoresUnicos.add(value.toString());
      }
    });
    if (hasCoef) rowsWithCoef++;
  });
  
  console.log(`Total de linhas de dados: ${totalRows}`);
  console.log(`Linhas com altura definida: ${rowsWithAltura}`);
  console.log(`Linhas com coeficientes: ${rowsWithCoef}`);
  console.log(`\nValores únicos de coeficientes encontrados:`);
  valoresUnicos.forEach(v => console.log(`  - ${v}`));
  
  // 5. Identificar problema específico
  console.log('\n❗ DIAGNÓSTICO DO PROBLEMA:\n');
  
  // Verificar onde estão os dados de coeficientes
  console.log('Verificando linha 100 como exemplo:');
  const row100 = worksheet.getRow(100);
  console.log(`  Bairro: ${row100.getCell(2).value}`);
  console.log(`  Zona: ${row100.getCell(3).value}`);
  
  for (let col = 4; col <= 50; col++) {
    const value = row100.getCell(col).value;
    if (value && value !== '' && value !== 'Não se aplica') {
      console.log(`  Col ${col} (${headers[col]}): ${value}`);
    }
  }
}

analyzeExcel().catch(console.error);