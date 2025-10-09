import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "npm:resend@2.0.0";
import React from 'npm:react@18.3.1';
import { renderAsync } from 'npm:@react-email/components@0.0.22';
import { ResetPasswordEmail } from './_templates/reset-password-email.tsx';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface PasswordRecoveryRequest {
  email: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email }: PasswordRecoveryRequest = await req.json();
    
    console.log('🔐 Password Recovery Request:', { email });

    if (!email) {
      throw new Error('Email é obrigatório');
    }

    // Criar cliente Supabase Admin
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Verificar se o usuário existe
    const { data: users, error: userError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (userError) {
      console.error('❌ Error listing users:', userError);
      throw new Error('Erro ao verificar usuário');
    }

    const user = users.users.find(u => u.email === email);
    
    if (!user) {
      // Por segurança, não revelar se o email existe ou não
      console.log('⚠️ User not found, but returning success for security');
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Se o email existir em nossa base, você receberá um link de recuperação.'
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log('✅ User found:', { userId: user.id, email: user.email });

    // Gerar link de recuperação de senha
    const platformUrl = Deno.env.get("PLATFORM_URL") || "https://chatpdpoa.org";
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: email,
      options: {
        redirectTo: `${platformUrl}/reset-password`,
      }
    });

    if (linkError) {
      console.error('❌ Error generating recovery link:', linkError);
      throw new Error('Erro ao gerar link de recuperação');
    }

    console.log('✅ Recovery link generated successfully');

    // Renderizar template de email
    const emailHtml = await renderAsync(
      React.createElement(ResetPasswordEmail, {
        resetLink: linkData.properties.action_link,
        userEmail: email,
      })
    );

    // Enviar email via Resend
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: 'ChatPDPOA <noreply@chatpdpoa.org>',
      to: [email],
      subject: 'Redefinição de Senha - Plataforma ChatPDPOA',
      html: emailHtml,
    });

    if (emailError) {
      console.error('❌ Error sending email:', emailError);
      throw new Error(`Erro ao enviar email: ${emailError.message}`);
    }

    console.log('✅ Password recovery email sent successfully:', { emailId: emailData?.id });

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Email de recuperação enviado com sucesso! Verifique sua caixa de entrada.'
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("❌ Error in send-password-recovery function:", error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message || 'Erro ao processar solicitação de recuperação de senha'
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
