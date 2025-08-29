import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { SecureAuthForm } from '@/components/auth/SecureAuthForm';
import { GoogleAuthButton } from '@/components/auth/GoogleAuthButton';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { InterestForm } from '@/components/auth/InterestForm';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SecureAuthService } from '@/services/secureAuthService';
import { toast } from 'sonner';



const AuthPage = () => {
  const { isAuthenticated, refreshAuthState } = useAuth();
  const [isInterestModalOpen, setIsInterestModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
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
  
  
  const handleOpenInterestModal = () => {
    setIsInterestModalOpen(true);
  };
  
  const handleCloseInterestModal = () => {
    setIsInterestModalOpen(false);
  };

  
  return (
    <div className="min-h-screen flex flex-col" style={{
      backgroundImage: "url('/lovable-uploads/1edf50f1-3214-47b8-94d3-567d2ef0cf99.png')",
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat"
    }}>
      <div className="flex-grow flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-md space-y-6">
          <SecureAuthForm 
            mode={authMode}
            onModeChange={setAuthMode}
          />
          
          <Card className="border-0 shadow-elegant overflow-hidden transition-all duration-300 hover:shadow-lg bg-white/90 dark:bg-card/90 backdrop-blur-sm">
            <CardContent className="p-6 space-y-4">
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-2 bg-card text-muted-foreground">ou</span>
                </div>
              </div>
              
              <GoogleAuthButton />
              
              
              {isDevelopment && (
                <>
                </>
              )}
              
              <div className="relative">
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
