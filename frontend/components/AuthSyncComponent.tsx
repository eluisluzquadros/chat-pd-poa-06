
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { AuthService } from '@/services/authService';
import { supabase } from '@/integrations/supabase/client';

export const AuthSyncComponent = () => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Evitar múltiplas inicializações
    if (isInitialized) return;

    const syncAuth = async () => {
      setIsSyncing(true);
      console.log('AuthSyncComponent: Verificando estado inicial de autenticação...');

      try {
        // Verificar sessão atual uma única vez
        const session = await AuthService.getCurrentSession();
        
        if (session) {
          console.log('AuthSyncComponent: Sessão ativa encontrada');
          
          // Armazenar dados básicos
          sessionStorage.setItem('lastAuthenticatedUserId', session.user.id);
          
          // Obter papel do usuário de forma assíncrona
          setTimeout(async () => {
            try {
              const role = await AuthService.getUserRole(session.user.id);
              sessionStorage.setItem('urbanista-user-role', role);
              console.log('AuthSyncComponent: Papel do usuário sincronizado:', role);
            } catch (roleError) {
              console.error('Erro ao obter papel do usuário:', roleError);
            }
          }, 100);
        } else {
          console.log('AuthSyncComponent: Nenhuma sessão ativa');
          
          // Limpar dados apenas se necessário
          sessionStorage.removeItem('lastAuthenticatedUserId');
          sessionStorage.removeItem('urbanista-user-role');
        }
      } catch (e) {
        console.error('AuthSyncComponent: Erro na sincronização:', e);
      } finally {
        setIsSyncing(false);
        setIsInitialized(true);
      }
    };

    // Executar sincronização inicial
    syncAuth();
    
    // Configurar listener simplificado (sem toast excessivo)
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('AuthSyncComponent: Mudança de estado:', event);
      
      if (event === 'SIGNED_IN' && session) {
        sessionStorage.setItem('lastAuthenticatedUserId', session.user.id);
        
        // Obter papel do usuário de forma assíncrona
        setTimeout(async () => {
          try {
            const role = await AuthService.getUserRole(session.user.id);
            sessionStorage.setItem('urbanista-user-role', role);
          } catch (roleError) {
            console.error('Erro ao obter papel do usuário:', roleError);
          }
        }, 100);
      } else if (event === 'SIGNED_OUT') {
        sessionStorage.removeItem('lastAuthenticatedUserId');
        sessionStorage.removeItem('urbanista-user-role');
      }
    });
    
    return () => {
      data.subscription.unsubscribe();
    };
  }, [isInitialized]);

  // Renderizar indicador apenas durante sincronização inicial
  if (isSyncing && !isInitialized) {
    return (
      <div className="fixed top-20 right-4 bg-primary/10 p-2 rounded-md flex items-center gap-2 text-sm z-50">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        <span>Verificando autenticação...</span>
      </div>
    );
  }

  return null;
};
