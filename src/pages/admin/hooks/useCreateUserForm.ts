
import { useState } from "react";
import { AppRole } from "@/types/app";
import { OrganizationSize } from "@/types/interest";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export interface CreateUserFormValues {
  fullName: string;
  email: string;
  password: string;
  newsletter: boolean;
  role: AppRole;
}

const initialFormValues: CreateUserFormValues = {
  fullName: "",
  email: "",
  password: "",
  newsletter: false,
  role: "citizen",
};

export function useCreateUserForm(onSuccess: () => void, onOpenChange: (open: boolean) => void) {
  const [formValues, setFormValues] = useState<CreateUserFormValues>(initialFormValues);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setFormValues(initialFormValues);
    setError(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormValues({ ...formValues, [name]: value });
  };

  const handleRoleChange = (value: AppRole) => {
    setFormValues({ ...formValues, role: value });
  };


  const handleNewsletterChange = (checked: boolean) => {
    setFormValues({ ...formValues, newsletter: checked });
  };

  const validateForm = (): boolean => {
    if (!formValues.fullName || !formValues.email || !formValues.password) {
      setError("Por favor, preencha os campos obrigatórios (nome, email, senha)");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      console.log("Calling create-user edge function...");
      
      // Call the edge function to create the user with elevated privileges
      const { data, error: functionError } = await supabase.functions.invoke('create-user', {
        body: {
          fullName: formValues.fullName,
          email: formValues.email,
          password: formValues.password,
          role: formValues.role
        }
      });

      if (functionError) {
        console.error("Edge function error:", functionError);
        throw new Error(functionError.message || 'Erro ao criar usuário');
      }

      if (!data) {
        throw new Error('Resposta vazia do servidor');
      }

      if (data.error) {
        throw new Error(data.error);
      }

      console.log("User creation complete!");
      
      toast.success("Usuário criado com sucesso", { duration: 3000 });
      resetForm();
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error creating user:", error);
      setError(error.message || "Erro desconhecido ao criar usuário");
      toast.error(`Erro ao criar usuário: ${error.message}`, { duration: 3000 });
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    formValues,
    isSubmitting,
    error,
    resetForm,
    handleInputChange,
    handleRoleChange,
    
    handleNewsletterChange,
    handleSubmit
  };
}
