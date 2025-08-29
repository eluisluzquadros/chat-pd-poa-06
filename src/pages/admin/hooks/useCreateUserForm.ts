
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
      console.log("Checking if user already exists...");
      
      // Check if user already exists in auth system
      const { data: authUsersData, error: authCheckError } = await supabase.auth.admin.listUsers();
      
      if (authCheckError) {
        console.error("Error checking auth system:", authCheckError);
      } else {
        // Manually filter to find users with matching email
        const existingAuthUser = authUsersData?.users?.find((user: any) => 
          user && typeof user === 'object' && 'email' in user && user.email === formValues.email
        );
        if (existingAuthUser) {
          throw new Error("Este email já está registrado no sistema de autenticação");
        }
      }
      
      // Check if user already exists in user accounts
      const { data: existingUsers, error: checkError } = await supabase
        .from("user_accounts")
        .select("email")
        .eq("email", formValues.email)
        .limit(1);

      if (checkError) {
        console.error("Error checking existing user:", checkError);
      } else if (existingUsers && existingUsers.length > 0) {
        throw new Error("Este email já está registrado no sistema");
      }

      // Check if user already exists in interest manifestations
      const { data: existingInterests, error: interestCheckError } = await supabase
        .from("interest_manifestations")
        .select("email")
        .eq("email", formValues.email)
        .limit(1);
        
      if (interestCheckError) {
        console.error("Error checking existing interest:", interestCheckError);
      } else if (existingInterests && existingInterests.length > 0) {
        throw new Error("Este email já possui uma manifestação de interesse registrada");
      }

      console.log("Creating auth user...");
      
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formValues.email,
        password: formValues.password,
        options: {
          data: {
            full_name: formValues.fullName,
          },
          emailRedirectTo: window.location.origin + '/auth',
        }
      });

      if (authError) {
        console.error("Auth error:", authError);
        if (authError.message.includes("User already registered")) {
          throw new Error("Este email já está registrado no sistema de autenticação");
        }
        throw authError;
      }

      if (!authData?.user) {
        throw new Error("Falha ao criar usuário de autenticação");
      }

      console.log("Auth user created, ID:", authData.user.id);
      console.log("Creating user account...");
      
      // Create user account with the auth user's ID
      const { error: accountError } = await supabase
        .from("user_accounts")
        .insert({
          user_id: authData.user.id,
          email: formValues.email,
          full_name: formValues.fullName,
          newsletter: formValues.newsletter,
          role: formValues.role,
          active: true
        });

      if (accountError) {
        console.error("Error creating account:", accountError);
        throw accountError;
      }

      console.log("User account created, creating profile...");
      
      // Create profile
      const { error: profileError } = await supabase
        .from("profiles")
        .insert({
          id: authData.user.id,
          full_name: formValues.fullName,
        });

      if (profileError) {
        console.error("Error creating profile:", profileError);
        // Continue anyway - profile might be created by trigger
      }

      console.log("Setting user role...");
      
      // To avoid RLS policy violations, we'll use a Supabase Function to set the user role
      // instead of directly inserting into the user_roles table
      const { data: userRoleData, error: userRoleError } = await supabase.functions.invoke('set-user-role', {
        body: {
          userId: authData.user.id,
          role: formValues.role
        }
      });

      if (userRoleError) {
        console.error("Error setting role:", userRoleError);
        throw userRoleError;
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
