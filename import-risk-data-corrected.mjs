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
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);
    
    console.log(`📊 Total de linhas encontradas: ${data.length}\n`);
    
    // Limpar dados existentes
    console.log('🧹 Limpando dados existentes...');
    const { error: deleteError } = await supabase
      .from('bairros_risco_desastre')
      .delete()
      .neq('id', 0);
    
    if (deleteError) {
      console.log('⚠️ Erro ao limpar:', deleteError.message);
    }
    
    // Processar dados por categoria
    const bairrosRisco = new Map();
    
    // Categorias e seus níveis de risco
    const categorias = {
      'Bairros com Ocupação Urbana Acima da Cota de Inundação 2024': {
        risco_inundacao: false,
        nivel_risco_inundacao: 0,
        nivel_risco_geral: 1,
        observacao: 'Ocupação acima da cota de inundação'
      },
      'Bairros Protegidos pelo Sistema Atual': {
        risco_inundacao: false,
        nivel_risco_inundacao: 0,
        nivel_risco_geral: 1,
        observacao: 'Protegido pelo sistema de contenção atual'
      },
      'Bairros em Área de Estudo': {
        risco_inundacao: true,
        nivel_risco_inundacao: 3,
        nivel_risco_geral: 3,
        observacao: 'Em área de estudo para proteção contra inundações'
      }
    };
    
    // Processar cada linha
    data.forEach(row => {
      Object.entries(row).forEach(([categoria, bairro]) => {
        if (bairro && typeof bairro === 'string' && bairro.trim() !== '') {
          const config = categorias[categoria];
          if (config) {
            bairrosRisco.set(bairro.trim().toUpperCase(), {
              bairro_nome: bairro.trim(),
              risco_inundacao: config.risco_inundacao,
              risco_deslizamento: false,
              risco_alagamento: config.risco_inundacao, // Alagamento relacionado a inundação
              risco_vendaval: false,
              risco_granizo: false,
              nivel_risco_geral: config.nivel_risco_geral,
              nivel_risco_inundacao: config.nivel_risco_inundacao,
              nivel_risco_deslizamento: 0,
              areas_criticas: null,
              observacoes: config.observacao,
              frequencia_anual: null
            });
          }
        }
      });
    });
    
    // Adicionar alguns bairros conhecidos com alto risco baseado nas enchentes de 2024
    const bairrosAltoRisco = [
      'CENTRO HISTÓRICO', 'CIDADE BAIXA', 'MENINO DEUS', 'PRAIA DE BELAS',
      'NAVEGANTES', 'HUMAITÁ', 'FARRAPOS', 'SÃO GERALDO', 'FLORESTA',
      'ANCHIETA', 'SARANDI', 'ARQUIPÉLAGO', 'ILHAS'
    ];
    
    bairrosAltoRisco.forEach(bairro => {
      if (!bairrosRisco.has(bairro)) {
        bairrosRisco.set(bairro, {
          bairro_nome: bairro,
          risco_inundacao: true,
          risco_deslizamento: false,
          risco_alagamento: true,
          risco_vendaval: false,
          risco_granizo: false,
          nivel_risco_geral: 5,
          nivel_risco_inundacao: 5,
          nivel_risco_deslizamento: 0,
          areas_criticas: 'Área afetada pelas enchentes de 2024',
          observacoes: 'Bairro severamente afetado nas enchentes de maio de 2024',
          frequencia_anual: 1
        });
      } else {
        // Atualizar para alto risco se já existe
        const existing = bairrosRisco.get(bairro);
        existing.risco_inundacao = true;
        existing.risco_alagamento = true;
        existing.nivel_risco_geral = 5;
        existing.nivel_risco_inundacao = 5;
        existing.areas_criticas = 'Área afetada pelas enchentes de 2024';
        existing.observacoes = 'Bairro severamente afetado nas enchentes de maio de 2024';
      }
    });
    
    const riscos = Array.from(bairrosRisco.values());
    console.log(`\n📍 Inserindo ${riscos.length} registros de risco...`);
    
    // Inserir em lotes
    const batchSize = 50;
    let totalInserted = 0;
    
    for (let i = 0; i < riscos.length; i += batchSize) {
      const batch = riscos.slice(i, i + batchSize);
      
      const { data: inserted, error: insertError } = await supabase
        .from('bairros_risco_desastre')
        .insert(batch)
        .select();
      
      if (insertError) {
        console.log(`❌ Erro ao inserir lote ${Math.floor(i/batchSize) + 1}:`, insertError.message);
      } else {
        totalInserted += inserted.length;
        console.log(`✅ Lote ${Math.floor(i/batchSize) + 1}: ${inserted.length} registros inseridos`);
      }
    }
    
    console.log(`\n✅ Importação concluída! Total inserido: ${totalInserted} registros`);
    
    // Verificar alguns exemplos
    console.log('\n📋 Exemplos de bairros com diferentes níveis de risco:');
    
    const { data: exemplos } = await supabase
      .from('bairros_risco_desastre')
      .select('bairro_nome, risco_inundacao, nivel_risco_geral, observacoes')
      .order('nivel_risco_geral', { ascending: false })
      .limit(10);
    
    if (exemplos) {
      exemplos.forEach(ex => {
        const risco = ex.nivel_risco_geral === 5 ? '🔴 ALTO' : 
                     ex.nivel_risco_geral === 3 ? '🟡 MÉDIO' : '🟢 BAIXO';
        console.log(`- ${ex.bairro_nome}: ${risco} (${ex.observacoes})`);
      });
    }
    
    // Testar função get_riscos_bairro
    console.log('\n🧪 Testando consultas de risco:');
    
    const testeBairros = ['CENTRO HISTÓRICO', 'MENINO DEUS', 'ABERTA DOS MORROS'];
    
    for (const bairro of testeBairros) {
      const { data: testeRisco, error: testeError } = await supabase
        .rpc('get_riscos_bairro', { nome_bairro: bairro });
      
      if (testeError) {
        console.log(`❌ Erro ao buscar ${bairro}:`, testeError.message);
      } else if (testeRisco && testeRisco.length > 0) {
        const resultado = testeRisco[0];
        console.log(`✅ ${bairro}: ${resultado.descricao_riscos} - Riscos: ${resultado.riscos_ativos.join(', ')}`);
      } else {
        console.log(`⚠️ ${bairro}: Sem dados de risco`);
      }
    }
    
  } catch (error) {
    console.error('❌ Erro na importação:', error);
    process.exit(1);
  }
}

importDisasterRiskData().catch(console.error);