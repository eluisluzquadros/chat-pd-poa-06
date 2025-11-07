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
    const { 
      to, 
      to_name,
      alert_id, 
      alert_type, 
      severity, 
      title, 
      description,
      triggered_at,
      user_email,
      session_id 
    } = await req.json();

    console.log('📧 Enviando email de segurança para:', to);

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    
    if (!resendApiKey) {
      console.warn('⚠️ RESEND_API_KEY não configurada - email não será enviado');
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'RESEND_API_KEY não configurada' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 // Não falhar se email não estiver configurado
        }
      );
    }

    const severityColor = severity === 'critical' ? '#dc2626' : '#ea580c';
    const severityLabel = severity === 'critical' ? 'CRÍTICO' : 'ALTO';

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
              background-color: #f9fafb;
              padding: 20px;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              background: white;
              border-radius: 8px;
              box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            }
            .header {
              background: ${severityColor};
              color: white;
              padding: 30px;
              border-radius: 8px 8px 0 0;
            }
            .badge {
              display: inline-block;
              background: rgba(255,255,255,0.2);
              padding: 4px 12px;
              border-radius: 4px;
              font-size: 12px;
              font-weight: 600;
              margin-bottom: 10px;
            }
            .content {
              padding: 30px;
            }
            .alert-title {
              font-size: 20px;
              font-weight: 600;
              margin-bottom: 10px;
              color: #111827;
            }
            .alert-description {
              color: #6b7280;
              line-height: 1.6;
              margin-bottom: 20px;
            }
            .details {
              background: #f9fafb;
              border-radius: 6px;
              padding: 20px;
              margin: 20px 0;
            }
            .detail-row {
              display: flex;
              justify-content: space-between;
              padding: 8px 0;
              border-bottom: 1px solid #e5e7eb;
            }
            .detail-row:last-child {
              border-bottom: none;
            }
            .detail-label {
              font-weight: 600;
              color: #374151;
            }
            .detail-value {
              color: #6b7280;
              text-align: right;
              word-break: break-all;
            }
            .button {
              display: inline-block;
              background: ${severityColor};
              color: white;
              padding: 12px 24px;
              border-radius: 6px;
              text-decoration: none;
              font-weight: 600;
              margin: 10px 10px 10px 0;
            }
            .footer {
              padding: 20px 30px;
              background: #f9fafb;
              border-radius: 0 0 8px 8px;
              text-align: center;
              color: #6b7280;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="badge">🚨 ALERTA DE SEGURANÇA - ${severityLabel}</div>
              <h1 style="margin: 0; font-size: 24px;">${title}</h1>
            </div>
            
            <div class="content">
              <div class="alert-description">
                ${description}
              </div>

              <div class="details">
                <div class="detail-row">
                  <span class="detail-label">Tipo de Alerta:</span>
                  <span class="detail-value">${alert_type}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Severidade:</span>
                  <span class="detail-value">${severityLabel}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Usuário:</span>
                  <span class="detail-value">${user_email || 'N/A'}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Sessão:</span>
                  <span class="detail-value">${session_id || 'N/A'}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Horário:</span>
                  <span class="detail-value">${new Date(triggered_at).toLocaleString('pt-BR')}</span>
                </div>
              </div>

              <p style="margin-top: 20px; color: #374151;">
                <strong>Ações tomadas automaticamente:</strong>
              </p>
              <ul style="color: #6b7280; line-height: 1.8;">
                <li>✅ Usuário desativado automaticamente</li>
                <li>✅ Validação de segurança agendada</li>
                <li>✅ Alerta registrado no sistema</li>
              </ul>

              <div style="margin-top: 30px;">
                <a href="${Deno.env.get('SUPABASE_URL')?.replace('supabase.co', 'vercel.app') || '#'}/admin/security" class="button">
                  Ver Dashboard de Segurança
                </a>
                <a href="${Deno.env.get('SUPABASE_URL')?.replace('supabase.co', 'vercel.app') || '#'}/admin/reports" class="button">
                  Gerar Relatório Forense
                </a>
              </div>
            </div>

            <div class="footer">
              <p style="margin: 0;">Este é um alerta automático de segurança.</p>
              <p style="margin: 5px 0 0 0;">Sistema de Monitoramento - ${new Date().toLocaleString('pt-BR')}</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Segurança <security@urbanista.app>',
        to: [to],
        subject: `🚨 [${severityLabel}] ${title}`,
        html: emailHtml,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ Erro ao enviar email via Resend:', error);
      throw new Error(`Resend API error: ${error}`);
    }

    const data = await response.json();
    console.log('✅ Email enviado com sucesso:', data);

    return new Response(
      JSON.stringify({ success: true, data }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: any) {
    console.error('❌ Erro ao enviar email:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
