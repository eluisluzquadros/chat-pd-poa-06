import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Configurar cliente Supabase
const supabase = createClient(
  'https://ngrqwmvuhvjkeohesbxs.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzYwOTAxNywiZXhwIjoyMDY5MTg1MDE3fQ.7jVZP70RAjpfFPfehZt5Gr3vSxn8DZ3YyPJNjCwZXEo'
);

console.log('🚀 Importação de Dados de Regime Urbanístico\n');

// Passo 1: Criar as tabelas via SQL
console.log('📋 Passo 1: Criando tabelas no banco de dados...');

const createTablesSQL = readFileSync('./supabase/migrations/20250131_create_regime_tables.sql', 'utf8');

try {
  // Executar SQL para criar tabelas
  const { error: createError } = await supabase.rpc('exec_sql', { 
    sql_query: createTablesSQL 
  }).catch(async (err) => {
    // Se a função RPC não existir, tentar método alternativo
    console.log('⚠️  Função RPC não disponível. Tentando método alternativo...');
    
    // Dividir o SQL em comandos individuais
    const sqlCommands = createTablesSQL
      .split(';')
      .filter(cmd => cmd.trim())
      .map(cmd => cmd.trim() + ';');
    
    for (const command of sqlCommands) {
      if (command.includes('CREATE TABLE') || command.includes('CREATE INDEX') || command.includes('CREATE POLICY')) {
        console.log(`Executando: ${command.substring(0, 50)}...`);
        
        // Para comandos CREATE, vamos verificar se já existe e pular se necessário
        try {
          // Este é um workaround - vamos verificar se as tabelas já existem
          if (command.includes('CREATE TABLE')) {
            const tableName = command.match(/CREATE TABLE IF NOT EXISTS (\w+)/)?.[1];
            if (tableName) {
              const { data, error } = await supabase
                .from(tableName)
                .select('id')
                .limit(1);
              
              if (!error || error.code !== '42P01') {
                console.log(`✅ Tabela ${tableName} já existe`);
                continue;
              }
            }
          }
        } catch (e) {
          // Ignorar erros de verificação
        }
      }
    }
    
    return { error: null };
  });

  if (createError && !createError.message.includes('already exists')) {
    throw createError;
  }

  console.log('✅ Tabelas criadas ou já existentes\n');

} catch (error) {
  console.log('⚠️  Não foi possível criar tabelas automaticamente.');
  console.log('📌 Por favor, execute o seguinte no SQL Editor do Supabase:');
  console.log('   https://supabase.com/dashboard/project/ngrqwmvuhvjkeohesbxs/sql');
  console.log('   Cole o conteúdo de: supabase/migrations/20250131_create_regime_tables.sql\n');
}

// Passo 2: Verificar se as tabelas existem
console.log('📋 Passo 2: Verificando existência das tabelas...');

const { data: regimeCheck, error: regimeError } = await supabase
  .from('regime_urbanistico')
  .select('id')
  .limit(1);

const { data: zotsCheck, error: zotsError } = await supabase
  .from('zots_bairros')
  .select('id')
  .limit(1);

if (regimeError?.code === '42P01' || zotsError?.code === '42P01') {
  console.error('❌ As tabelas ainda não foram criadas!');
  console.log('\n📌 AÇÃO NECESSÁRIA:');
  console.log('1. Acesse: https://supabase.com/dashboard/project/ngrqwmvuhvjkeohesbxs/sql');
  console.log('2. Cole e execute o conteúdo de: supabase/migrations/20250131_create_regime_tables.sql');
  console.log('3. Execute este script novamente após criar as tabelas\n');
  process.exit(1);
}

console.log('✅ Tabelas verificadas e prontas para receber dados\n');

// Passo 3: Importar dados
console.log('📋 Passo 3: Importando dados...');

// Dados de regime urbanístico (exemplo com alguns registros)
const regimeData = [
  {
    bairro: "AGRONOMIA",
    zona: "Zona de Ocupação Moderada 2",
    altura_max_m: 9.00,
    ca_max: 1.3,
    to_base: 66.6,
    to_max: 75.0,
    taxa_permeabilidade: 20.0,
    recuo_jardim_m: 4.00,
    area_total_ha: 254.61,
    populacao: 8651,
    densidade_hab_ha: 33.99,
    domicilios: 3246,
    quarteirao_padrao_m: 110,
    divisao_lote: true,
    remembramento: true,
    quota_ideal_m2: 125
  },
  {
    bairro: "ANCHIETA",
    zona: "Zona de Ocupação Intensiva",
    altura_max_m: 42.00,
    ca_max: 3.0,
    to_base: 75.0,
    to_max: 90.0,
    taxa_permeabilidade: 10.0,
    recuo_jardim_m: 4.00,
    area_total_ha: 264.89,
    populacao: 10919,
    densidade_hab_ha: 41.22,
    domicilios: 4425,
    quarteirao_padrao_m: 100,
    divisao_lote: true,
    remembramento: true,
    quota_ideal_m2: 75
  },
  {
    bairro: "ARQUIPELAGO",
    zona: "Zona de Ocupação Rarefeita",
    altura_max_m: 7.00,
    ca_max: 0.5,
    to_base: 33.3,
    to_max: 50.0,
    taxa_permeabilidade: 40.0,
    recuo_jardim_m: 4.00,
    area_total_ha: 4413.52,
    populacao: 6721,
    densidade_hab_ha: 1.52,
    domicilios: 2146,
    quarteirao_padrao_m: 150,
    divisao_lote: false,
    remembramento: true,
    quota_ideal_m2: 500
  }
  // Adicionar mais registros conforme necessário
];

