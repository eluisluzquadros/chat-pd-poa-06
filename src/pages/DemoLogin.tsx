import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

export default function DemoLogin() {
  const navigate = useNavigate();
  const { refreshAuthState } = useAuth();

  useEffect(() => {
    const initDemoMode = () => {
      console.log("🎭 Iniciando modo demo...");
      
      // Create demo session data
      const demoSession = {
        access_token: "demo_token",
        refresh_token: "demo_refresh",
        expires_in: 3600,
        token_type: "bearer",
        user: {
          id: "demo-user-id",
          email: "demo@pdus.com",
          user_metadata: {
            role: "supervisor"
          },
          app_metadata: {
            provider: "demo"
          },
          aud: "authenticated",
          created_at: new Date().toISOString()
        }
      };

      // Store in sessionStorage
      sessionStorage.setItem('demo-mode', 'true');
      sessionStorage.setItem('demo-session', JSON.stringify(demoSession));
      
      // Refresh auth state to pick up demo session
      refreshAuthState();
      
      toast.success("🎭 Modo Demo ativado! Testando Agentic RAG NLQ");
      
      // Navigate to chat
      setTimeout(() => {
        navigate('/chat');
      }, 1000);
    };

    initDemoMode();
  }, [navigate, refreshAuthState]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <h2 className="text-2xl font-bold">🎭 Iniciando Modo Demo</h2>
        <p className="text-muted-foreground">
          Ativando acesso para teste do Agentic RAG NLQ...
        </p>
      </div>
    </div>
  );
}