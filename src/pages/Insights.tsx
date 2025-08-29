
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { AuthGuard } from "@/components/layout/AuthGuard";
import { Loader2 } from "lucide-react";
import { Header } from "@/components/Header";


export default function Insights() {
  const navigate = useNavigate();

  useEffect(() => {
    // Show toast message after a slight delay for better user experience
    const toastTimeout = setTimeout(() => {
      toast("Esta funcionalidade ainda não está desenvolvida e pode demorar um pouco para ficar disponível. Inscreva-se para ficar por dentro.", {
        duration: 5000,
      });
    }, 500);
    
    // Redirect to home after a longer delay
    const redirectTimeout = setTimeout(() => {
      navigate("/");
    }, 2500);

    return () => {
      clearTimeout(toastTimeout);
      clearTimeout(redirectTimeout);
    };
  }, [navigate]);

  return (
    <AuthGuard>
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-grow flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Redirecionando para a página inicial...</p>
          </div>
        </div>
        
      </div>
    </AuthGuard>
  );
}
