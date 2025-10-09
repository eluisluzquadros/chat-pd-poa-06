import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { InterestForm } from '@/components/auth/InterestForm';
import { ForgotPasswordModal } from '@/components/auth/ForgotPasswordModal';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, UserPlus, Lock, Mail, Eye, EyeOff, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { SecureAuthService } from '@/services/secureAuthService';
import { toast } from 'sonner';
import { useTheme } from "@/components/ui/theme-provider";
import { supabase } from '@/integrations/supabase/client';

const AuthPage = () => {
  const { isAuthenticated, refreshAuthState } = useAuth();
  const [isInterestModalOpen, setIsInterestModalOpen] = useState(false);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const navigate = useNavigate();
  const { theme } = useTheme();

  // Redirecionar se o usuário já estiver autenticado
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/chat', {
        replace: true
      });
    }
  }, [isAuthenticated, navigate]);

  // Animação de entrada
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoaded(true);
    }, 300);
    return () => clearTimeout(timer);
  }, []);
  
  const handleOpenInterestModal = () => {
    setIsInterestModalOpen(true);
  };
  
  const handleCloseInterestModal = () => {
    setIsInterestModalOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (authMode === 'signup') {
        if (!fullName.trim()) {
          toast.error('Por favor, preencha seu nome completo');
          return;
        }
        const result = await SecureAuthService.signUp(email, password, fullName);
        
        if (result.success) {
          toast.success('Conta criada! Verifique seu email para ativar sua conta.', {
            duration: 6000
          });
          await refreshAuthState();
          navigate('/chat');
        } else {
          toast.error(result.error || 'Erro ao criar conta');
        }
      } else {
        const result = await SecureAuthService.signIn(email, password);
        
        if (result.success) {
          toast.success('Login realizado com sucesso!');
          
          console.log("🔄 Chamando refreshAuthState após login");
          await refreshAuthState();
          console.log("✅ refreshAuthState concluído");
          
          // Usar window.location.href para garantir navegação absoluta
          console.log("🚀 Redirecionando para /chat via window.location");
          window.location.href = '/chat';
        } else {
          toast.error(result.error || 'Erro ao fazer login');
        }
      }
    } catch (error: any) {
      console.error('Erro na autenticação:', error);
      toast.error(error.message || 'Erro ao processar autenticação');
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="min-h-screen flex flex-col" style={{
      backgroundImage: "url('/lovable-uploads/fa2fb874-6389-4e4d-8e5d-0fb551bdbce0.png')",
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat"
    }}>
      <div className="flex-grow flex items-center justify-center py-12 px-4">
        <Card className={`w-full max-w-md border-0 shadow-elegant overflow-hidden transition-all duration-500 bg-white/90 dark:bg-card/90 backdrop-blur-sm ${loaded ? 'opacity-100' : 'opacity-0'}`}>
          <CardContent className="p-8 space-y-6">
            {/* Logo */}
            <div className="flex items-center justify-center mb-4">
              {!loaded ? (
                <Loader2 className="h-12 w-12 animate-spin text-dark-green" />
              ) : (
                <div className="w-full max-w-[300px]">
                  <img 
                    src={theme === 'dark' 
                      ? "/lovable-uploads/9138fd22-514b-41ba-9317-fecb0bacad7d.png" 
                      : "/lovable-uploads/9c959472-19d4-4cc4-9f30-354a6c05be72.png"
                    } 
                    alt="Plano Diretor de Porto Alegre" 
                    className="w-full"
                  />
                </div>
              )}
            </div>
            
            <p className="text-muted-foreground text-center text-sm">
              Entre com suas credenciais para acessar o Chatbot do Plano Diretor
            </p>

            {/* Formulário de Login/Signup */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {authMode === 'signup' && (
                <div className="space-y-2">
                  <Label htmlFor="fullName">Nome Completo*</Label>
                  <Input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Seu nome completo"
                    required
                    disabled={isLoading}
                  />
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="email">Email*</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9"
                    placeholder="seu@email.com"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha*</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9 pr-10"
                    placeholder="••••••••"
                    required
                    disabled={isLoading}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>

              {authMode === 'login' && (
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="link"
                    className="p-0 h-auto text-sm"
                    onClick={() => setIsForgotPasswordOpen(true)}
                  >
                    Esqueci a senha
                  </Button>
                </div>
              )}

              <Button 
                type="submit" 
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processando...
                  </>
                ) : (
                  authMode === 'login' ? 'Entrar' : 'Criar Conta'
                )}
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
                disabled={isLoading}
              >
                {authMode === 'login' 
                  ? 'Não tem conta? Cadastre-se' 
                  : 'Já tem conta? Faça login'}
              </Button>
            </form>

            {authMode === 'login' && (
              <Alert className="mt-4">
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Se você acabou de criar sua conta, verifique seu email para ativá-la antes de fazer login.
                </AlertDescription>
              </Alert>
            )}

            {/* Divisor */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-2 bg-white dark:bg-card text-muted-foreground">interessado no sistema?</span>
              </div>
            </div>

            {/* Botão Manifestar Interesse */}
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleOpenInterestModal} 
              className="w-full flex items-center justify-center gap-2 bg-[#E08C37] text-white hover:bg-[#E08C37]/80 border-[#E08C37]"
              disabled={isLoading}
            >
              <UserPlus size={18} />
              Cadastrar Interesse
            </Button>

            {/* Copyright */}
            <div className="text-center text-xs text-muted-foreground pt-4">
              <p>© 2025 ChatPDPOA - Plano Diretor de Porto Alegre</p>
            </div>
          </CardContent>
        </Card>
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

      {/* Modal para Recuperação de Senha */}
      <ForgotPasswordModal 
        open={isForgotPasswordOpen} 
        onOpenChange={setIsForgotPasswordOpen}
      />
    </div>
  );
};

export default AuthPage;
