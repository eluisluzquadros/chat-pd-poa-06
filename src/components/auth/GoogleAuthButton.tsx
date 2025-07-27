import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface GoogleAuthButtonProps {
  disabled?: boolean;
}

export const GoogleAuthButton = ({ disabled = false }: GoogleAuthButtonProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleLogin = async () => {
    if (isLoading || disabled) return;

    setIsLoading(true);
    
    try {
      console.log("=== DIAGNÓSTICO GOOGLE OAUTH ===");
      console.log("Current origin:", window.location.origin);
      console.log("Redirect URL:", `${window.location.origin}/`);
      console.log("Supabase URL:", "https://xmsnlikpmmhzmuemxtrk.supabase.co");
      console.log("Current path:", window.location.pathname);
      console.log("URL params:", window.location.search);
      console.log("URL hash:", window.location.hash);
      
      // Teste de conectividade
      console.log("Testando conectividade com Google...");
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent'
          }
        }
      });
      
      console.log("Resposta OAuth completa:", { data, error });
      
      if (error) {
        console.error("Erro OAuth detalhado:", {
          message: error.message,
          status: error.status,
          details: error
        });
        
        // Mensagens específicas baseadas no erro
        if (error.message?.includes('connection refused')) {
          toast.error("Conexão recusada. Verifique configurações no Google Cloud Console.");
        } else if (error.message?.includes('popup')) {
          toast.error("Popup bloqueado. Permita popups e tente novamente.");
        } else {
          toast.error(`Erro OAuth: ${error.message}`);
        }
      } else {
        console.log("OAuth iniciado com sucesso:", data);
        toast.success("Redirecionando para Google...");
        
        // Aguardar um pouco para ver se o redirecionamento acontece
        setTimeout(() => {
          console.log("Redirecionamento deveria ter acontecido...");
        }, 2000);
      }
    } catch (error: any) {
      console.error("Erro crítico capturado:", {
        name: error.name,
        message: error.message,
        stack: error.stack,
        details: error
      });
      
      toast.error(`Erro crítico: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Função de teste direto para diagnóstico
  const handleDirectTest = () => {
    console.log("=== TESTE DIRETO GOOGLE OAUTH ===");
    const googleAuthUrl = `https://xmsnlikpmmhzmuemxtrk.supabase.co/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(window.location.origin + '/auth')}`;
    console.log("URL direta:", googleAuthUrl);
    
    try {
      window.location.href = googleAuthUrl;
    } catch (e) {
      console.error("Erro no redirecionamento direto:", e);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleGoogleLogin}
      disabled={isLoading || disabled}
      className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 text-gray-700 border-gray-300 font-medium py-6"
    >
      {isLoading ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : (
        <svg className="h-5 w-5" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
      )}
      {isLoading ? 'Conectando...' : 'Continuar com Google'}
    </Button>
  );
};