
import { useState } from "react";
import { UserProfile } from "@/types/user";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LockIcon, UserIcon, Trash2Icon } from "lucide-react";
import AccountCard from "./AccountCard";
import DangerZone from "./DangerZone";

interface AccountInfoTabProps {
  profile: UserProfile | null;
  userEmail: string;
  formValues: {
    fullName: string;
    firstName: string;
    lastName: string;
  };
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isSaving: boolean;
}

const AccountInfoTab = ({
  profile,
  userEmail,
  formValues,
  handleInputChange,
  isSaving
}: AccountInfoTabProps) => {
  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!profile) return;
    
    try {
      // Update the profile
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: formValues.fullName,
          first_name: formValues.firstName,
          last_name: formValues.lastName,
        })
        .eq("id", profile.id);
        
      if (error) throw error;
      
      // Also update user_accounts if it exists
      await supabase
        .from("user_accounts")
        .update({
          full_name: formValues.fullName,
        })
        .eq("user_id", profile.id);
      
      toast.success("Perfil atualizado com sucesso");
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast.error("Erro ao atualizar perfil: " + error.message);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-2xl">Conta</CardTitle>
            <CardDescription>
              Gerencie suas informações pessoais
            </CardDescription>
          </div>
          <div className="flex flex-col items-center">
            <div className="relative mb-2">
              <Avatar className="h-24 w-24">
                <AvatarImage src={undefined} alt={profile?.full_name || "User"} />
                <AvatarFallback className="text-xl">
                  {profile?.full_name ? getInitials(profile.full_name) : "U"}
                </AvatarFallback>
              </Avatar>
              <Button 
                size="icon" 
                variant="secondary" 
                className="absolute -bottom-2 -right-2 rounded-full h-8 w-8 p-1"
              >
                <UserIcon className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm font-medium">Proprietário</p>
          </div>
        </div>
      </CardHeader>
      <form onSubmit={handleProfileUpdate}>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="fullName">Nome</Label>
            <Input
              id="fullName"
              name="fullName"
              value={formValues.fullName}
              onChange={handleInputChange}
              className="max-w-md"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="flex items-center max-w-md">
              <Input
                id="email"
                value={userEmail}
                readOnly
                className="flex-1"
              />
              <Button 
                size="icon" 
                variant="ghost" 
                type="button"
                className="ml-2"
                disabled
              >
                <LockIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <AccountCard 
              title="Alterar senha" 
              buttonText="Alterar senha"
              buttonIcon={<LockIcon className="h-4 w-4" />}
              onClick={() => document.getElementById('security-tab')?.click()}
            />

            <AccountCard 
              title="Transferir propriedade" 
              buttonText="Transferir"
              buttonIcon={<UserIcon className="h-4 w-4" />}
              disabled
            />
          </div>

          <Separator className="my-6" />

          <DangerZone />
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? "Salvando..." : "Salvar alterações"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};

export default AccountInfoTab;
