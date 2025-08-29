
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { OrganizationSize, InterestManifestation, InterestFormValues } from "@/types/interest";
import { toast } from "sonner";

export const useInterestForm = (onClose: () => void) => {
  const [isLoading, setIsLoading] = useState(false);
  const [formValues, setFormValues] = useState<InterestFormValues>({
    fullName: "",
    email: "",
    newsletter: true
  });
  
  const updateField = (field: keyof InterestFormValues, value: any) => {
    setFormValues(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Create the interest manifestation object with required fields
      const newManifestation = {
        full_name: formValues.fullName,
        email: formValues.email,
        newsletter_opt_in: formValues.newsletter,
        status: 'pending',
        account_created: false
      };

      // Check if the user exists in the auth system
      const { data: authUserData, error: authError } = await supabase.auth.admin.listUsers();

      let authUserExists = false;
      if (authError) {
        console.error("Error checking auth user:", authError);
      } else if (authUserData?.users) {
        // Manually filter to find users with matching email
        const existingAuthUser = authUserData.users.find((user: any) => 
          user && typeof user === 'object' && 'email' in user && user.email === formValues.email
        );
        if (existingAuthUser) {
          authUserExists = true;
          console.log("Auth user exists:", existingAuthUser);
        }
      }

      // Check for duplicate email in interest manifestations
      const { data: existingEmail, error: emailCheckError } = await supabase
        .from('interest_manifestations')
        .select('id')
        .eq('email', formValues.email)
        .maybeSingle();

      if (emailCheckError) {
        console.error("Error checking for existing email:", emailCheckError);
      }

      // Check if the email exists in user_accounts
      const { data: existingAccount, error: accountCheckError } = await supabase
        .from('user_accounts')
        .select('id')
        .eq('email', formValues.email)
        .maybeSingle();

      if (accountCheckError) {
        console.error("Error checking for existing account:", accountCheckError);
      }

      // Determine if user already exists in any form
      const userAlreadyExists = authUserExists || !!existingEmail || !!existingAccount;

      if (userAlreadyExists) {
        const destination = existingEmail ? 'manifestações de interesse' : 
                           (existingAccount ? 'contas de usuário' : 'sistema de autenticação');
        throw new Error(`Este email já está cadastrado em ${destination}`);
      }

      // Insert the new interest manifestation
      const { error: insertError } = await supabase
        .from('interest_manifestations')
        .insert(newManifestation);

      if (insertError) {
        console.error("Error inserting interest manifestation:", insertError);
        
        // Handle specific database constraint errors
        if (insertError.code === '23505') { // Unique violation
          if (insertError.message.includes('email')) {
            throw new Error('Email já cadastrado');
          } else if (insertError.message.includes('cpf')) {
            throw new Error('CPF já cadastrado');
          }
        }
        
        throw insertError;
      }

      toast.success("Interesse registrado com sucesso! Entraremos em contato em breve.");
      // Reset the form and close it
      setFormValues({
        fullName: "",
        email: "",
        newsletter: true
      });
      onClose();
    } catch (error: any) {
      console.error("[Interest] Submit error:", error);
      
      let errorMessage = "Erro ao registrar interesse. Tente novamente.";
      
      if (error.message) {
        if (error.message.includes('Email já cadastrado') || 
            error.message.includes('CPF já cadastrado') ||
            error.message.includes('Este email já está cadastrado')) {
          errorMessage = error.message;
        } else if (error.code === '23505') {
          if (error.message.includes('cpf')) {
            errorMessage = "Este CPF já está cadastrado em nossa base.";
          } else if (error.message.includes('email')) {
            errorMessage = "Este email já está cadastrado em nossa base.";
          }
        }
      }

      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    formValues,
    isLoading,
    updateField,
    handleSubmit
  };
};
