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

    // Buscar todos os message_insights com padrões de ataque
    const { data: threats, error: threatsError } = await supabase
      .from('message_insights')
      .select('*')
      .eq('sentiment', 'negative')
      .or(`keywords.is.null,keywords.eq.{}`)
      .order('created_at', { ascending: false });

    if (threatsError) {
      throw threatsError;
    }

    const processedAlerts: any[] = [];
    const processedReports: any[] = [];
    let skippedCount = 0;
    let errorCount = 0;

    console.log(`📊 Total de registros encontrados: ${threats?.length || 0}`);

    for (const threat of threats || []) {
      try {
        const message = threat.user_message?.toLowerCase() || '';
        
        // Verificar padrões de ataque
        const isAttack = 
          message.includes('system') && message.includes('prompt') ||
          message.includes('reiniciar') && message.includes('instruç') ||
          message.includes('acesso') && message.includes('irrestrito') ||
          message.includes('[system') ||
          message.includes('ignore') && message.includes('instruction') ||
          message.includes('database') ||
          message.includes('override') ||
          message.includes('bypass') && message.includes('security');

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
            title: 'Tentativa de Prompt Injection Detectada (Histórico)',
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
              processed_retroactively: true
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
        alerts_created: processedAlerts.length,
        reports_generated: processedReports.length,
        skipped: skippedCount,
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
