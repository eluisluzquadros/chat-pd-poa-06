import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, CheckCircle, XCircle, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';


const AuthCallback = () => {
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Processando login...');
  const { refreshAuthState } = useAuth();
  const navigate = useNavigate();
  const processedRef = useRef(false);
  const sessionIdRef = useRef(Math.random().toString(36).substring(7));

  useEffect(() => {
    // Evitar reprocessamento múltiplo
    if (processedRef.current) {
      console.log("AuthCallback: Já processado, ignorando...");
      return;
    }
    
    const processCallback = async () => {
      try {
        processedRef.current = true;
        const sessionId = sessionIdRef.current;
        
        console.log(`Processando callback OAuth [${sessionId}]`);
        
        // Aguardar um pouco para o Supabase processar
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Atualizar estado de autenticação
        await refreshAuthState();
        
        // Aguardar mais um pouco para garantir que o estado foi atualizado
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Verificar se há usuário autenticado
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user?.email) {
          throw new Error("Usuário não encontrado após OAuth");
        }
        
        console.log(`Validando acesso para usuário: ${user.email}`);
        
        // Validar se o usuário tem acesso à plataforma
        const { AuthService } = await import('@/services/authService');
        const accessValidation = await AuthService.validateUserAccess(user.email, user.id);
        
        if (!accessValidation.hasAccess) {
          console.log(`Acesso negado: ${accessValidation.reason}`);
          
          // Limpeza completa antes do logout
          AuthService.cleanupAuthState();
          
          // Fazer logout com escopo global
          try {
            await supabase.auth.signOut({ scope: 'global' });
          } catch (logoutError) {
            console.error("Erro no logout:", logoutError);
            // Continuar mesmo com erro no logout
          }
          
          // Aguardar um pouco para garantir que o logout foi processado
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Limpeza adicional após logout
          AuthService.cleanupAuthState();
          
          setStatus('error');
          setMessage(accessValidation.message || 'Acesso restrito a usuários previamente cadastrados.');
          toast.error(accessValidation.message || 'Acesso restrito');
          
          // Redirecionar para auth após um delay
          setTimeout(() => {
            window.location.href = '/auth';
          }, 3000);
          return;
        }
        
        console.log(`Usuário validado com sucesso: ${accessValidation.userData?.full_name}`);
        setStatus('success');
        setMessage('Login realizado com sucesso!');
        toast.success("Login com Google realizado com sucesso!");
        
        // Redirecionar para chat
        setTimeout(() => {
          navigate('/chat', { replace: true });
        }, 1000);
        
      } catch (error: any) {
        console.error("Erro ao processar callback OAuth:", error);
        setStatus('error');
        setMessage('Erro ao processar login. Tente novamente.');
        toast.error("Erro ao processar login");
        
        // Limpeza e logout em caso de erro
        try {
          const { AuthService } = await import('@/services/authService');
          AuthService.cleanupAuthState();
          await supabase.auth.signOut({ scope: 'global' });
        } catch (logoutError) {
          console.error("Erro ao fazer logout após falha:", logoutError);
        }
        
        // Redirecionar para auth em caso de erro
        setTimeout(() => {
          window.location.href = '/auth';
        }, 2000);
      }
    };

    processCallback();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md border-0 shadow-elegant bg-white/90 dark:bg-card/90 backdrop-blur-sm">
        <div className="h-2 bg-gradient-to-r from-dark-green to-light-green"></div>
        <CardContent className="p-8 text-center space-y-6">
          <div className="flex flex-col items-center gap-4">
            {status === 'processing' && (
              <>
                <Loader2 className="h-12 w-12 animate-spin text-dark-green dark:text-light-green" />
                <h2 className="text-xl font-semibold text-foreground">Processando login</h2>
                <p className="text-muted-foreground">{message}</p>
              </>
            )}
            
            {status === 'success' && (
              <>
                <CheckCircle className="h-12 w-12 text-green-600" />
                <h2 className="text-xl font-semibold text-foreground">Login realizado!</h2>
                <p className="text-muted-foreground">{message}</p>
              </>
            )}
            
            {status === 'error' && (
              <>
                <XCircle className="h-12 w-12 text-red-600" />
                <h2 className="text-xl font-semibold text-foreground">Erro no login</h2>
                <p className="text-muted-foreground text-center">{message}</p>
                
                {message?.includes('Conta não encontrada') && (
                  <div className="mt-4 space-y-2">
                    <p className="text-sm text-muted-foreground text-center">
                      Solicite acesso ao sistema através do formulário abaixo:
                    </p>
                    <Button 
                      onClick={() => navigate('/auth')}
                      variant="outline"
                      className="w-full flex items-center justify-center gap-2 bg-[#E08C37] text-white hover:bg-[#E08C37]/80 border-[#E08C37]"
                    >
                      <UserPlus className="h-4 w-4" />
                      Cadastrar Interesse
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthCallback;