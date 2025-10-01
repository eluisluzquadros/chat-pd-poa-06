import { useMemo } from 'react';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

interface PasswordStrengthIndicatorProps {
  password: string;
}

interface StrengthCheck {
  label: string;
  met: boolean;
}

export const PasswordStrengthIndicator = ({ password }: PasswordStrengthIndicatorProps) => {
  const strength = useMemo(() => {
    if (!password) return { score: 0, level: 'none', checks: [] };

    const checks: StrengthCheck[] = [
      { label: 'Mínimo 8 caracteres', met: password.length >= 8 },
      { label: 'Letra maiúscula', met: /[A-Z]/.test(password) },
      { label: 'Letra minúscula', met: /[a-z]/.test(password) },
      { label: 'Número', met: /\d/.test(password) },
      { label: 'Caractere especial', met: /[!@#$%^&*(),.?":{}|<>]/.test(password) },
    ];

    const metCount = checks.filter(c => c.met).length;
    const score = (metCount / checks.length) * 100;

    let level = 'fraca';
    let color = 'text-destructive';
    if (score >= 80) {
      level = 'forte';
      color = 'text-green-600 dark:text-green-500';
    } else if (score >= 60) {
      level = 'média';
      color = 'text-yellow-600 dark:text-yellow-500';
    }

    return { score, level, color, checks };
  }, [password]);

  if (!password) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Força da senha:</span>
        <span className={`font-medium ${strength.color}`}>
          {strength.level}
        </span>
      </div>
      
      <Progress value={strength.score} className="h-2" />
      
      <div className="space-y-1">
        {strength.checks.map((check, index) => (
          <div key={index} className="flex items-center gap-2 text-xs">
            {check.met ? (
              <CheckCircle2 className="h-3 w-3 text-green-600 dark:text-green-500" />
            ) : (
              <XCircle className="h-3 w-3 text-muted-foreground" />
            )}
            <span className={check.met ? 'text-foreground' : 'text-muted-foreground'}>
              {check.label}
            </span>
          </div>
        ))}
      </div>

      {strength.score < 60 && (
        <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 p-2 rounded">
          <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
          <span>
            Use uma senha forte com pelo menos 8 caracteres, incluindo letras maiúsculas, minúsculas, números e símbolos.
          </span>
        </div>
      )}
    </div>
  );
};
