import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface WelcomeEmailRequest {
  email: string;
  fullName: string;
  password: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, fullName, password }: WelcomeEmailRequest = await req.json();

    console.log(`📧 Sending welcome email to: ${email}`);

    const platformUrl = Deno.env.get("PLATFORM_URL") || "https://chatpdpoa.org";

    const emailResponse = await resend.emails.send({
      from: "Plataforma ChatPDPOA <noreply@chatpdpoa.org>",
      to: [email],
      subject: "Bem-vindo à Plataforma ChatPDPOA! 🎉",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
              .content { background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; }
              .credentials { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea; }
              .credential-item { margin: 10px 0; }
              .credential-label { font-weight: 600; color: #555; }
              .credential-value { font-family: 'Courier New', monospace; background: #fff; padding: 8px 12px; border-radius: 4px; display: inline-block; margin-top: 5px; }
              .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: 600; }
              .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px; }
              .footer { text-align: center; color: #888; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin: 0; font-size: 28px;">🎉 Bem-vindo!</h1>
                <p style="margin: 10px 0 0 0; opacity: 0.9;">Plataforma ChatPDPOA</p>
              </div>
              
              <div class="content">
                <p>Olá <strong>${fullName}</strong>,</p>
                
                <p>Sua conta na <strong>Plataforma ChatPDPOA</strong> foi criada com sucesso!</p>
                
                <div class="credentials">
                  <div class="credential-item">
                    <div class="credential-label">📧 Email:</div>
                    <div class="credential-value">${email}</div>
                  </div>
                  
                  <div class="credential-item">
                    <div class="credential-label">🔑 Senha temporária:</div>
                    <div class="credential-value">${password}</div>
                  </div>
                </div>
                
                <div style="text-align: center;">
                  <a href="${platformUrl}" class="button">Acessar a Plataforma</a>
                </div>
                
                <div class="warning">
                  <strong>⚠️ Importante:</strong> Por motivos de segurança, recomendamos que você altere sua senha após o primeiro acesso. Você pode fazer isso em <strong>Conta > Segurança</strong>.
                </div>
                
                <p style="margin-top: 30px;">Se você não solicitou esta conta, entre em contato conosco imediatamente.</p>
                
                <p>Atenciosamente,<br><strong>Equipe ChatPDPOA</strong></p>
              </div>
              
              <div class="footer">
                <p>Este é um email automático, por favor não responda.</p>
                <p>© ${new Date().getFullYear()} Plataforma ChatPDPOA. Todos os direitos reservados.</p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    console.log("✅ Welcome email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("❌ Error sending welcome email:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);
