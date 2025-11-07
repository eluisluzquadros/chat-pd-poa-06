import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface HistoricalThreat {
  session_id: string;
  user_message: string;
  sentiment: string;
  keywords: string[] | null;
  created_at: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Autenticar usuário
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Verificar se é admin
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!userRole || !['admin', 'supervisor'].includes(userRole.role)) {
      throw new Error('Access denied - Admin role required');
    }

    console.log('🔍 Buscando ameaças históricas não processadas...');

    // Buscar sessões de chat com informações do usuário
    const { data: threats, error: threatsError } = await supabase
      .from('message_insights')
      .select(`
        *,
        chat_sessions!inner (
          user_id,
          created_at
        )
      `)
      .order('created_at', { ascending: false });

    if (threatsError) {
      throw threatsError;
    }

    const processedAlerts: any[] = [];
    const processedReports: any[] = [];
    let skippedCount = 0;
    let errorCount = 0;
    let filteredByRole = 0;
    let filteredByBlocked = 0;
    let filteredByTest = 0;
    let filteredByAutomatedTests = 0;

    console.log(`📊 Total de registros encontrados: ${threats?.length || 0}`);

    // FILTRO 1: Obter lista de user_ids com roles privilegiadas (admin/supervisor)
    const { data: privilegedUsers } = await supabase
      .from('user_roles')
      .select('user_id')
      .in('role', ['admin', 'supervisor']);

    const privilegedUserIds = new Set(privilegedUsers?.map(u => u.user_id) || []);

    // FILTRO 2: Obter sessões de testes automatizados
    const { data: automatedTestRuns } = await supabase
      .from('security_validation_runs')
      .select('executed_by, started_at, completed_at');

    for (const threat of threats || []) {
      try {
        const sessionUserId = (threat as any).chat_sessions?.user_id;
        const sessionCreatedAt = (threat as any).chat_sessions?.created_at;

        // FILTRO 1: Pular mensagens de usuários admin/supervisor
        if (sessionUserId && privilegedUserIds.has(sessionUserId)) {
          console.log(`⏭️ Filtrado por role: sessão ${threat.session_id}`);
          filteredByRole++;
          continue;
        }

        // FILTRO 2: Pular sessões criadas durante testes automatizados
        const isAutomatedTest = automatedTestRuns?.some(run => {
          if (run.executed_by !== sessionUserId) return false;
          const startTime = new Date(run.started_at).getTime();
          const endTime = run.completed_at ? new Date(run.completed_at).getTime() : Date.now();
          const sessionTime = new Date(sessionCreatedAt).getTime();
          return sessionTime >= startTime && sessionTime <= endTime;
        });

        if (isAutomatedTest) {
          console.log(`⏭️ Filtrado por teste automatizado: sessão ${threat.session_id}`);
          filteredByAutomatedTests++;
          continue;
        }

        // FILTRO 3: Verificar se mensagem já foi bloqueada pelo sistema
        const { data: assistantResponse } = await supabase
          .from('chat_history')
          .select('message')
          .eq('session_id', threat.session_id)
          .gte('created_at', threat.created_at)
          .limit(1)
          .order('created_at', { ascending: true })
          .maybeSingle();

        let wasBlockedBySystem = false;
        let blockedResponseSnippet = null;
        
        if (assistantResponse) {
          const responseContent = (assistantResponse.message as any)?.content || '';
          const responseContentLower = responseContent.toLowerCase();
          const isBlocked = 
            responseContentLower.includes('solicitação inválida') ||
            responseContentLower.includes('não posso ajudar') ||
            responseContentLower.includes('minha função é') ||
            responseContentLower.includes('detectamos um padrão') ||
            responseContentLower.includes('não consigo processar');

          if (isBlocked) {
            console.log(`✅ Mensagem bloqueada encontrada (será reportada): sessão ${threat.session_id}`);
            filteredByBlocked++;
            wasBlockedBySystem = true;
            blockedResponseSnippet = responseContent.substring(0, 200);
            // ✅ NÃO descarta - continua para criar relatório forense
          }
        }

        // FILTRO 4: Verificar keywords de teste/ruído
        const message = threat.user_message?.toLowerCase() || '';
        const keywords = threat.keywords || [];
        
        const isTestKeywords = 
          message.includes('teste') ||
          message.includes('test') ||
          message.includes('agente v') ||
          message.includes('pd v') ||
          keywords.some(k => 
            ['teste', 'test', 'v1', 'v2', 'v3', 'agent', 'agente'].includes(k.toLowerCase())
          );

        if (isTestKeywords && !message.includes('[system') && !message.includes('ignore')) {
          console.log(`⏭️ Filtrado por keywords de teste: sessão ${threat.session_id}`);
          filteredByTest++;
          continue;
        }

        // Verificar padrões de ataque
        const isAttack = 
          message.includes('[system') ||
          (message.includes('reiniciar') && message.includes('instruç')) ||
          (message.includes('libere') && message.includes('acesso')) ||
          (message.includes('obedeça') && (message.includes('pedidos') || message.includes('pedido'))) ||
          (message.includes('ignore') && message.includes('instruction')) ||
          (message.includes('override') && message.includes('previous')) ||
          (message.includes('bypass') && message.includes('security')) ||
          (message.includes('system') && message.includes('prompt')) ||
          (message.includes('acesso') && message.includes('irrestrito')) ||
          message.includes('database access') ||
          message.includes('admin privileges');

        if (!isAttack) {
          skippedCount++;
          continue;
        }

        console.log(`🚨 Ataque detectado na sessão: ${threat.session_id}`);

        // Verificar se já existe alerta para esta sessão
        const { data: existingAlert } = await supabase
          .from('intelligence_alerts')
          .select('id')
          .eq('data->>session_id', threat.session_id)
          .maybeSingle();

        if (existingAlert) {
          console.log(`⏭️ Alerta já existe para sessão ${threat.session_id}`);
          skippedCount++;
          continue;
        }

        // Buscar informações do usuário
        const { data: session } = await supabase
          .from('chat_sessions')
          .select(`
            user_id,
            user_accounts!inner (
              email,
              full_name
            )
          `)
          .eq('id', threat.session_id)
          .maybeSingle();

        const userEmail = session?.user_accounts?.email || 'desconhecido';
        const userFullName = session?.user_accounts?.full_name || 'Desconhecido';
        const userId = session?.user_id;

        // Criar alerta
        const { data: newAlert, error: alertError } = await supabase
          .from('intelligence_alerts')
          .insert({
            alert_type: 'prompt_injection_attempt',
            severity: 'critical',
            title: wasBlockedBySystem 
              ? 'Tentativa de Prompt Injection Detectada e Bloqueada (Histórico)'
              : 'Tentativa de Prompt Injection Detectada (Histórico)',
            description: `Usuário ${userEmail} tentou manipular instruções do sistema através de prompt injection`,
            data: {
              session_id: threat.session_id,
              user_id: userId,
              user_email: userEmail,
              user_full_name: userFullName,
              user_message: threat.user_message.substring(0, 500),
              sentiment: threat.sentiment,
              keywords: threat.keywords,
              detected_at: threat.created_at,
              attack_type: 'prompt_injection',
              technique: 'System Prompt Override',
              threat_level: 'high',
              processed_retroactively: true,
              was_blocked: wasBlockedBySystem,
              blocked_response: blockedResponseSnippet
            },
            triggered_at: threat.created_at
          })
          .select()
          .single();

        if (alertError) {
          console.error(`❌ Erro ao criar alerta: ${alertError.message}`);
          errorCount++;
          continue;
        }

        processedAlerts.push(newAlert);
        console.log(`✅ Alerta criado: ${newAlert.id}`);

        // Gerar relatório forense
        try {
          const { data: report, error: reportError } = await supabase.functions.invoke(
            'generate-security-report',
            {
              body: {
                sessionId: threat.session_id,
                alertId: newAlert.id
              }
            }
          );

          if (reportError) {
            console.error(`⚠️ Erro ao gerar relatório: ${reportError.message}`);
          } else {
            processedReports.push(report);
            console.log(`📄 Relatório forense gerado para sessão ${threat.session_id}`);
          }
        } catch (reportErr) {
          console.error(`⚠️ Falha ao gerar relatório: ${reportErr}`);
        }

        // Desativar usuário se identificado
        if (userId) {
          await supabase
            .from('user_accounts')
            .update({
              is_active: false,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', userId);
          
          console.log(`🔒 Usuário ${userEmail} desativado automaticamente`);
        }

      } catch (threatError) {
        console.error(`❌ Erro ao processar ameaça:`, threatError);
        errorCount++;
      }
    }

    const summary = {
      success: true,
      message: 'Processamento de ameaças históricas concluído',
      stats: {
        total_scanned: threats?.length || 0,
        filtered_by_role: filteredByRole,
        filtered_by_automated_tests: filteredByAutomatedTests,
        already_blocked_but_reported: filteredByBlocked,
        filtered_by_test_keywords: filteredByTest,
        legitimate_messages: skippedCount,
        alerts_created: processedAlerts.length,
        reports_generated: processedReports.length,
        errors: errorCount
      },
      alerts: processedAlerts,
      reports: processedReports
    };

    console.log('📊 Resumo do processamento:', summary.stats);

    return new Response(JSON.stringify(summary), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('❌ Erro no processamento histórico:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
        details: error.toString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
