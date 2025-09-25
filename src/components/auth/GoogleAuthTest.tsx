import React from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const GoogleAuthTest = () => {
  const testGoogleAuth = async () => {
    try {
      console.log("=== TESTE GOOGLE OAUTH ===");
      console.log("Domínio atual:", window.location.origin);
      console.log("Redirect URL:", `${window.location.origin}/auth/callback`);
      
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

      console.log("Resultado OAuth:", { data, error });
      
      if (error) {
        console.error("ERRO OAUTH:", error);
        if (error.message?.includes('provider not enabled')) {
          toast.error("Google OAuth não está habilitado no Supabase. Configure no dashboard.");
        } else if (error.message?.includes('redirect')) {
          toast.error("URL de redirect não autorizada. Configure no Supabase.");
        } else {
          toast.error(`Erro Google OAuth: ${error.message}`);
        }
      } else {
        toast.success("Iniciando Google OAuth...");
      }
    } catch (err: any) {
      console.error("Erro crítico:", err);
      toast.error("Erro ao testar Google OAuth");
    }
  };

  return (
    <div className="p-4 border rounded-lg bg-blue-50 dark:bg-blue-950">
      <h3 className="font-semibold mb-2">🧪 Teste Google OAuth</h3>
      <Button 
        onClick={testGoogleAuth}
        variant="outline"
        className="w-full mb-2"
      >
        Testar Google Login (com logs detalhados)
      </Button>
      <p className="text-xs text-muted-foreground">
        Verifique o console do browser para logs detalhados
      </p>
    </div>
  );
};