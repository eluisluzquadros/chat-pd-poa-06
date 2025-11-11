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

interface DeviceInfo {
  device_type: string;
  browser: string;
  os: string;
}

// Função para parsear user agent e extrair informações do dispositivo
function parseDeviceInfo(userAgent: string | null): DeviceInfo {
  if (!userAgent) {
    return { device_type: 'unknown', browser: 'unknown', os: 'unknown' };
  }

  const ua = userAgent.toLowerCase();
  
  // Detectar tipo de dispositivo
  let device_type = 'desktop';
  if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
    device_type = 'mobile';
  } else if (ua.includes('tablet') || ua.includes('ipad')) {
    device_type = 'tablet';
  }

  // Detectar navegador
  let browser = 'unknown';
  if (ua.includes('edg')) browser = 'Edge';
  else if (ua.includes('chrome') && !ua.includes('edg')) browser = 'Chrome';
  else if (ua.includes('safari') && !ua.includes('chrome')) browser = 'Safari';
  else if (ua.includes('firefox')) browser = 'Firefox';
  else if (ua.includes('opera') || ua.includes('opr')) browser = 'Opera';

  // Detectar OS
  let os = 'unknown';
  if (ua.includes('windows')) os = 'Windows';
  else if (ua.includes('mac os') || ua.includes('macos')) os = 'macOS';
  else if (ua.includes('linux') && !ua.includes('android')) os = 'Linux';
  else if (ua.includes('android')) os = 'Android';
  else if (ua.includes('ios') || ua.includes('iphone') || ua.includes('ipad')) os = 'iOS';

  return { device_type, browser, os };
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

        // ✅ Buscar sessão primeiro
        const { data: session } = await supabase
          .from('chat_sessions')
          .select('user_id, created_at')
          .eq('id', threat.session_id)
          .maybeSingle();

        if (!session?.user_id) {
          console.log(`⚠️ Sessão sem user_id: ${threat.session_id}`);
          errorCount++;
          continue;
        }

        // ✅ Buscar dados completos do usuário
        const { data: userAccount } = await supabase
          .from('user_accounts')
          .select('email, full_name, is_active, created_at')
          .eq('user_id', session.user_id)
          .maybeSingle();

        // ✅ Buscar role do usuário
        const { data: userRole } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user_id)
          .maybeSingle();

        // ✅ Buscar IP address e user_agent mais recente
        const { data: lastAuthAttempt } = await supabase
          .from('auth_attempts')
          .select('ip_address, user_agent, created_at')
          .eq('email', userAccount?.email || '')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        const userEmail = userAccount?.email || 'desconhecido';
        const userFullName = userAccount?.full_name || 'Desconhecido';
        const userIp = lastAuthAttempt?.ip_address?.toString() || 'Unknown';
        const userRoleStr = userRole?.role || 'user';
        const userId = session.user_id;
        
        // ✅ Parsear informações do dispositivo
        const deviceInfo = parseDeviceInfo(lastAuthAttempt?.user_agent || null);
        
        console.log(`📱 Device Info: ${deviceInfo.device_type} | ${deviceInfo.browser} | ${deviceInfo.os}`);

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
              user_role: userRoleStr,
              ip_address: userIp,
              device_type: deviceInfo.device_type,
              browser: deviceInfo.browser,
              os: deviceInfo.os,
              user_agent: lastAuthAttempt?.user_agent || 'unknown',
              is_active: userAccount?.is_active ?? true,
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
          console.error(`❌ Erro ao criar alerta:`, {
            message: alertError.message,
            code: alertError.code,
            details: alertError.details,
            hint: alertError.hint,
            session_id: threat.session_id,
            user_email: userEmail,
            user_id: userId
          });
          errorCount++;
          continue;
        }

        if (newAlert) {
          processedAlerts.push(newAlert);
          console.log(`✅ Alerta criado: ${newAlert.id}`);
          
          // ✅ Gerar relatório forense DIRETAMENTE (sem chamar outra edge function)
          try {
            console.log(`📝 Gerando relatório forense para sessão ${threat.session_id}...`);
            
            // Buscar todas as sessões e mensagens do usuário
            const { data: allUserSessions } = await supabase
              .from('chat_sessions')
              .select('id, title, created_at, model')
              .eq('user_id', userId)
              .order('created_at', { ascending: true });

            const sessionIds = allUserSessions?.map(s => s.id) || [threat.session_id];
            const { data: allMessages } = await supabase
              .from('chat_history')
              .select('*')
              .in('session_id', sessionIds)
              .order('created_at', { ascending: true });

            // Buscar insights e alertas
            const { data: insights } = await supabase
              .from('message_insights')
              .select('*')
              .eq('session_id', threat.session_id)
              .order('created_at', { ascending: true });

            const { data: relatedAlerts } = await supabase
              .from('intelligence_alerts')
              .select('*')
              .contains('data', { session_id: threat.session_id })
              .order('triggered_at', { ascending: false });

            // Calcular threat level
            const maliciousMessage = allMessages?.find(m => 
              m.message?.content?.toLowerCase().includes('[system') ||
              m.message?.content?.toLowerCase().includes('reiniciar') ||
              m.message?.content?.toLowerCase().includes('ignore')
            );

            const threatIndicators = {
              hasPromptInjection: !!maliciousMessage,
              hasNegativeSentiment: insights?.some(i => i.sentiment === 'negative') || false,
              hasMultipleFailedAuth: false,
              isAccountDeactivated: !userAccount?.is_active,
            };

            const threatScore = Object.values(threatIndicators).filter(Boolean).length;
            const threatLevel = threatScore >= 3 ? 'critical' : threatScore >= 2 ? 'high' : 'medium';

            // Gerar report_id único
            const timestamp = new Date();
            const reportId = `RPT-${timestamp.getFullYear()}${String(timestamp.getMonth() + 1).padStart(2, '0')}${String(timestamp.getDate()).padStart(2, '0')}-${crypto.randomUUID().slice(0, 5).toUpperCase()}`;

            // Agrupar mensagens por sessão
            const conversationsBySession = allUserSessions?.map(sess => ({
              session_id: sess.id,
              session_title: sess.title,
              session_date: sess.created_at,
              model: sess.model,
              messages: allMessages?.filter(m => m.session_id === sess.id) || []
            })) || [];

            // Criar objeto do relatório
            const reportData = {
              report_metadata: {
                report_id: reportId,
                generated_at: timestamp.toISOString(),
                generated_by: user.email,
                report_version: '1.0',
              },

              incident_classification: {
                incident_type: 'prompt_injection_attempt',
                severity: threatLevel,
                status: userAccount?.is_active ? 'active_threat' : 'neutralized',
                confidence_score: threatScore / 4,
              },

              attacker_profile: {
                user_id: userId,
                full_name: userFullName,
                email: userEmail,
                account_created: userAccount?.created_at || session?.created_at,
                role: userRoleStr,
                is_active: userAccount?.is_active ?? false,
                account_status: userAccount?.is_active ? 'ACTIVE' : 'DEACTIVATED',
                ip_address: userIp,
                device_info: {
                  device_type: deviceInfo.device_type,
                  browser: deviceInfo.browser,
                  os: deviceInfo.os,
                  user_agent: lastAuthAttempt?.user_agent || 'unknown'
                },
                total_sessions: allUserSessions?.length || 0,
                total_messages: allMessages?.length || 0,
              },

              attack_details: {
                session_id: threat.session_id,
                attack_timestamp: session?.created_at || threat.created_at,
                session_title: session?.title || 'Unknown',
                last_activity: session?.updated_at,
                ip_address: userIp,
                technique: 'System Prompt Override / Instruction Injection',
                objective: 'Data Exfiltration & System Manipulation',
                target: 'Knowledge Base & System Configuration',
                attack_vector: 'Chat Interface',
              },

              threat_indicators: {
                prompt_injection_detected: threatIndicators.hasPromptInjection,
                negative_sentiment_detected: threatIndicators.hasNegativeSentiment,
                multiple_failed_auth: threatIndicators.hasMultipleFailedAuth,
                account_deactivated: threatIndicators.isAccountDeactivated,
                threat_score: `${threatScore}/4`,
                threat_level: threatLevel.toUpperCase(),
              },

              technical_evidence: {
                malicious_messages: maliciousMessage ? [{
                  message_id: maliciousMessage.id,
                  content: maliciousMessage.message?.content || '',
                  timestamp: maliciousMessage.created_at,
                  role: maliciousMessage.message?.role || 'user',
                }] : [],
                
                sentiment_analysis: insights?.map(i => ({
                  sentiment: i.sentiment,
                  sentiment_score: i.sentiment_score,
                  keywords: i.keywords,
                  topics: i.topics,
                  intent: i.intent,
                  analyzed_at: i.analyzed_at,
                })) || [],
                
                authentication_history: lastAuthAttempt ? [{
                  timestamp: lastAuthAttempt.created_at,
                  ip_address: lastAuthAttempt.ip_address,
                  success: true,
                  email: userEmail,
                }] : [],

                security_alerts: relatedAlerts?.map(a => ({
                  alert_id: a.id,
                  alert_type: a.alert_type,
                  severity: a.severity,
                  title: a.title,
                  description: a.description,
                  triggered_at: a.triggered_at,
                  acknowledged: a.acknowledged,
                })) || [],
              },

              system_response: {
                automated_actions_taken: [
                  userAccount?.is_active === false ? 'User account automatically deactivated' : 'User account remains active',
                  'Security alert generated',
                  'Incident logged for forensic analysis',
                ],
                attack_blocked: wasBlockedBySystem,
                data_compromised: false,
                containment_status: 'complete',
              },

              full_conversation_history: conversationsBySession,

              conversation_log: allMessages?.filter(m => m.session_id === threat.session_id).map(m => ({
                message_id: m.id,
                timestamp: m.created_at,
                role: m.message?.role || 'unknown',
                content: m.message?.content || '',
                session_id: m.session_id,
              })) || [],

              recommendations: [
                threatIndicators.isAccountDeactivated 
                  ? 'Account successfully deactivated. Review other sessions from this user.'
                  : 'URGENT: Manually review and deactivate account if necessary.',
                'Forward this report to legal team for potential law enforcement notification.',
                'Review access logs for any unauthorized data access.',
                'Implement additional rate limiting on prompt injection patterns.',
                'Consider IP blocking for repeat offenders.',
              ],

              legal_notice: 
                'CONFIDENTIAL SECURITY INCIDENT REPORT\n\n' +
                'This document contains sensitive security information regarding an attempted ' +
                'unauthorized access to the system. The incident was detected and blocked by ' +
                'automated security measures. This report is generated for legal and compliance ' +
                'purposes and may be used as evidence in legal proceedings.\n\n' +
                'Generated by: Automated Security System\n' +
                'Report Classification: CONFIDENTIAL\n' +
                'Retention Period: 7 years (as per legal requirements)',
            };

            // Salvar relatório no banco de dados
            const { error: saveError } = await supabase
              .from('security_incident_reports')
              .insert({
                report_id: reportId,
                session_id: threat.session_id,
                alert_id: newAlert.id,
                report_data: reportData,
                generated_by: user.id,
                threat_level: threatLevel,
                status: 'pending_review'
              });

            if (saveError) {
              console.error(`❌ Erro ao salvar relatório ${reportId}:`, saveError);
            } else {
              processedReports.push(reportId);
              console.log(`✅ Relatório ${reportId} salvo com sucesso`);
            }
          } catch (reportErr) {
            console.error(`❌ Erro ao gerar relatório:`, reportErr);
          }
        } else {
          console.error(`⚠️ Alerta não foi criado (newAlert é null)`);
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
