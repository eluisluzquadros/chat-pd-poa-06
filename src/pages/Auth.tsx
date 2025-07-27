import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { AuthForm } from '@/components/auth/AuthForm';
import { GoogleAuthButton } from '@/components/auth/GoogleAuthButton';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { InterestForm } from '@/components/auth/InterestForm';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, UserPlus, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AuthService } from '@/services/authService';
import { toast } from 'sonner';
import { DemoSetupButton } from '@/components/DemoSetupButton';


const AuthPage = () => {
  const { isAuthenticated, refreshAuthState } = useAuth();
  const [isInterestModalOpen, setIsInterestModalOpen] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Verificar se está em ambiente de desenvolvimento
  const isDevelopment = window.location.hostname === 'localhost' || 
                        window.location.hostname.includes('lovable') ||
                        window.location.hostname.includes('127.0.0.1');

  // Redirecionar se o usuário já estiver autenticado
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/chat', {
        replace: true
      });
    }
  }, [isAuthenticated, navigate]);
  
  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError('Email e senha são obrigatórios');
      return;
    }

    setError('');
    setLoading(true);
    
    try {
      const result = await AuthService.signIn(email.trim(), password);
      
      if (result.success) {
        await refreshAuthState();
        toast.success("Login realizado com sucesso!");
        navigate('/chat', { replace: true });
      } else {
        setError(result.error || "Erro no login");
      }
    } catch (err: any) {
      setError(err.message || "Erro no login. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleLogin();
  };
  
  const onFormSubmit = async (emailValue: string, passwordValue: string) => {
    setEmail(emailValue);
    setPassword(passwordValue);
    await handleLogin();
  };
  
  const handleOpenInterestModal = () => {
    setIsInterestModalOpen(true);
  };
  
  const handleCloseInterestModal = () => {
    setIsInterestModalOpen(false);
  };

  const handleDemoLogin = async () => {
    setDemoLoading(true);
    try {
      const result = await AuthService.signInAsDemo();
      if (result.success) {
        toast.success("Acesso demo supervisor ativado!");
        await refreshAuthState();
        navigate('/chat', { replace: true });
      } else {
        toast.error(result.error || "Erro ao ativar modo demo");
      }
    } catch (error) {
      toast.error("Erro ao ativar modo demo");
      console.error("Demo login error:", error);
    } finally {
      setDemoLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen flex flex-col" style={{
      backgroundImage: "url('/lovable-uploads/1edf50f1-3214-47b8-94d3-567d2ef0cf99.png')",
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat"
    }}>
      <div className="flex-grow flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-md">
          {loading && (
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
              <div className="bg-card p-6 rounded-xl shadow-lg flex flex-col items-center gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-dark-green dark:text-light-green" />
                <p className="text-foreground font-medium">Verificando suas credenciais...</p>
              </div>
            </div>
          )}
          
          <Card className="border-0 shadow-elegant overflow-hidden transition-all duration-300 hover:shadow-lg bg-white/90 dark:bg-card/90 backdrop-blur-sm">
            <div className="h-2 bg-gradient-to-r from-dark-green to-light-green"></div>
            <CardContent className="p-8 md:p-10 space-y-8">
              <AuthHeader />

              {error && (
                <div className="p-4 bg-destructive/10 text-destructive rounded-lg text-sm border border-destructive/20 animate-fade-in">
                  {error}
                </div>
              )}

              <AuthForm isLoading={loading} onSubmit={onFormSubmit} />
              
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-2 bg-card text-muted-foreground">ou</span>
                </div>
              </div>
              
              <GoogleAuthButton disabled={loading} />
              
              
              {isDevelopment && (
                <>
                  <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
                    </div>
                    <div className="relative flex justify-center text-xs">
                      <span className="px-2 bg-card text-muted-foreground">acesso de teste</span>
                    </div>
                  </div>
                  
                   <DemoSetupButton />
                   
                   <Button 
                     type="button" 
                     variant="outline" 
                     onClick={handleDemoLogin}
                     disabled={demoLoading}
                     className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white border-blue-600"
                   >
                     {demoLoading ? (
                       <Loader2 className="h-4 w-4 animate-spin" />
                     ) : (
                       <Shield className="h-4 w-4" />
                     )}
                     {demoLoading ? 'Ativando...' : 'Acesso Supervisor Demo'}
                   </Button>
                </>
              )}
              
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-2 bg-card text-muted-foreground">interessado no sistema?</span>
                </div>
              </div>
              
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleOpenInterestModal} 
                className="w-full flex items-center justify-center gap-2 bg-[#E08C37] text-white hover:bg-[#E08C37]/80 border-[#E08C37]"
              >
                <UserPlus size={18} />
                Cadastrar Interesse
              </Button>
              
              <div className="text-center text-xs text-muted-foreground">
                <p>@ 2025 ChatPDPOA - Plano Diretor de Porto Alegre </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      

      {/* Modal para Manifestar Interesse */}
      <Dialog open={isInterestModalOpen} onOpenChange={setIsInterestModalOpen}>
        <DialogContent className="sm:max-w-md dark:bg-card dark:border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-dark-green dark:text-light-green">Cadastre seu interesse</DialogTitle>
            <DialogDescription>
              Preencha o formulário abaixo para solicitar acesso ao sistema do Plano Diretor de Porto Alegre.
            </DialogDescription>
          </DialogHeader>
          <InterestForm onClose={handleCloseInterestModal} />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AuthPage;
