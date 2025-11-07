import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔄 Security Validation Worker iniciado...');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Subscribe to PostgreSQL notifications
    const channel = supabase.channel('security_validation_channel');

    channel
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'intelligence_alerts',
        filter: 'severity=in.(critical,high)'
      }, async (payload) => {
        console.log('🚨 Alerta crítico detectado:', payload.new);

        const alert = payload.new;
        
        // Aguardar 2 segundos antes de executar validação (evitar race conditions)
        await new Promise(resolve => setTimeout(resolve, 2000));

        console.log('⚡ Executando validação de segurança automática...');

        try {
          // Invocar função de validação de segurança
          const { data, error } = await supabase.functions.invoke('security-validator', {
            body: {
              triggeredBy: 'auto',
              reason: `Alerta ${alert.alert_type} - ${alert.id}`,
              agentId: null, // Testar todos os agentes
              testCaseIds: null, // Executar todos os testes
              metadata: {
                alert_id: alert.id,
                alert_type: alert.alert_type,
                severity: alert.severity,
                triggered_at: alert.triggered_at,
                user_email: alert.data?.user_email,
                session_id: alert.data?.session_id
              }
            }
          });

          if (error) {
            console.error('❌ Erro ao executar validação:', error);
            
            // Registrar erro no alerta
            await supabase
              .from('intelligence_alerts')
              .update({
                data: {
                  ...alert.data,
                  validation_status: 'failed',
                  validation_error: error.message
                }
              })
              .eq('id', alert.id);
          } else {
            console.log('✅ Validação executada com sucesso:', data);
            
            // Atualizar alerta com resultado da validação
            await supabase
              .from('intelligence_alerts')
              .update({
                data: {
                  ...alert.data,
                  validation_status: 'completed',
                  validation_run_id: data.runId
                }
              })
              .eq('id', alert.id);
          }
        } catch (validationError: any) {
          console.error('❌ Erro crítico na validação:', validationError);
        }
      })
      .subscribe((status) => {
        console.log('📡 Status do canal:', status);
      });

    // Manter a função rodando
    return new Response(
      JSON.stringify({ 
        message: 'Security Validation Worker ativo',
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: any) {
    console.error('❌ Erro no worker:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
