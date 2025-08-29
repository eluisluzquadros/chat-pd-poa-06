
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthService } from '@/services/authService';
import { toast } from 'sonner';
import { useAuth as useAuthContext } from '@/context/AuthContext';

export const useAuth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  
  // Obter estado de autenticação do contexto global
  const { isAuthenticated, refreshAuthState } = useAuthContext();

  // Verificar autenticação uma única vez ao carregar
  useEffect(() => {
    if (isAuthenticated) {
      console.log("Usuário já autenticado, redirecionando...");
      const redirectPath = sessionStorage.getItem('redirectAfterLogin') || '/chat';
      sessionStorage.removeItem('redirectAfterLogin');
      navigate(redirectPath, { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Limpar erros quando os campos mudarem
  useEffect(() => {
    if (error && (email || password)) {
      setError('');
    }
  }, [email, password, error]);

  // Função de login otimizada
  const handleLogin = useCallback(async () => {
    // Validações básicas
    if (!email.trim()) {
      setError('Email é obrigatório');
      return;
    }
    
    if (!password) {
      setError('Senha é obrigatória');
      return;
    }
    
    if (!/\S+@\S+\.\S+/.test(email.trim())) {
      setError('Email inválido');
      return;
    }
    
    setError('');
    setLoading(true);
    
    try {
      console.log('Iniciando processo de login...');
      
      const result = await AuthService.signIn(email.trim(), password);
      
      if (!result.success) {
        throw new Error(result.error || "Falha no login");
      }
      
      // Atualizar contexto global
      await refreshAuthState();
      
      toast.success("Login realizado com sucesso!");
      
      // Redirecionar após pequeno delay
      const redirectPath = sessionStorage.getItem('redirectAfterLogin') || '/chat';
      sessionStorage.removeItem('redirectAfterLogin');
      
      setTimeout(() => {
        navigate(redirectPath, { replace: true });
      }, 500);
      
    } catch (err: any) {
      console.error("Erro no login:", err);
      setError(err.message || "Erro no login. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }, [email, password, navigate, refreshAuthState]);

  return {
    email,
    setEmail,
    password,
    setPassword,
    loading,
    error,
    handleLogin,
    isAuthenticated
  };
};
