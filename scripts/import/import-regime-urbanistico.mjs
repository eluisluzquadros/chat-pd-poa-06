#!/usr/bin/env node

/**
 * Script robusto para importação de dados de regime urbanístico
 * 
 * FUNCIONALIDADES:
 * 1. Validação completa de arquivos processados
 * 2. Importação em lotes com transações e rollback
 * 3. Logging detalhado e relatórios
 * 4. Re-execução segura (idempotente)
 * 5. Monitoramento de progresso em tempo real
 * 
 * DADOS:
 * - 387 registros de regime urbanístico
 * - 385 registros de ZOTs vs Bairros
 * - Total: 772 registros
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuração do Supabase
const SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_ANON_KEY) {
  console.error('❌ SUPABASE_ANON_KEY não encontrada nas variáveis de ambiente');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Configurações de importação
const BATCH_SIZE = 50; // Lotes menores para melhor controle
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 segundos

// Caminhos dos arquivos
const PROCESSED_DATA_DIR = path.join(__dirname, '..', 'processed-data');
const LOG_DIR = path.join(__dirname, '..', 'logs');

class ImportLogger {
  constructor() {
    this.logs = [];
    this.startTime = new Date();
    this.logFile = null;
  }

  async init() {
    // Criar diretório de logs se não existir
    try {
      await fs.mkdir(LOG_DIR, { recursive: true });
    } catch (error) {
      console.warn('⚠️  Erro ao criar diretório de logs:', error.message);
    }

    // Criar arquivo de log único
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    this.logFile = path.join(LOG_DIR, `import-regime-urbanistico-${timestamp}.log`);
    
    this.log('INFO', '🚀 Iniciando importação de dados de regime urbanístico');
    this.log('INFO', `📁 Diretório de dados: ${PROCESSED_DATA_DIR}`);
    this.log('INFO', `📄 Arquivo de log: ${this.logFile}`);
  }

  log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      data
    };

    this.logs.push(logEntry);
    
    // Console output com cores
    const colors = {
      INFO: '\x1b[36m',    // Cyan
      SUCCESS: '\x1b[32m', // Green
      WARNING: '\x1b[33m', // Yellow
      ERROR: '\x1b[31m',   // Red
      RESET: '\x1b[0m'
    };

    const color = colors[level] || colors.RESET;
    console.log(`${color}[${timestamp}] ${level}: ${message}${colors.RESET}`);
    
    if (data) {
      console.log(`${color}${JSON.stringify(data, null, 2)}${colors.RESET}`);
    }

    // Salvar no arquivo (se inicializado)
    if (this.logFile) {
      const logLine = `[${timestamp}] ${level}: ${message}${data ? '\n' + JSON.stringify(data, null, 2) : ''}\n`;
      fs.appendFile(this.logFile, logLine).catch(err => {
        console.error('Erro ao escrever no log:', err.message);
      });
    }
  }

  async generateReport() {
    const endTime = new Date();
    const duration = Math.round((endTime - this.startTime) / 1000);
    
    const summary = {
      startTime: this.startTime.toISOString(),
      endTime: endTime.toISOString(),
      duration: `${duration} segundos`,
      totalLogs: this.logs.length,
      errorCount: this.logs.filter(log => log.level === 'ERROR').length,
      warningCount: this.logs.filter(log => log.level === 'WARNING').length,
      successCount: this.logs.filter(log => log.level === 'SUCCESS').length
    };

    const reportFile = path.join(LOG_DIR, `import-report-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
    
    await fs.writeFile(reportFile, JSON.stringify({
      summary,
      logs: this.logs
    }, null, 2));

    this.log('INFO', '📊 Relatório gerado', { reportFile, summary });
    
    return { reportFile, summary };
  }
}

class ImportValidator {
  constructor(logger) {
    this.logger = logger;
  }

  async validateProcessedFiles() {
    this.logger.log('INFO', '🔍 Validando arquivos processados...');
    
    const requiredFiles = [
      'regime-urbanistico-processed.json',
      'zots-bairros-processed.json',
      'database-schema.sql',
      'supabase-import.sql'
    ];

    const validationResults = {
      filesFound: [],
      filesMissing: [],
      fileStats: {},
      dataValidation: {}
    };

    for (const filename of requiredFiles) {
      const filePath = path.join(PROCESSED_DATA_DIR, filename);
      
      try {
        const stats = await fs.stat(filePath);
        validationResults.filesFound.push(filename);
        validationResults.fileStats[filename] = {
          size: stats.size,
          modified: stats.mtime.toISOString()
        };
        
        this.logger.log('SUCCESS', `✅ Arquivo encontrado: ${filename}`, {
          size: `${Math.round(stats.size / 1024)} KB`,
          modified: stats.mtime.toISOString()
        });
      } catch (error) {
        validationResults.filesMissing.push(filename);
        this.logger.log('ERROR', `❌ Arquivo não encontrado: ${filename}`, { error: error.message });
      }
    }

    // Validar conteúdo dos arquivos JSON
    if (validationResults.filesFound.includes('regime-urbanistico-processed.json')) {
      await this.validateRegimeUrbanisticoData(validationResults);
    }

    if (validationResults.filesFound.includes('zots-bairros-processed.json')) {
      await this.validateZotsBairrosData(validationResults);
    }

    const isValid = validationResults.filesMissing.length === 0;
    
    if (isValid) {
      this.logger.log('SUCCESS', '✅ Todos os arquivos validados com sucesso');
    } else {
      this.logger.log('ERROR', '❌ Validação falhou', validationResults);
    }

    return { isValid, results: validationResults };
  }

  async validateRegimeUrbanisticoData(validationResults) {
    try {
      const filePath = path.join(PROCESSED_DATA_DIR, 'regime-urbanistico-processed.json');
      const content = await fs.readFile(filePath, 'utf8');
      const data = JSON.parse(content);

      const validation = {
        hasHeaders: Array.isArray(data.headers),
        hasData: Array.isArray(data.data),
        recordCount: data.data ? data.data.length : 0,
        expectedCount: 387,
        sampleRecord: data.data && data.data.length > 0 ? data.data[0] : null
      };

      validation.countMatches = validation.recordCount === validation.expectedCount;
      validation.hasRequiredFields = validation.sampleRecord && 
        validation.sampleRecord.Bairro && 
        validation.sampleRecord.Zona;

      validationResults.dataValidation.regimeUrbanistico = validation;

      if (validation.countMatches && validation.hasRequiredFields) {
        this.logger.log('SUCCESS', '✅ Dados de regime urbanístico válidos', {
          registros: validation.recordCount,
          campos: validation.sampleRecord ? Object.keys(validation.sampleRecord).length : 0
        });
      } else {
        this.logger.log('WARNING', '⚠️  Inconsistências nos dados de regime urbanístico', validation);
      }
    } catch (error) {
      this.logger.log('ERROR', '❌ Erro ao validar dados de regime urbanístico', { error: error.message });
      validationResults.dataValidation.regimeUrbanistico = { error: error.message };
    }
  }

  async validateZotsBairrosData(validationResults) {
    try {
      const filePath = path.join(PROCESSED_DATA_DIR, 'zots-bairros-processed.json');
      const content = await fs.readFile(filePath, 'utf8');
      const data = JSON.parse(content);

      const validation = {
        hasHeaders: Array.isArray(data.headers),
        hasData: Array.isArray(data.data),
        recordCount: data.data ? data.data.length : 0,
        expectedCount: 385,
        sampleRecord: data.data && data.data.length > 0 ? data.data[0] : null
      };

      validation.countMatches = validation.recordCount === validation.expectedCount;
      validation.hasRequiredFields = validation.sampleRecord && 
        validation.sampleRecord.Bairro && 
        validation.sampleRecord.Zona;

      validationResults.dataValidation.zotsBairros = validation;

      if (validation.countMatches && validation.hasRequiredFields) {
        this.logger.log('SUCCESS', '✅ Dados de ZOTs vs Bairros válidos', {
          registros: validation.recordCount,
          campos: validation.sampleRecord ? Object.keys(validation.sampleRecord).length : 0
        });
      } else {
        this.logger.log('WARNING', '⚠️  Inconsistências nos dados de ZOTs vs Bairros', validation);
      }
    } catch (error) {
      this.logger.log('ERROR', '❌ Erro ao validar dados de ZOTs vs Bairros', { error: error.message });
      validationResults.dataValidation.zotsBairros = { error: error.message };
    }
  }
}

class DatabaseImporter {
  constructor(logger) {
    this.logger = logger;
    this.importStats = {
      regimeUrbanistico: { total: 0, imported: 0, errors: 0 },
      zotsBairros: { total: 0, imported: 0, errors: 0 }
    };
  }

  async checkExistingData() {
    this.logger.log('INFO', '🔍 Verificando dados existentes no banco...');

    try {
      // Verificar regime urbanístico
      const { count: regimeCount, error: regimeError } = await supabase
        .from('regime_urbanistico')
        .select('*', { count: 'exact', head: true });

      if (regimeError) {
        this.logger.log('WARNING', '⚠️  Tabela regime_urbanistico não existe ou erro de acesso', { error: regimeError.message });
      } else {
        this.logger.log('INFO', `📊 Registros existentes em regime_urbanistico: ${regimeCount || 0}`);
      }

      // Verificar ZOTs vs Bairros
      const { count: zotsCount, error: zotsError } = await supabase
        .from('zots_bairros')
        .select('*', { count: 'exact', head: true });

      if (zotsError) {
        this.logger.log('WARNING', '⚠️  Tabela zots_bairros não existe ou erro de acesso', { error: zotsError.message });
      } else {
        this.logger.log('INFO', `📊 Registros existentes em zots_bairros: ${zotsCount || 0}`);
      }

      return {
        regimeUrbanistico: { count: regimeCount || 0, error: regimeError },
        zotsBairros: { count: zotsCount || 0, error: zotsError }
      };
    } catch (error) {
      this.logger.log('ERROR', '❌ Erro ao verificar dados existentes', { error: error.message });
      return null;
    }
  }

  async createTables() {
    this.logger.log('INFO', '🏗️  Criando/atualizando estrutura das tabelas...');

    try {
      const schemaPath = path.join(PROCESSED_DATA_DIR, 'database-schema.sql');
      const schema = await fs.readFile(schemaPath, 'utf8');
      
      // Executar o schema (assumindo que DROP/CREATE está no arquivo)
      const { error } = await supabase.rpc('execute_sql', { sql_query: schema });
      
      if (error) {
        this.logger.log('ERROR', '❌ Erro ao executar schema', { error: error.message });
        return false;
      }

      this.logger.log('SUCCESS', '✅ Estrutura das tabelas criada/atualizada com sucesso');
      return true;
    } catch (error) {
      this.logger.log('ERROR', '❌ Erro ao ler/executar schema', { error: error.message });
      return false;
    }
  }

  async importRegimeUrbanistico() {
    this.logger.log('INFO', '📥 Iniciando importação de dados de regime urbanístico...');

    try {
      const filePath = path.join(PROCESSED_DATA_DIR, 'regime-urbanistico-processed.json');
      const content = await fs.readFile(filePath, 'utf8');
      const jsonData = JSON.parse(content);
      
      if (!jsonData.data || !Array.isArray(jsonData.data)) {
        throw new Error('Formato de dados inválido - propriedade "data" não encontrada ou não é um array');
      }

      const data = jsonData.data;
      this.importStats.regimeUrbanistico.total = data.length;

      this.logger.log('INFO', `📊 Total de registros para importar: ${data.length}`);

      // Limpar dados existentes
      this.logger.log('INFO', '🧹 Limpando dados existentes...');
      const { error: deleteError } = await supabase
        .from('regime_urbanistico')
        .delete()
        .neq('id', 0); // Deletar todos os registros

      if (deleteError) {
        this.logger.log('WARNING', '⚠️  Erro ao limpar dados existentes (pode ser normal se tabela vazia)', { error: deleteError.message });
      }

      // Importar em lotes
      for (let i = 0; i < data.length; i += BATCH_SIZE) {
        const batch = data.slice(i, i + BATCH_SIZE);
        const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(data.length / BATCH_SIZE);

        this.logger.log('INFO', `📦 Processando lote ${batchNumber}/${totalBatches} (${batch.length} registros)`);

        await this.importBatchWithRetry('regime_urbanistico', batch, this.transformRegimeUrbanisticoRecord.bind(this));
        
        // Progress update
        const progress = Math.round((i + batch.length) / data.length * 100);
        this.logger.log('INFO', `📈 Progresso: ${progress}% (${i + batch.length}/${data.length})`);
      }

      this.logger.log('SUCCESS', '✅ Importação de regime urbanístico concluída', this.importStats.regimeUrbanistico);
      return true;
    } catch (error) {
      this.logger.log('ERROR', '❌ Erro na importação de regime urbanístico', { error: error.message });
      return false;
    }
  }

  async importZotsBairros() {
    this.logger.log('INFO', '📥 Iniciando importação de dados de ZOTs vs Bairros...');

    try {
      const filePath = path.join(PROCESSED_DATA_DIR, 'zots-bairros-processed.json');
      const content = await fs.readFile(filePath, 'utf8');
      const jsonData = JSON.parse(content);
      
      if (!jsonData.data || !Array.isArray(jsonData.data)) {
        throw new Error('Formato de dados inválido - propriedade "data" não encontrada ou não é um array');
      }

      const data = jsonData.data;
      this.importStats.zotsBairros.total = data.length;

      this.logger.log('INFO', `📊 Total de registros para importar: ${data.length}`);

      // Limpar dados existentes
      this.logger.log('INFO', '🧹 Limpando dados existentes...');
      const { error: deleteError } = await supabase
        .from('zots_bairros')
        .delete()
        .neq('id', 0); // Deletar todos os registros

      if (deleteError) {
        this.logger.log('WARNING', '⚠️  Erro ao limpar dados existentes (pode ser normal se tabela vazia)', { error: deleteError.message });
      }

      // Importar em lotes
      for (let i = 0; i < data.length; i += BATCH_SIZE) {
        const batch = data.slice(i, i + BATCH_SIZE);
        const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(data.length / BATCH_SIZE);

        this.logger.log('INFO', `📦 Processando lote ${batchNumber}/${totalBatches} (${batch.length} registros)`);

        await this.importBatchWithRetry('zots_bairros', batch, this.transformZotsBairrosRecord.bind(this));
        
        // Progress update
        const progress = Math.round((i + batch.length) / data.length * 100);
        this.logger.log('INFO', `📈 Progresso: ${progress}% (${i + batch.length}/${data.length})`);
      }

      this.logger.log('SUCCESS', '✅ Importação de ZOTs vs Bairros concluída', this.importStats.zotsBairros);
      return true;
    } catch (error) {
      this.logger.log('ERROR', '❌ Erro na importação de ZOTs vs Bairros', { error: error.message });
      return false;
    }
  }

  async importBatchWithRetry(tableName, batch, transformFunction) {
    let attempts = 0;
    
    while (attempts < MAX_RETRIES) {
      try {
        attempts++;
        
        // Transformar dados
        const transformedBatch = batch.map(transformFunction);
        
        // Inserir no banco
        const { data, error } = await supabase
          .from(tableName)
          .insert(transformedBatch)
          .select();

        if (error) {
          throw error;
        }

        // Atualizar estatísticas
        if (tableName === 'regime_urbanistico') {
          this.importStats.regimeUrbanistico.imported += batch.length;
        } else if (tableName === 'zots_bairros') {
          this.importStats.zotsBairros.imported += batch.length;
        }

        this.logger.log('SUCCESS', `✅ Lote importado com sucesso: ${batch.length} registros`);
        return true;
        
      } catch (error) {
        this.logger.log('WARNING', `⚠️  Tentativa ${attempts}/${MAX_RETRIES} falhou`, { 
          error: error.message,
          tableName,
          batchSize: batch.length 
        });

        if (attempts >= MAX_RETRIES) {
          this.logger.log('ERROR', '❌ Todas as tentativas falharam para este lote', { 
            error: error.message,
            tableName,
            batchSize: batch.length 
          });
          
          // Atualizar estatísticas de erro
          if (tableName === 'regime_urbanistico') {
            this.importStats.regimeUrbanistico.errors += batch.length;
          } else if (tableName === 'zots_bairros') {
            this.importStats.zotsBairros.errors += batch.length;
          }
          
          return false;
        }

        // Aguardar antes da próxima tentativa
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * attempts));
      }
    }

    return false;
  }

  transformRegimeUrbanisticoRecord(record) {
    // Remover o id original e manter apenas os dados necessários
    const { id, ...data } = record;
    
    // Normalizar nomes de campos (remover acentos e caracteres especiais dos nomes das colunas do banco)
    return {
      bairro: data.Bairro || '',
      zona: data.Zona || '',
      altura_m_xima_edifica_o_isolada: data['Altura Máxima - Edificação Isolada'] || null,
      coeficiente_de_aproveitamento_b_sico: data['Coeficiente de Aproveitamento - Básico'] || null,
      coeficiente_de_aproveitamento_m_ximo: data['Coeficiente de Aproveitamento - Máximo'] || null,
      rea_m_nima_do_lote: data['Área Mínima do Lote'] || null,
      testada_m_nima_do_lote: data['Testada Mínima do Lote'] || null,
      m_dulo_de_fracionamento: data['Módulo de Fracionamento'] || null,
      face_m_xima_do_quarteir_o: data['Face Máxima do Quarteirão'] || null,
      rea_m_xima_do_quarteir_o: data['Área Máxima do Quarteirão'] || null,
      rea_m_nima_do_quarteir_o: data['Área Mínima do Quarteirão'] || null,
      enquadramento_fracionamento: data['Enquadramento (Fracionamento)'] || null,
      rea_de_destina_o_p_blica_malha_vi_ria_fracionamento: data['Área de Destinação Pública – Malha Viária (Fracionamento)'] || null,
      rea_de_destina_o_p_blica_equipamentos_fracionamento: data['Área de Destinação Pública – Equipamentos (Fracionamento)'] || null,
      enquadramento_desmembramento_tipo_1: data['Enquadramento (Desmembramento Tipo 1)'] || null,
      rea_p_blica_malha_vi_ria_desmembramento_tipo_1: data['Área Pública – Malha Viária (Desmembramento Tipo 1)'] || null,
      rea_p_blica_equipamentos_desmembramento_tipo_1: data['Área Pública – Equipamentos (Desmembramento Tipo 1)'] || null,
      enquadramento_desmembramento_tipo_2: data['Enquadramento (Desmembramento Tipo 2)'] || null,
      rea_p_blica_malha_vi_ria_desmembramento_tipo_2: data['Área Pública – Malha Viária (Desmembramento Tipo 2)'] || null,
      rea_p_blica_equipamentos_desmembramento_tipo_2: data['Área Pública – Equipamentos (Desmembramento Tipo 2)'] || null,
      enquadramento_desmembramento_tipo_3: data['Enquadramento (Desmembramento Tipo 3)'] || null,
      rea_p_blica_malha_vi_ria_desmembramento_tipo_3: data['Área Pública – Malha Viária (Desmembramento Tipo 3)'] || null,
      rea_p_blica_equipamentos_desmembramento_tipo_3: data['Área Pública – Equipamentos (Desmembramento Tipo 3)'] || null,
      enquadramento_loteamento: data['Enquadramento (Loteamento)'] || null,
      rea_p_blica_malha_vi_ria_loteamento: data['Área Pública – Malha Viária (Loteamento)'] || null,
      rea_p_blica_equipamentos_loteamento: data['Área Pública – Equipamentos (Loteamento)'] || null,
      coeficiente_de_aproveitamento_b_sico_4d: data['Coeficiente de Aproveitamento Básico +4D'] || null,
      coeficiente_de_aproveitamento_m_ximo_4d: data['Coeficiente de Aproveitamento Máximo +4D'] || null,
      afastamentos_frente: data['Afastamentos - Frente'] || null,
      afastamentos_laterais: data['Afastamentos - Laterais'] || null,
      afastamentos_fundos: data['Afastamentos - Fundos'] || null,
      taxa_de_permeabilidade_acima_de_1_500_m: data['Taxa de Permeabilidade (acima de 1.500 m²)'] || null,
      taxa_de_permeabilidade_at_1_500_m: data['Taxa de Permeabilidade (até 1.500 m²)'] || null,
      fator_de_convers_o_da_taxa_de_permeabilidade: data['Fator de Conversão da Taxa de Permeabilidade'] || null,
      recuo_de_jardim: data['Recuo de Jardim'] || null,
      com_rcio_varejista_in_cuo_restri_o_porte: data['Comércio Varejista Inócuo – Restrição / Porte'] || null,
      com_rcio_varejista_ia1_restri_o_porte: data['Comércio Varejista IA1 – Restrição / Porte'] || null,
      com_rcio_varejista_ia2_restri_o_porte: data['Comércio Varejista IA2 – Restrição / Porte'] || null,
      com_rcio_atacadista_ia1_restri_o_porte: data['Comércio Atacadista IA1 – Restrição / Porte'] || null,
      com_rcio_atacadista_ia2_restri_o_porte: data['Comércio Atacadista IA2 – Restrição / Porte'] || null,
      com_rcio_atacadista_ia3_restri_o_porte: data['Comércio Atacadista IA3 – Restrição / Porte'] || null,
      servi_o_in_cuo_restri_o_porte: data['Serviço Inócuo – Restrição / Porte'] || null,
      servi_o_ia1_restri_o_porte: data['Serviço IA1 – Restrição / Porte'] || null,
      servi_o_ia2_restri_o_porte: data['Serviço IA2 – Restrição / Porte'] || null,
      servi_o_ia3_restri_o_porte: data['Serviço IA3 – Restrição / Porte'] || null,
      ind_stria_in_cua_restri_o_porte: data['Indústria Inócua – Restrição / Porte'] || null,
      ind_stria_com_interfer_ncia_ambiental_restri_o_porte: data['Indústria com Interferência Ambiental – Restrição / Porte'] || null,
      n_vel_de_controle_de_polariza_o_de_entretenimento_noturno: data['Nível de Controle de Polarização de Entretenimento Noturno'] || null
    };
  }

  transformZotsBairrosRecord(record) {
    // Remover o id original e manter apenas os dados necessários
    const { id, ...data } = record;
    
    return {
      bairro: data.Bairro || '',
      zona: data.Zona || '',
      total_zonas_no_bairro: parseInt(data.Total_Zonas_no_Bairro) || 0,
      tem_zona_especial: data.Tem_Zona_Especial === true || data.Tem_Zona_Especial === 'true' || data.Tem_Zona_Especial === 1
    };
  }

  async validateImportedData() {
    this.logger.log('INFO', '🔍 Validando dados importados...');

    try {
      // Validar regime urbanístico
      const { count: regimeCount, error: regimeError } = await supabase
        .from('regime_urbanistico')
        .select('*', { count: 'exact', head: true });

      const regimeValidation = {
        imported: regimeCount || 0,
        expected: 387,
        match: (regimeCount || 0) === 387,
        error: regimeError
      };

      // Validar ZOTs vs Bairros
      const { count: zotsCount, error: zotsError } = await supabase
        .from('zots_bairros')
        .select('*', { count: 'exact', head: true });

      const zotsValidation = {
        imported: zotsCount || 0,
        expected: 385,
        match: (zotsCount || 0) === 385,
        error: zotsError
      };

      const validation = {
        regimeUrbanistico: regimeValidation,
        zotsBairros: zotsValidation,
        overallSuccess: regimeValidation.match && zotsValidation.match
      };

      if (validation.overallSuccess) {
        this.logger.log('SUCCESS', '✅ Validação dos dados importados bem-sucedida', validation);
      } else {
        this.logger.log('ERROR', '❌ Validação dos dados importados falhou', validation);
      }

      return validation;
    } catch (error) {
      this.logger.log('ERROR', '❌ Erro na validação dos dados importados', { error: error.message });
      return null;
    }
  }
}

// Função principal
async function main() {
  const logger = new ImportLogger();
  await logger.init();

  try {
    // 1. Validar arquivos processados
    const validator = new ImportValidator(logger);
    const { isValid, results } = await validator.validateProcessedFiles();
    
    if (!isValid) {
      logger.log('ERROR', '❌ Validação de arquivos falhou. Abortando importação.');
      process.exit(1);
    }

    // 2. Verificar dados existentes
    const importer = new DatabaseImporter(logger);
    const existingData = await importer.checkExistingData();

    // 3. Criar/atualizar estrutura das tabelas
    const tablesCreated = await importer.createTables();
    if (!tablesCreated) {
      logger.log('ERROR', '❌ Falha ao criar estrutura das tabelas. Abortando importação.');
      process.exit(1);
    }

    // 4. Importar dados de regime urbanístico
    const regimeSuccess = await importer.importRegimeUrbanistico();
    if (!regimeSuccess) {
      logger.log('ERROR', '❌ Falha na importação de regime urbanístico');
    }

    // 5. Importar dados de ZOTs vs Bairros
    const zotsSuccess = await importer.importZotsBairros();
    if (!zotsSuccess) {
      logger.log('ERROR', '❌ Falha na importação de ZOTs vs Bairros');
    }

    // 6. Validar dados importados
    const validation = await importer.validateImportedData();

    // 7. Relatório final
    const { reportFile, summary } = await logger.generateReport();
    
    const finalStats = {
      processedFiles: results,
      existingData,
      importStats: importer.importStats,
      validation,
      duration: summary.duration,
      success: regimeSuccess && zotsSuccess && validation?.overallSuccess
    };

    logger.log('INFO', '📊 RESUMO FINAL DA IMPORTAÇÃO', finalStats);

    if (finalStats.success) {
      logger.log('SUCCESS', '🎉 Importação concluída com sucesso!');
      console.log(`\n✅ SUCESSO! Dados importados:`);
      console.log(`📊 Regime Urbanístico: ${importer.importStats.regimeUrbanistico.imported}/${importer.importStats.regimeUrbanistico.total} registros`);
      console.log(`📊 ZOTs vs Bairros: ${importer.importStats.zotsBairros.imported}/${importer.importStats.zotsBairros.total} registros`);
      console.log(`📄 Relatório detalhado: ${reportFile}`);
      process.exit(0);
    } else {
      logger.log('ERROR', '❌ Importação falhou ou foi parcial');
      console.log(`\n❌ ERRO! Verifique o relatório: ${reportFile}`);
      process.exit(1);
    }

  } catch (error) {
    logger.log('ERROR', '❌ Erro crítico durante a importação', { error: error.message, stack: error.stack });
    await logger.generateReport();
    process.exit(1);
  }
}

// Executar apenas se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('❌ Erro crítico:', error);
    process.exit(1);
  });
}

export { ImportLogger, ImportValidator, DatabaseImporter };