import React from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ValidationRule {
  field: string;
  label: string;
  required: boolean;
  validator?: (value: any) => boolean;
  message?: string;
}

interface AgentFormValidatorProps {
  formData: any;
  validationRules: ValidationRule[];
  showValidation?: boolean;
}

export function AgentFormValidator({ formData, validationRules, showValidation = true }: AgentFormValidatorProps) {
  if (!showValidation) return null;

  const validateField = (rule: ValidationRule) => {
    const value = getNestedValue(formData, rule.field);
    
    if (rule.required && (!value || value.toString().trim() === '')) {
      return { valid: false, message: `${rule.label} é obrigatório` };
    }
    
    if (rule.validator && value && !rule.validator(value)) {
      return { valid: false, message: rule.message || `${rule.label} inválido` };
    }
    
    return { valid: true, message: '' };
  };

  const getNestedValue = (obj: any, path: string) => {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  };

  const results = validationRules.map(rule => ({
    ...rule,
    ...validateField(rule)
  }));

  const errors = results.filter(r => !r.valid);
  const isValid = errors.length === 0;

  return (
    <div className="space-y-3">
      {errors.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              <div className="font-medium">Campos obrigatórios não preenchidos:</div>
              <ul className="list-disc list-inside space-y-1 text-sm">
                {errors.map((error, index) => (
                  <li key={index}>{error.message}</li>
                ))}
              </ul>
            </div>
          </AlertDescription>
        </Alert>
      )}
      
      {isValid && results.some(r => getNestedValue(formData, r.field)) && (
        <Alert className="border-green-200 bg-green-50 text-green-800">
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>
            Todos os campos obrigatórios estão preenchidos
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}