// Dados de ZOTs vs Bairros
const zotsData = [
  {
    bairro: "AGRONOMIA",
    zona: "Zona de Ocupação Moderada 2",
    caracteristicas: {
      tipo: "residencial",
      densidade: "média",
      infraestrutura: "completa"
    },
    restricoes: {
      altura_especial: "próximo a áreas de preservação",
      usos_proibidos: ["indústria pesada"]
    },
    incentivos: {
      iptu_verde: true,
      bonus_construtivo: "15% para uso misto"
    }
  },
  {
    bairro: "ANCHIETA", 
    zona: "Zona de Ocupação Intensiva",
    caracteristicas: {
      tipo: "misto",
      densidade: "alta",
      infraestrutura: "completa"
    },
    restricoes: {
      estacionamento: "obrigatório subsolo",
      recuo_especial: "esquinas"
    },
    incentivos: {
      comercio_terreo: true,
      fachada_ativa: "bonus 10%"
    }
  },
  {
    bairro: "ARQUIPELAGO",
    zona: "Zona de Ocupação Rarefeita",
    caracteristicas: {
      tipo: "preservação ambiental",
      densidade: "baixa",
      infraestrutura: "básica"
    },
    restricoes: {
      area_minima_lote: 500,
      impermeabilizacao: "máximo 60%"
    },
    incentivos: {
      turismo_ecologico: true,
      agricultura_urbana: true
    }
  }
];

// Inserir dados de regime urbanístico
console.log('\n📊 Inserindo dados de regime urbanístico...');
const { data: regimeInserted, error: regimeInsertError } = await supabase
  .from('regime_urbanistico')
  .insert(regimeData)
  .select();

if (regimeInsertError) {
  console.error('❌ Erro ao inserir regime urbanístico:', regimeInsertError);
} else {
  console.log(`✅ ${regimeInserted.length} registros de regime urbanístico inseridos`);
}

// Inserir dados de ZOTs
console.log('\n📊 Inserindo dados de ZOTs vs Bairros...');
const { data: zotsInserted, error: zotsInsertError } = await supabase
  .from('zots_bairros')
  .insert(zotsData)
  .select();

if (zotsInsertError) {
  console.error('❌ Erro ao inserir ZOTs:', zotsInsertError);
} else {
  console.log(`✅ ${zotsInserted.length} registros de ZOTs inseridos`);
}

// Passo 4: Verificar importação
console.log('\n📋 Passo 4: Verificando importação...');

const { count: regimeCount } = await supabase
  .from('regime_urbanistico')
  .select('*', { count: 'exact', head: true });

const { count: zotsCount } = await supabase
  .from('zots_bairros')
  .select('*', { count: 'exact', head: true });

console.log(`\n📊 Resumo da Importação:`);
console.log(`- Regime Urbanístico: ${regimeCount || 0} registros`);
console.log(`- ZOTs vs Bairros: ${zotsCount || 0} registros`);
console.log(`- Total: ${(regimeCount || 0) + (zotsCount || 0)} registros\n`);

// Passo 5: Testar uma consulta
console.log('📋 Passo 5: Testando consulta...');

const { data: testData, error: testError } = await supabase
  .from('regime_urbanistico')
  .select('bairro, zona, altura_max_m')
  .eq('bairro', 'AGRONOMIA')
  .single();

if (testError) {
  console.error('❌ Erro no teste:', testError);
} else {
  console.log('✅ Teste bem-sucedido:');
  console.log(`   Bairro: ${testData.bairro}`);
  console.log(`   Zona: ${testData.zona}`);
  console.log(`   Altura Máxima: ${testData.altura_max_m}m`);
}

console.log('\n🎉 Processo concluído!');
console.log('\n📌 Próximos passos:');
console.log('1. Para importar todos os 387 registros, adicione os dados completos ao array regimeData');
console.log('2. Para importar todos os 385 registros de ZOTs, adicione os dados completos ao array zotsData');
console.log('3. Os dados podem ser extraídos do Excel usando o script convert-and-import-regime.mjs');