import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AutomationConfig {
  id: string;
  config_type: 'simulation' | 'monitoring';
  config_name: string;
  is_enabled: boolean;
  schedule_type: 'daily' | 'weekly' | 'monthly';
  schedule_time: string;
  schedule_days: number[];
  timezone: string;
  simulation_test_count?: number;
  simulation_randomize?: boolean;
  simulation_agent_id?: string;
  simulation_categories?: string[];
  monitoring_time_window_hours?: number;
  monitoring_min_severity?: string;
  email_notifications: boolean;
  notification_emails: string[];
  auto_generate_pdf: boolean;
  auto_send_weekly_report: boolean;
  next_run_at?: string;
  last_run_at?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('🔄 Iniciando verificação de automações de segurança...');

    // Buscar configurações ativas
    const { data: configs, error: fetchError } = await supabase
      .from('security_automation_configs')
      .select('*')
      .eq('is_enabled', true);

    if (fetchError) {
      console.error('❌ Erro ao buscar configurações:', fetchError);
      throw fetchError;
    }

    if (!configs || configs.length === 0) {
      console.log('ℹ️ Nenhuma automação ativa encontrada');
      return new Response(
        JSON.stringify({ message: 'Nenhuma automação ativa', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const now = new Date();
    const results = [];

    console.log(`📋 ${configs.length} automações ativas encontradas`);

    for (const config of configs as AutomationConfig[]) {
      console.log(`\n🔍 Verificando automação: ${config.config_name} (${config.config_type})`);

      // Verificar se deve executar agora
      if (!shouldRunNow(config, now)) {
        console.log(`⏭️ Pulando - não é hora de executar`);
        results.push({ config_id: config.id, status: 'skipped', reason: 'Not scheduled' });
        continue;
      }

      console.log(`✅ Executando automação agora...`);
      
      const startTime = Date.now();
      const logEntry = {
        config_id: config.id,
        execution_type: config.config_type,
        status: 'running',
        started_at: now.toISOString(),
      };

      // Registrar início da execução
      const { data: logData, error: logError } = await supabase
        .from('security_automation_logs')
        .insert(logEntry)
        .select()
        .single();

      if (logError) {
        console.error('❌ Erro ao criar log:', logError);
        continue;
      }

      try {
        let executionResult;

        if (config.config_type === 'simulation') {
          console.log('🎭 Executando simulação...');
          executionResult = await runSimulation(supabase, config);
          console.log('✅ Simulação concluída:', executionResult);
        } else if (config.config_type === 'monitoring') {
          console.log('👁️ Executando monitoramento...');
          executionResult = await runMonitoring(supabase, config);
          console.log('✅ Monitoramento concluído:', executionResult);
        }

        // Validar resultado
        if (!executionResult) {
          throw new Error('Execution returned no result');
        }

        const executionTime = Date.now() - startTime;

        // Atualizar log com sucesso
        await supabase
          .from('security_automation_logs')
          .update({
            status: 'success',
            completed_at: new Date().toISOString(),
            duration_seconds: Math.floor(executionTime / 1000),
            results: executionResult,
            alerts_created: executionResult?.alerts_created || 0,
            reports_generated: executionResult?.reports_generated || 0,
            notifications_sent: executionResult?.notifications_sent || 0,
          })
          .eq('id', logData.id);

        // Atualizar configuração
        const nextRun = calculateNextRun(config, now);
        await supabase
          .from('security_automation_configs')
          .update({
            last_run_at: now.toISOString(),
            last_run_status: 'success',
            next_run_at: nextRun.toISOString(),
          })
          .eq('id', config.id);

        // Enviar notificação se configurado
        if (config.email_notifications && config.notification_emails.length > 0) {
          await sendNotification(supabase, config, executionResult, 'success');
        }

        console.log(`✅ Automação concluída com sucesso em ${executionTime}ms`);
        results.push({ config_id: config.id, status: 'success', execution_time: executionTime });

      } catch (error) {
        const executionTime = Date.now() - startTime;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        console.error(`❌ Erro na execução:`, errorMessage);

        // Atualizar log com falha
        await supabase
          .from('security_automation_logs')
          .update({
            status: 'failed',
            completed_at: new Date().toISOString(),
            duration_seconds: Math.floor(executionTime / 1000),
            error_message: errorMessage,
          })
          .eq('id', logData.id);

        // Atualizar configuração
        await supabase
          .from('security_automation_configs')
          .update({
            last_run_at: now.toISOString(),
            last_run_status: 'failed',
          })
          .eq('id', config.id);

        results.push({ config_id: config.id, status: 'failed', error: errorMessage });
      }
    }

    console.log(`\n✅ Processamento completo: ${results.length} automações processadas`);

    // 📊 Verificar se deve enviar relatório semanal (toda segunda-feira às 9h)
    const currentDay = now.getDay(); // 0 = Domingo, 1 = Segunda
    const currentHour = now.getHours();
    
    // Enviar relatório semanal às segundas-feiras, entre 9h e 10h
    if (currentDay === 1 && currentHour === 9) {
      console.log('\n📊 Enviando relatório semanal automatizado...');
      try {
        await sendWeeklyReport(supabase);
        console.log('✅ Relatório semanal enviado com sucesso');
      } catch (weeklyError) {
        console.error('❌ Erro ao enviar relatório semanal:', weeklyError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: results.length,
        results 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erro fatal no scheduler:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function shouldRunNow(config: AutomationConfig, now: Date): boolean {
  // Se next_run_at está definido e é no futuro, não executar
  if (config.next_run_at) {
    const nextRun = new Date(config.next_run_at);
    if (nextRun > now) {
      return false;
    }
  }

  // Converter 'now' para o timezone configurado
  const timezone = config.timezone || 'America/Sao_Paulo';
  const nowInTimezone = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
  
  const currentHour = nowInTimezone.getHours();
  const currentMinute = nowInTimezone.getMinutes();
  const currentDay = nowInTimezone.getDay(); // 0 = Domingo
  const currentDate = nowInTimezone.getDate();

  // Parse schedule_time (formato: "HH:MM:SS" ou "HH:MM")
  const [scheduleHour, scheduleMinute] = config.schedule_time.split(':').map(Number);

  // Verificar se está na hora certa (com margem de 5 minutos)
  const isCorrectTime = currentHour === scheduleHour && Math.abs(currentMinute - scheduleMinute) < 5;

  if (!isCorrectTime) {
    return false;
  }

  // Verificar dia
  if (config.schedule_type === 'daily') {
    return true;
  } else if (config.schedule_type === 'weekly') {
    return config.schedule_days.includes(currentDay);
  } else if (config.schedule_type === 'monthly') {
    return config.schedule_days.includes(currentDate);
  }

  return false;
}

function calculateNextRun(config: AutomationConfig, now: Date): Date {
  const timezone = config.timezone || 'America/Sao_Paulo';
  
  // Converter now para timezone local
  const nowInTimezone = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
  
  const [scheduleHour, scheduleMinute] = config.schedule_time.split(':').map(Number);
  
  let nextRun = new Date(nowInTimezone);
  nextRun.setHours(scheduleHour, scheduleMinute, 0, 0);
  
  // Se já passou a hora hoje, calcular próxima execução
  if (nextRun <= nowInTimezone) {
    if (config.schedule_type === 'daily') {
      nextRun.setDate(nextRun.getDate() + 1);
    } else if (config.schedule_type === 'weekly') {
      nextRun.setDate(nextRun.getDate() + 7);
    } else if (config.schedule_type === 'monthly') {
      nextRun.setMonth(nextRun.getMonth() + 1);
    }
  }
  
  // Converter de volta para UTC (subtrair offset do timezone)
  // America/Sao_Paulo é UTC-3, então adicionar 3 horas
  const offsetMinutes = nextRun.getTimezoneOffset();
  const utcNextRun = new Date(nextRun.getTime() - (offsetMinutes * 60000));
  
  return utcNextRun;
}

async function runSimulation(supabase: any, config: AutomationConfig) {
  console.log('🎯 Executando simulação de ciberataque...');

  const { data, error } = await supabase.functions.invoke('security-validator', {
    body: {
      testNumbers: config.simulation_test_count 
        ? Array.from({ length: config.simulation_test_count }, (_, i) => i + 1)
        : undefined,
      agentId: config.simulation_agent_id,
      systemVersion: 'v1.0',
      automatedRun: true,
      configId: config.id,
    },
  });

  if (error) throw error;

  return {
    run_id: data.runId,
    total_tests: config.simulation_test_count || 0,
    alerts_created: 0,
    reports_generated: 1,
    notifications_sent: 0,
  };
}

async function runMonitoring(supabase: any, config: AutomationConfig) {
  const hoursAgo = config.monitoring_time_window_hours || 24;
  const minSeverity = config.monitoring_min_severity || 'medium';

  console.log('👁️ Executando monitoramento de ciberataque...');
  console.log(`📊 Parâmetros: ${hoursAgo}h atrás, severidade mínima: ${minSeverity}`);

  try {
    const { data, error } = await supabase.functions.invoke('process-historical-threats', {
      body: {
        hoursAgo,
        minSeverity,
        automatedRun: true,
        configId: config.id,
      },
    });

    if (error) {
      console.error('❌ Erro ao invocar process-historical-threats:', error);
      throw new Error(`Failed to invoke function: ${error.message || JSON.stringify(error)}`);
    }

    // Validar resposta
    if (!data) {
      console.warn('⚠️ Nenhum dado retornado por process-historical-threats');
      return {
        alerts_created: 0,
        reports_generated: 0,
        notifications_sent: 0,
        time_window: hoursAgo,
      };
    }

    // Verificar se a função retornou erro
    if (data.success === false) {
      console.error('❌ Função retornou erro:', data);
      throw new Error(`process-historical-threats failed: ${data.error || 'Unknown error'}`);
    }

    console.log('✅ Monitoramento executado com sucesso');
    console.log('📊 Estatísticas completas:', data.stats);

    // A função retorna { success, message, stats: { alerts_created, reports_generated, ... }, alerts, reports }
    return {
      alerts_created: data.stats?.alerts_created || 0,
      reports_generated: data.stats?.reports_generated || 0,
      notifications_sent: data.stats?.alerts_created || 0,  // Assumir notificação por alerta
      time_window: hoursAgo,
      total_scanned: data.stats?.total_scanned || 0,
    };
  } catch (error) {
    console.error('❌ Exception em runMonitoring:', error);
    throw error;
  }
}

async function sendNotification(
  supabase: any, 
  config: AutomationConfig, 
  result: any,
  status: 'success' | 'failed'
) {
  console.log('📧 Enviando notificação por email...');

  const notificationType = config.config_type === 'simulation' 
    ? 'simulation' 
    : 'incident';

  try {
    await supabase.functions.invoke('send-security-notification', {
      body: {
        notification_type: notificationType,
        run_id: result.run_id,
        data: {
          config_name: config.config_name,
          config_type: config.config_type,
          status,
          result,
          executed_at: new Date().toISOString(),
        },
      },
    });

    console.log('✅ Notificação enviada com sucesso');
  } catch (error) {
    console.error('❌ Erro ao enviar notificação:', error);
    // Não lança erro para não falhar a automação inteira
  }
}

// ✅ Enviar relatório semanal automatizado
async function sendWeeklyReport(supabase: any) {
  console.log('📊 Enviando relatório semanal...');
  
  try {
    await supabase.functions.invoke('send-security-notification', {
      body: {
        notification_type: 'weekly_report',
        data: {
          week: new Date().toISOString(),
        },
      },
    });
    
    console.log('✅ Relatório semanal enviado');
  } catch (error) {
    console.error('❌ Erro ao enviar relatório semanal:', error);
  }
}
