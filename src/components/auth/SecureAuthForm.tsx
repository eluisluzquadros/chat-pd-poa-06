import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { EyeIcon, EyeOffIcon, Shield, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { AuthService } from '@/services/authService';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

interface SecureAuthFormProps {
  mode: 'login' | 'signup';
  onModeChange: (mode: 'login' | 'signup') => void;
}

export const SecureAuthForm = ({ mode, onModeChange }: SecureAuthFormProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [attemptCount, setAttemptCount] = useState(0);
  const [isRateLimited, setIsRateLimited] = useState(false);
  
  const { refreshAuthState, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/chat');
    }
  }, [isAuthenticated, navigate]);

  // Rate limiting check
  useEffect(() => {
    if (attemptCount >= 5) {
      setIsRateLimited(true);
      const timer = setTimeout(() => {
        setIsRateLimited(false);
        setAttemptCount(0);
      }, 15 * 60 * 1000); // 15 minutes
      return () => clearTimeout(timer);
    }
  }, [attemptCount]);

  // Input validation
  const validateInput = () => {
    const newErrors: Record<string, string> = {};

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      newErrors.email = 'Email é obrigatório';
    } else if (!emailRegex.test(email)) {
      newErrors.email = 'Email deve ter um formato válido';
    } else if (email.length > 254) {
      newErrors.email = 'Email muito longo';
    }

    // Password validation
    if (!password) {
      newErrors.password = 'Senha é obrigatória';
    } else if (mode === 'signup') {
      if (password.length < 8) {
        newErrors.password = 'Senha deve ter pelo menos 8 caracteres';
      } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
        newErrors.password = 'Senha deve conter ao menos: 1 maiúscula, 1 minúscula e 1 número';
      }
      
      // Confirm password validation
      if (!confirmPassword) {
        newErrors.confirmPassword = 'Confirmação de senha é obrigatória';
      } else if (password !== confirmPassword) {
        newErrors.confirmPassword = 'Senhas não coincidem';
      }

      // Full name validation for signup
      if (!fullName.trim()) {
        newErrors.fullName = 'Nome completo é obrigatório';
      } else if (fullName.trim().length < 2) {
        newErrors.fullName = 'Nome deve ter pelo menos 2 caracteres';
      } else if (fullName.trim().length > 100) {
        newErrors.fullName = 'Nome muito longo';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Sanitize input to prevent XSS
  const sanitizeInput = (input: string) => {
    return input.trim().replace(/<[^>]*>?/gm, '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isRateLimited) {
      toast.error('Muitas tentativas. Aguarde 15 minutos.');
      return;
    }

    if (!validateInput()) {
      return;
    }

    setIsLoading(true);
    
    try {
      const sanitizedEmail = sanitizeInput(email.toLowerCase());
      const sanitizedFullName = mode === 'signup' ? sanitizeInput(fullName) : '';

      if (mode === 'login') {
        const result = await AuthService.signIn(sanitizedEmail, password);
        
        if (result.success) {
          toast.success('Login realizado com sucesso!');
          await refreshAuthState();
          navigate('/chat');
        } else {
          setAttemptCount(prev => prev + 1);
          toast.error(result.error || 'Erro no login');
        }
      } else {
        // Signup logic
        const { data, error } = await supabase.auth.signUp({
          email: sanitizedEmail,
          password: password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              full_name: sanitizedFullName
            }
          }
        });

        if (error) {
          setAttemptCount(prev => prev + 1);
          toast.error(error.message || 'Erro no cadastro');
        } else if (data.user) {
          toast.success('Conta criada com sucesso! Você já pode fazer login.');
          onModeChange('login');
          setEmail(sanitizedEmail);
          setPassword('');
          setConfirmPassword('');
          setFullName('');
        }
      }
    } catch (error) {
      console.error('Erro na autenticação:', error);
      setAttemptCount(prev => prev + 1);
      toast.error('Erro inesperado. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    // Clear specific field error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }

    switch (field) {
      case 'email':
        setEmail(value);
        break;
      case 'password':
        setPassword(value);
        break;
      case 'confirmPassword':
        setConfirmPassword(value);
        break;
      case 'fullName':
        setFullName(value);
        break;
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-center space-x-2">
          <Shield className="h-6 w-6 text-primary" />
          <CardTitle className="text-2xl font-bold">
            {mode === 'login' ? 'Entrar' : 'Criar Conta'}
          </CardTitle>
        </div>
      </CardHeader>
      
      <CardContent>
        {isRateLimited && (
          <Alert className="mb-4" variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Muitas tentativas de login. Aguarde 15 minutos antes de tentar novamente.
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full Name - only for signup */}
          {mode === 'signup' && (
            <div className="space-y-2">
              <Label htmlFor="fullName">Nome Completo</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="Seu nome completo"
                value={fullName}
                onChange={(e) => handleInputChange('fullName', e.target.value)}
                disabled={isLoading || isRateLimited}
                className={errors.fullName ? 'border-destructive' : ''}
                maxLength={100}
                autoComplete="name"
              />
              {errors.fullName && (
                <p className="text-sm text-destructive">{errors.fullName}</p>
              )}
            </div>
          )}

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              disabled={isLoading || isRateLimited}
              className={errors.email ? 'border-destructive' : ''}
              maxLength={254}
              autoComplete="email"
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email}</p>
            )}
          </div>

          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder={mode === 'signup' ? 'Mínimo 8 caracteres' : 'Sua senha'}
                value={password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                disabled={isLoading || isRateLimited}
                className={errors.password ? 'border-destructive pr-10' : 'pr-10'}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading || isRateLimited}
              >
                {showPassword ? (
                  <EyeOffIcon className="h-4 w-4" />
                ) : (
                  <EyeIcon className="h-4 w-4" />
                )}
              </Button>
            </div>
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password}</p>
            )}
          </div>

          {/* Confirm Password - only for signup */}
          {mode === 'signup' && (
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Senha</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirme sua senha"
                value={confirmPassword}
                onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                disabled={isLoading || isRateLimited}
                className={errors.confirmPassword ? 'border-destructive' : ''}
                autoComplete="new-password"
              />
              {errors.confirmPassword && (
                <p className="text-sm text-destructive">{errors.confirmPassword}</p>
              )}
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full"
            disabled={isLoading || isRateLimited}
          >
            {isLoading ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                <span>{mode === 'login' ? 'Entrando...' : 'Criando conta...'}</span>
              </div>
            ) : (
              mode === 'login' ? 'Entrar' : 'Criar Conta'
            )}
          </Button>

          {/* Mode Switch */}
          <div className="text-center text-sm">
            <span className="text-muted-foreground">
              {mode === 'login' ? 'Não tem uma conta?' : 'Já tem uma conta?'}
            </span>
            {' '}
            <Button
              type="button"
              variant="link"
              className="p-0 h-auto font-medium"
              onClick={() => onModeChange(mode === 'login' ? 'signup' : 'login')}
              disabled={isLoading}
            >
              {mode === 'login' ? 'Criar conta' : 'Fazer login'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};