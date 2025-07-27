
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useTheme } from "@/components/ui/theme-provider";

export const AuthHeader = () => {
  const [loaded, setLoaded] = useState(false);
  const { theme } = useTheme();
  
  useEffect(() => {
    // Simular carregamento para uma transição suave
    const timer = setTimeout(() => {
      setLoaded(true);
    }, 300);
    return () => clearTimeout(timer);
  }, []);
  
  return (
    <div className={`text-center space-y-6 transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'}`}>
      <div className="mx-auto flex items-center justify-center mb-4">
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
      
      <p className="text-muted-foreground text-base max-w-xs mx-auto">Entre com suas credenciais para acessar o Chatbot do Plano Diretor</p>
    </div>
  );
};
