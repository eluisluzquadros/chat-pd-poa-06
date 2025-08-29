
import { useState, useCallback, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { LogIn, Eye, EyeOff, AlertTriangle } from "lucide-react";

interface AuthFormProps {
  isLoading: boolean;
  onSubmit: (email: string, password: string) => Promise<void>;
}

export const AuthForm = ({ isLoading, onSubmit }: AuthFormProps) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState({
    email: false,
    password: false
  });
  const [formErrors, setFormErrors] = useState({
    email: "",
    password: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Refs para controlar timeouts
  const validationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const submitTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Validação melhorada de email
  const validateEmail = useCallback((value: string) => {
    if (!value.trim()) {
      return "Email é obrigatório";
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value.trim())) {
      return "Email inválido";
    }
    
    return "";
  }, []);
  
  // Validação melhorada de senha
  const validatePassword = useCallback((value: string) => {
    if (!value) {
      return "Senha é obrigatória";
    }
    
    if (value.length < 6) {
      return "Senha deve ter pelo menos 6 caracteres";
    }
    
    return "";
  }, []);
  
  // Validação com debounce
  const debouncedValidation = useCallback((field: 'email' | 'password', value: string) => {
    if (validationTimeoutRef.current) {
      clearTimeout(validationTimeoutRef.current);
    }
    
    validationTimeoutRef.current = setTimeout(() => {
      if (touched[field]) {
        const error = field === 'email' ? validateEmail(value) : validatePassword(value);
        setFormErrors(prev => ({ ...prev, [field]: error }));
      }
    }, 300);
  }, [touched, validateEmail, validatePassword]);
  
  // Efeito para validação com debounce
  useEffect(() => {
    debouncedValidation('email', email);
  }, [email, debouncedValidation]);
  
  useEffect(() => {
    debouncedValidation('password', password);
  }, [password, debouncedValidation]);
  
  // Limpar timeouts ao desmontar
  useEffect(() => {
    return () => {
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
      }
      if (submitTimeoutRef.current) {
        clearTimeout(submitTimeoutRef.current);
      }
    };
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Evitar múltiplos submits
    if (isSubmitting || isLoading) {
      return;
    }
    
    // Marcar todos os campos como tocados para mostrar erros
    setTouched({ email: true, password: true });
    
    // Validar todos os campos
    const emailError = validateEmail(email);
    const passwordError = validatePassword(password);
    
    setFormErrors({
      email: emailError,
      password: passwordError
    });
    
    // Não submeter se houver erros
    if (emailError || passwordError) {
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // Timeout de segurança para evitar loading infinito
      submitTimeoutRef.current = setTimeout(() => {
        setIsSubmitting(false);
      }, 10000);
      
      await onSubmit(email.trim(), password);
      
      // Limpar timeout se o submit foi bem-sucedido
      if (submitTimeoutRef.current) {
        clearTimeout(submitTimeoutRef.current);
      }
    } catch (error) {
      console.error("Erro no submit do formulário:", error);
    } finally {
      setIsSubmitting(false);
    }
  }, [email, password, isLoading, onSubmit, validateEmail, validatePassword, isSubmitting]);

  const handleBlur = (field: 'email' | 'password') => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  // Determinar quando o botão deve estar desabilitado
  const isButtonDisabled = isLoading || isSubmitting || !email.trim() || !password;
  const showSpinner = isLoading || isSubmitting;

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-6" noValidate>
      <div className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="email" className={formErrors.email ? "text-destructive" : ""}>
            Email
          </Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => handleBlur('email')}
            required
            className={`bg-background border-gray-200 focus:border-primary transition-colors ${
              formErrors.email ? "border-destructive focus:border-destructive" : ""
            }`}
            placeholder="seu@email.com"
            disabled={showSpinner}
            autoComplete="email"
            autoFocus
          />
          {touched.email && formErrors.email && (
            <p className="mt-1 text-sm text-destructive animate-fade-in">
              {formErrors.email}
            </p>
          )}
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="password" className={formErrors.password ? "text-destructive" : ""}>
            Senha
          </Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={() => handleBlur('password')}
              required
              className={`bg-background border-gray-200 focus:border-primary pr-10 transition-colors ${
                formErrors.password ? "border-destructive focus:border-destructive" : ""
              }`}
              placeholder="********"
              disabled={showSpinner}
              autoComplete="current-password"
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
              onClick={() => setShowPassword(!showPassword)}
              tabIndex={-1}
              disabled={showSpinner}
              aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {touched.password && formErrors.password && (
            <p className="mt-1 text-sm text-destructive animate-fade-in">
              {formErrors.password}
            </p>
          )}
        </div>
      </div>

      <Button
        type="submit"
        className="w-full bg-primary hover:bg-primary/90 text-white font-medium py-6 mt-6 transition-all duration-300 disabled:opacity-50"
        disabled={isButtonDisabled}
      >
        {showSpinner ? (
          <span className="flex items-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></span>
            Entrando...
          </span>
        ) : (
          <>
            <LogIn className="mr-2 h-5 w-5" />
            Entrar
          </>
        )}
      </Button>
    </form>
  );
};
