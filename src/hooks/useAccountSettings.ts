
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { UserProfile } from "@/types/user";
import { useAuth } from "@/context/AuthContext";

export const useAccountSettings = () => {
  const { isAuthenticated } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [userEmail, setUserEmail] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [formValues, setFormValues] = useState({
    fullName: "",
    firstName: "",
    lastName: "",
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      setIsLoading(true);
      try {
        // Get the current user
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          throw new Error("Usuário não autenticado");
        }
        
        // Fetch profile data
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();
          
        if (error) throw error;
        
        // Store the email separately since it's not part of the UserProfile type
        setUserEmail(user.email || "");
        setProfile(data);
        setFormValues({
          fullName: data.full_name || "",
          firstName: data.full_name?.split(' ')[0] || "",
          lastName: data.full_name?.split(' ').slice(1).join(' ') || "",
        });
      } catch (error: any) {
        console.error("Error fetching profile:", error);
        toast.error("Erro ao carregar perfil: " + error.message);
      } finally {
        setIsLoading(false);
      }
    };
    
    if (isAuthenticated) {
      fetchProfile();
    }
  }, [isAuthenticated]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormValues({ ...formValues, [name]: value });
  };

  const setIsSavingState = (state: boolean) => {
    setIsSaving(state);
  };

  return {
    profile,
    userEmail,
    isLoading,
    formValues,
    isSaving,
    handleInputChange,
    setIsSavingState
  };
};
