import { createClient } from '@supabase/supabase-js';
import XLSX from 'xlsx';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabase = createClient(
  'https://ngrqwmvuhvjkeohesbxs.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzYwOTAxNywiZXhwIjoyMDY5MTg1MDE3fQ.7jVZP70RAjpfFPfehZt5Gr3vSxn8DZ3YyPJNjCwZXEo'
);

async function importDisasterRiskData() {
  try {
    console.log('🚀 Iniciando importação de dados de risco de desastre...\n');
    
    // Caminho do arquivo Excel
    const filePath = path.join(__dirname, 'knowledgebase/PDPOA2025-Risco_Desastre_vs_Bairros.xlsx');
    
    // Lê o arquivo Excel
    console.log('📂 Lendo arquivo:', filePath);
    const workbook = XLSX.readFile(filePath);
    
    // Assume que os dados estão na primeira planilha
    const sheetName = workbook.SheetNames[0];
    console.log('📋 Planilha:', sheetName);
    
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);
    
    console.log(`📊 Total de registros encontrados: ${data.length}\n`);
    
    // Limpar dados existentes
    console.log('🧹 Limpando dados existentes...');
    const { error: deleteError } = await supabase
      .from('bairros_risco_desastre')
      .delete()
      .neq('id', 0); // Deleta todos
    
    if (deleteError) {
      console.log('⚠️ Erro ao limpar:', deleteError.message);
    }
    
    // Processar e inserir dados
    const riscos = [];
    
    for (const row of data) {
      // Mapear os campos do Excel para o formato do banco
      const risco = {
        bairro_nome: row['Bairro'] || row['BAIRRO'] || row['Nome do Bairro'] || '',
        risco_inundacao: row['Inundação'] === 'Sim' || row['Inundação'] === true || row['INUNDACAO'] === 'Sim',
        risco_deslizamento: row['Deslizamento'] === 'Sim' || row['Deslizamento'] === true || row['DESLIZAMENTO'] === 'Sim',
        risco_alagamento: row['Alagamento'] === 'Sim' || row['Alagamento'] === true || row['ALAGAMENTO'] === 'Sim',
        risco_vendaval: row['Vendaval'] === 'Sim' || row['Vendaval'] === true || row['VENDAVAL'] === 'Sim',
        risco_granizo: row['Granizo'] === 'Sim' || row['Granizo'] === true || row['GRANIZO'] === 'Sim',
        nivel_risco_geral: parseInt(row['Nível de Risco'] || row['Nivel Risco'] || row['NIVEL_RISCO'] || '0'),
        nivel_risco_inundacao: parseInt(row['Nível Inundação'] || row['Nivel Inundacao'] || '0'),
        nivel_risco_deslizamento: parseInt(row['Nível Deslizamento'] || row['Nivel Deslizamento'] || '0'),
        areas_criticas: row['Áreas Críticas'] || row['Areas Criticas'] || row['AREAS_CRITICAS'] || null,
        observacoes: row['Observações'] || row['Observacoes'] || row['OBS'] || null,
        frequencia_anual: parseInt(row['Frequência Anual'] || row['Frequencia'] || '0') || null
      };
      
      // Só adiciona se tiver nome de bairro
      if (risco.bairro_nome && risco.bairro_nome.trim() !== '') {
        riscos.push(risco);
      }
    }
    
    console.log(`\n📍 Inserindo ${riscos.length} registros de risco...`);
    
    // Inserir em lotes de 50
    const batchSize = 50;
    let totalInserted = 0;
    
    for (let i = 0; i < riscos.length; i += batchSize) {
      const batch = riscos.slice(i, i + batchSize);
      
      const { data: inserted, error: insertError } = await supabase
        .from('bairros_risco_desastre')
        .insert(batch)
        .select();
      
      if (insertError) {
        console.log(`❌ Erro ao inserir lote ${i/batchSize + 1}:`, insertError.message);
      } else {
        totalInserted += inserted.length;
        console.log(`✅ Lote ${i/batchSize + 1}: ${inserted.length} registros inseridos`);
      }
    }
    
    console.log(`\n✅ Importação concluída! Total inserido: ${totalInserted} registros`);
    
    // Verificar alguns exemplos
    console.log('\n📋 Exemplos de bairros com riscos:');
    
    const { data: exemplos } = await supabase
      .from('bairros_risco_desastre')
      .select('bairro_nome, risco_inundacao, risco_deslizamento, nivel_risco_geral')
      .limit(5);
    
    if (exemplos) {
      exemplos.forEach(ex => {
        const riscos = [];
        if (ex.risco_inundacao) riscos.push('Inundação');
        if (ex.risco_deslizamento) riscos.push('Deslizamento');
        
        console.log(`- ${ex.bairro_nome}: ${riscos.join(', ')} (Nível: ${ex.nivel_risco_geral})`);
      });
    }
    
    // Testar função get_riscos_bairro
    console.log('\n🧪 Testando função get_riscos_bairro:');
    
    const { data: testeRisco, error: testeError } = await supabase
      .rpc('get_riscos_bairro', { nome_bairro: 'Centro' });
    
    if (testeError) {
      console.log('❌ Erro na função:', testeError.message);
    } else if (testeRisco && testeRisco.length > 0) {
      console.log('✅ Função funcionando:', testeRisco[0]);
    }
    
  } catch (error) {
    console.error('❌ Erro na importação:', error);
    process.exit(1);
  }
}

importDisasterRiskData().catch(console.error);