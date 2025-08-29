import XLSX from 'xlsx';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const filePath = path.join(__dirname, 'knowledgebase/PDPOA2025-Risco_Desastre_vs_Bairros.xlsx');
const workbook = XLSX.readFile(filePath);
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(worksheet);

console.log('Primeiras 3 linhas do Excel:');
console.log(JSON.stringify(data.slice(0, 3), null, 2));

console.log('\nColunas disponíveis:');
if (data.length > 0) {
  console.log(Object.keys(data[0]));
}