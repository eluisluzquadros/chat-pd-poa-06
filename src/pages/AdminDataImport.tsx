import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { Upload, CheckCircle2, AlertCircle } from 'lucide-react';
import Papa from 'papaparse';

interface ImportStats {
  total: number;
  processed: number;
  new: number;
  updated: number;
  unchanged: number;
  errors: number;
}

function AdminDataImport() {
  const [importing, setImporting] = useState(false);
  const [stats, setStats] = useState<ImportStats>({
    total: 0,
    processed: 0,
    new: 0,
    updated: 0,
    unchanged: 0,
    errors: 0
  });
  const [logs, setLogs] = useState<string[]>([]);
  const [completed, setCompleted] = useState(false);

  // Valid database columns for validation
  const VALID_DB_COLUMNS = new Set([
    'Zona', 'Bairro', 'Categoria_Risco', 'Área_Minima_do_Lote',
    'Testada_Minima', 'Taxa_de_Ocupacao_ate_1,500_m2',
    'Taxa_de_Ocupacao_acima_de_1,500_m2', 'Altura_Maxima___Edificacao_Isolada',
    'Altura_Maxima___Edificacao_Geminada', 'Coeficiente_de_Aproveitamento___Basico',
    'Coeficiente_de_Aproveitamento___Maximo', 'Taxa_de_Permeabilidade_ate_1,500_m2',
    'Taxa_de_Permeabilidade_acima_de_1,500_m2', 'Recuos_de_Frente',
    'Recuos_de_Frente___Observacoes', 'Recuos_de_Fundos', 'Recuos_de_Fundos___Observacoes',
    'Subsolo', 'Subsolo___Observacoes', 'Afastamentos___Frente', 'Afastamentos___Fundos',
    'Afastamentos___Laterais', 'Comercio_Atacadista', 'Comercio_Atacadista___IA1',
    'Comercio_Atacadista___IA2', 'Comercio_Atacadista___IA3', 'Comercio_Varejista',
    'Comercio_Varejista___IA1', 'Comercio_Varejista___IA2', 'Comercio_Varejista___IA3',
    'Servicos___Inocuo', 'Servicos___IA1', 'Servicos___IA2', 'Servicos___IA3',
    'Industria___Inocua', 'Industria___IA1', 'Industria___IA2', 'Industria___IA3',
    'Enquadramento___Loteamento', 'Enquadramento___Fracionamento', 'Enquadramento___Desmembramento',
    'Area_Publica___Sistema_Viario', 'Area_Publica___Pracas', 'Area_Publica___Equipamentos_Comunitarios',
    'Taxa_de_Ocupacao___Lote_menor_que_360m2', 'Taxa_de_Ocupacao___Lote_de_360m2_a_1500m2',
    'Taxa_de_Ocupacao___Lote_maior_que_1500m2'
  ]);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const normalizeValue = (value: any) => {
    if (value === null || value === undefined || value === '') return null;
    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed === '' ? null : trimmed;
    }
    return value;
  };

  // Map CSV column names to database column names
  const mapColumnName = (csvColumn: string): string => {
    const columnMap: Record<string, string> = {
      'zona': 'Zona',
      'bairro': 'Bairro',
      'categoria_risco': 'Categoria_Risco',
      'área mínima do lote': 'Área_Minima_do_Lote',
      'testada mínima': 'Testada_Minima',
      'taxa de ocupação até 1.500 m²': 'Taxa_de_Ocupacao_ate_1,500_m2',
      'taxa de ocupação acima de 1.500 m²': 'Taxa_de_Ocupacao_acima_de_1,500_m2',
      'taxa de permeabilidade até 1.500 m²': 'Taxa_de_Permeabilidade_ate_1,500_m2',
      'taxa de permeabilidade acima de 1.500 m²': 'Taxa_de_Permeabilidade_acima_de_1,500_m2',
      'coeficiente de aproveitamento - básico': 'Coeficiente_de_Aproveitamento___Basico',
      'coeficiente de aproveitamento - máximo': 'Coeficiente_de_Aproveitamento___Maximo',
      'altura máxima - edificação isolada': 'Altura_Maxima___Edificacao_Isolada',
      'altura máxima - edificação contínua': 'Altura_Maxima___Edificacao_Continua',
      'recuos de frente': 'Recuos_de_Frente',
      'recuos de frente - observações': 'Recuos_de_Frente___Observacoes',
      'recuos laterais': 'Recuos_Laterais',
      'recuos laterais - observações': 'Recuos_Laterais___Observacoes',
      'recuos de fundos': 'Recuos_de_Fundos',
      'recuos de fundos - observações': 'Recuos_de_Fundos___Observacoes',
      'subsolo': 'Subsolo',
      'subsolo - observações': 'Subsolo___Observacoes',
      'afastamentos - frente': 'Afastamentos___Frente',
      'afastamentos - fundos': 'Afastamentos___Fundos',
      'afastamentos - laterais': 'Afastamentos___Laterais',
      'comércio atacadista': 'Comercio_Atacadista',
      'comércio atacadista - ia1': 'Comercio_Atacadista___IA1',
      'comércio atacadista - ia2': 'Comercio_Atacadista___IA2',
      'comércio atacadista - ia3': 'Comercio_Atacadista___IA3',
      'comércio varejista': 'Comercio_Varejista',
      'comércio varejista - ia1': 'Comercio_Varejista___IA1',
      'comércio varejista - ia2': 'Comercio_Varejista___IA2',
      'comércio varejista - ia3': 'Comercio_Varejista___IA3',
      'serviços - inócuo': 'Servicos___Inocuo',
      'serviços - ia1': 'Servicos___IA1',
      'serviços - ia2': 'Servicos___IA2',
      'serviços - ia3': 'Servicos___IA3',
      'indústria - inócua': 'Industria___Inocua',
      'indústria - ia1': 'Industria___IA1',
      'indústria - ia2': 'Industria___IA2',
      'indústria - ia3': 'Industria___IA3',
      'enquadramento - loteamento': 'Enquadramento___Loteamento',
      'enquadramento - fracionamento': 'Enquadramento___Fracionamento',
      'enquadramento - desmembramento': 'Enquadramento___Desmembramento',
      'área pública - sistema viário': 'Area_Publica___Sistema_Viario',
      'área pública - praças': 'Area_Publica___Pracas',
      'área pública - equipamentos comunitários': 'Area_Publica___Equipamentos_Comunitarios',
      'taxa de ocupação - lote menor que 360m²': 'Taxa_de_Ocupacao___Lote_menor_que_360m2',
      'taxa de ocupação - lote de 360m² a 1500m²': 'Taxa_de_Ocupacao___Lote_de_360m2_a_1500m2',
      'taxa de ocupação - lote maior que 1500m²': 'Taxa_de_Ocupacao___Lote_maior_que_1500m2'
    };
    
    const normalized = csvColumn.toLowerCase().trim();
    const mapped = columnMap[normalized];
    
    // If column is not in the map, return original (will be filtered later)
    return mapped || csvColumn;
  };

  const recordsAreEqual = (record1: any, record2: any) => {
    const keys = Object.keys(record1).filter(key => 
      key !== 'created_at' && key !== 'updated_at'
    );
    
    for (const key of keys) {
      const val1 = normalizeValue(record1[key]);
      const val2 = normalizeValue(record2[key]);
      
      if (val1 !== val2) {
        return false;
      }
    }
    
    return true;
  };

  const handleImport = async () => {
    setImporting(true);
    setCompleted(false);
    setLogs([]);
    setStats({
      total: 0,
      processed: 0,
      new: 0,
      updated: 0,
      unchanged: 0,
      errors: 0
    });

    try {
      addLog('🚀 Iniciando importação dos dados...');

      // Fetch CSV from repository
      addLog('📖 Carregando arquivo CSV...');
      const csvResponse = await fetch('/data/regime-urbanistico-2025.csv');
      const csvText = await csvResponse.text();

      // Parse CSV
      const parseResult = Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        delimiter: ',',
        encoding: 'UTF-8',
        dynamicTyping: false
      });

      if (parseResult.errors.length > 0) {
        throw new Error(`Erro ao fazer parse do CSV: ${parseResult.errors[0].message}`);
      }

      const records = parseResult.data;

      addLog(`✅ CSV carregado: ${records.length} registros encontrados`);
      setStats(prev => ({ ...prev, total: records.length }));

      // Get current data
      addLog('📊 Buscando dados atuais do banco...');
      const { data: currentData, error: fetchError } = await supabase
        .from('regime_urbanistico_consolidado')
        .select('*');

      if (fetchError) {
        throw new Error(`Erro ao buscar dados atuais: ${fetchError.message}`);
      }

      addLog(`✅ ${currentData?.length || 0} registros encontrados no banco`);

      // Process each record
      addLog('📝 Processando registros...');
      
      for (let i = 0; i < records.length; i++) {
        const record = records[i];
        
        // Map CSV columns to database columns and normalize values
        const normalizedRecord: any = {};
        for (const [csvKey, value] of Object.entries(record)) {
          const dbKey = mapColumnName(csvKey);
          // Only include columns that exist in the database schema
          if (VALID_DB_COLUMNS.has(dbKey)) {
            normalizedRecord[dbKey] = normalizeValue(value);
          }
        }

        // Check if record exists (CSV columns are lowercase)
        const existing = currentData?.find(
          (r: any) => 
            normalizeValue(r.Bairro) === normalizeValue(record.bairro) && 
            normalizeValue(r.Zona) === normalizeValue(record.zona)
        );

        try {
          if (existing) {
            // Check if data actually changed
            if (recordsAreEqual(existing, normalizedRecord)) {
              setStats(prev => ({ 
                ...prev, 
                unchanged: prev.unchanged + 1,
                processed: prev.processed + 1
              }));
            } else {
              // Update existing record (CSV columns are lowercase)
              const { error } = await supabase
                .from('regime_urbanistico_consolidado')
                .update(normalizedRecord)
                .eq('Bairro', normalizedRecord.Bairro)
                .eq('Zona', normalizedRecord.Zona);

              if (error) throw error;
              
              setStats(prev => ({ 
                ...prev, 
                updated: prev.updated + 1,
                processed: prev.processed + 1
              }));
            }
          } else {
            // Insert new record
            const { error } = await supabase
              .from('regime_urbanistico_consolidado')
              .insert(normalizedRecord);

            if (error) throw error;
            
            setStats(prev => ({ 
              ...prev, 
              new: prev.new + 1,
              processed: prev.processed + 1
            }));
          }
        } catch (error: any) {
          addLog(`❌ Erro em ${record.bairro || 'N/A'} - ${record.zona || 'N/A'}: ${error.message}`);
          setStats(prev => ({ 
            ...prev, 
            errors: prev.errors + 1,
            processed: prev.processed + 1
          }));
        }

        // Progress update every 10 records
        if ((i + 1) % 10 === 0) {
          addLog(`Progresso: ${i + 1}/${records.length} registros processados`);
        }
      }

      // Verify final count
      const { count } = await supabase
        .from('regime_urbanistico_consolidado')
        .select('*', { count: 'exact', head: true });

      addLog(`✅ Contagem final no banco: ${count} registros`);
      addLog('🎉 Importação concluída com sucesso!');
      
      setCompleted(true);
    } catch (error: any) {
      addLog(`❌ Erro fatal: ${error.message}`);
    } finally {
      setImporting(false);
    }
  };

  const progress = stats.total > 0 ? (stats.processed / stats.total) * 100 : 0;

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-6 w-6" />
            Importação de Dados - Regime Urbanístico 2025
          </CardTitle>
          <CardDescription>
            Atualização dos dados do regime urbanístico consolidado
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{stats.total}</div>
                <p className="text-sm text-muted-foreground">Total no CSV</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-green-600">{stats.new}</div>
                <p className="text-sm text-muted-foreground">Novos</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-blue-600">{stats.updated}</div>
                <p className="text-sm text-muted-foreground">Atualizados</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-gray-600">{stats.unchanged}</div>
                <p className="text-sm text-muted-foreground">Inalterados</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-red-600">{stats.errors}</div>
                <p className="text-sm text-muted-foreground">Erros</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{stats.processed}</div>
                <p className="text-sm text-muted-foreground">Processados</p>
              </CardContent>
            </Card>
          </div>

          {/* Progress */}
          {importing && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progresso</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}

          {/* Import Button */}
          <Button 
            onClick={handleImport} 
            disabled={importing || completed}
            className="w-full"
            size="lg"
          >
            {importing ? 'Importando...' : completed ? 'Importação Concluída' : 'Iniciar Importação'}
          </Button>

          {/* Status Alerts */}
          {completed && stats.errors === 0 && (
            <Alert className="border-green-500 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Importação concluída com sucesso! {stats.new} novos registros, {stats.updated} atualizados, {stats.unchanged} inalterados.
              </AlertDescription>
            </Alert>
          )}

          {completed && stats.errors > 0 && (
            <Alert className="border-yellow-500 bg-yellow-50">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800">
                Importação concluída com {stats.errors} erro(s). Verifique os logs abaixo.
              </AlertDescription>
            </Alert>
          )}

          {/* Logs */}
          {logs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Logs de Execução</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-900 text-gray-100 p-4 rounded-lg h-64 overflow-y-auto font-mono text-xs">
                  {logs.map((log, index) => (
                    <div key={index} className="mb-1">
                      {log}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default AdminDataImport;
