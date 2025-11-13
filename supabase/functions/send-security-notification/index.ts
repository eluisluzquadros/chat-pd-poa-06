import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "npm:resend@4.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationRequest {
  notification_type: 'incident' | 'simulation' | 'weekly_report';
  alert_id?: string;
  report_id?: string;
  run_id?: string;
  incident_data?: any;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendKey = Deno.env.get('RESEND_API_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    const resend = new Resend(resendKey);

    const requestData: NotificationRequest = await req.json();

    // Buscar destinatários (admins e supervisors)
    const { data: recipients } = await supabase
      .from('user_accounts')
      .select('email, full_name, user_roles!inner(role)')
      .in('user_roles.role', ['admin', 'supervisor'])
      .eq('is_active', true);

    if (!recipients || recipients.length === 0) {
      console.log('⚠️ Nenhum destinatário encontrado');
      return new Response(
        JSON.stringify({ success: false, message: 'No recipients found' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📧 Enviando notificações para ${recipients.length} destinatários`);

    let subject = '';
    let bodyHtml = '';
    let bodyText = '';

    // Construir email baseado no tipo
    if (requestData.notification_type === 'incident') {
      const severity = requestData.incident_data?.severity || 'medium';
      const severityEmoji = severity === 'critical' ? '🚨' : severity === 'high' ? '⚠️' : 'ℹ️';
      
      subject = `${severityEmoji} ALERTA DE SEGURANÇA: Tentativa de Ciberataque Detectada`;
      
      bodyHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
            .alert-box { background: white; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0; }
            .details { background: white; padding: 15px; margin: 15px 0; border-radius: 4px; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
            .button { display: inline-block; background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${severityEmoji} ALERTA CRÍTICO DE SEGURANÇA</h1>
            </div>
            <div class="content">
              <div class="alert-box">
                <h2>Tentativa de Ciberataque Detectada</h2>
                <p>${requestData.incident_data?.title || 'Incidente de segurança detectado'}</p>
              </div>

              <div class="details">
                <h3>📊 Detalhes do Incidente</h3>
                <p><strong>Severidade:</strong> ${severity.toUpperCase()}</p>
                <p><strong>Usuário:</strong> ${requestData.incident_data?.attacker_email || 'Desconhecido'}</p>
                <p><strong>Nome:</strong> ${requestData.incident_data?.attacker_name || 'Desconhecido'}</p>
                <p><strong>Data:</strong> ${new Date().toLocaleString('pt-BR')}</p>
              </div>

              <div class="details">
                <h3>⚠️ Ações Recomendadas</h3>
                <ul>
                  <li>Revisar o relatório forense completo</li>
                  <li>Verificar logs de acesso do usuário</li>
                  <li>Avaliar necessidade de ação legal</li>
                  <li>Atualizar políticas de segurança se necessário</li>
                </ul>
              </div>

              <a href="https://ngrqwmvuhvjkeohesbxs.supabase.co" class="button">
                Ver Relatório Completo
              </a>

              <p style="margin-top: 20px; font-size: 12px; color: #6b7280;">
                Esta é uma notificação automática do sistema de segurança ChatPDPOA.
              </p>
            </div>
            <div class="footer">
              <p>ChatPDPOA Security System © ${new Date().getFullYear()}</p>
              <p>Sistema de Monitoramento e Detecção de Ameaças</p>
            </div>
          </div>
        </body>
        </html>
      `;

      bodyText = `
ALERTA CRÍTICO DE SEGURANÇA

Tentativa de Ciberataque Detectada

${requestData.incident_data?.title || 'Incidente de segurança detectado'}

Detalhes do Incidente:
- Severidade: ${severity.toUpperCase()}
- Usuário: ${requestData.incident_data?.attacker_email || 'Desconhecido'}
- Nome: ${requestData.incident_data?.attacker_name || 'Desconhecido'}
- Data: ${new Date().toLocaleString('pt-BR')}

Ações Recomendadas:
- Revisar o relatório forense completo
- Verificar logs de acesso do usuário
- Avaliar necessidade de ação legal
- Atualizar políticas de segurança se necessário

ChatPDPOA Security System
      `;
    } else if (requestData.notification_type === 'simulation') {
      subject = '✅ Simulação de Segurança Concluída';
      // ... template for simulation
    } else {
      subject = '📊 Relatório Semanal de Segurança';
      // ... template for weekly report
    }

    // Enviar emails e registrar notificações
    const notifications = [];
    
    for (const recipient of recipients) {
      try {
        await resend.emails.send({
          from: 'ChatPDPOA Security <security@chatpdpoa.com>',
          to: [recipient.email],
          subject,
          html: bodyHtml,
          text: bodyText,
        });

        // Registrar notificação no banco
        const { data: notification } = await supabase
          .from('security_notifications')
          .insert({
            notification_type: requestData.notification_type,
            recipient_email: recipient.email,
            recipient_name: recipient.full_name,
            subject,
            body_html: bodyHtml,
            body_text: bodyText,
            status: 'sent',
            sent_at: new Date().toISOString(),
            related_alert_id: requestData.alert_id,
            related_report_id: requestData.report_id,
            related_run_id: requestData.run_id,
          })
          .select()
          .single();

        notifications.push(notification);
        console.log(`✅ Email enviado para ${recipient.email}`);
      } catch (emailError) {
        console.error(`❌ Erro ao enviar para ${recipient.email}:`, emailError);
        
        // Registrar falha
        await supabase
          .from('security_notifications')
          .insert({
            notification_type: requestData.notification_type,
            recipient_email: recipient.email,
            recipient_name: recipient.full_name,
            subject,
            body_html: bodyHtml,
            body_text: bodyText,
            status: 'failed',
            error_message: emailError.message,
            related_alert_id: requestData.alert_id,
            related_report_id: requestData.report_id,
            related_run_id: requestData.run_id,
          });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        notifications_sent: notifications.length,
        recipients: recipients.length,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('❌ Erro:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
