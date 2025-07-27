
import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PasswordValues {
  newPassword: string;
  confirmPassword: string;
}

const SecurityTab = () => {
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordValues, setPasswordValues] = useState<PasswordValues>({
    newPassword: "",
    confirmPassword: "",
  });

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordValues({ ...passwordValues, [name]: value });
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordValues.newPassword !== passwordValues.confirmPassword) {
      toast.error("A nova senha e a confirmação não coincidem");
      return;
    }
    
    setIsChangingPassword(true);
    try {
      // Update password using Supabase auth
      const { error } = await supabase.auth.updateUser({
        password: passwordValues.newPassword,
      });
      
      if (error) throw error;
      
      toast.success("Senha atualizada com sucesso");
      
      // Clear password fields
      setPasswordValues({
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error: any) {
      console.error("Error updating password:", error);
      toast.error("Erro ao atualizar senha: " + error.message);
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Segurança</CardTitle>
        <CardDescription>
          Atualize sua senha para manter sua conta segura.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handlePasswordUpdate}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="newPassword">Nova Senha</Label>
            <Input
              id="newPassword"
              name="newPassword"
              type="password"
              value={passwordValues.newPassword}
              onChange={handlePasswordChange}
              required
              className="max-w-md"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              value={passwordValues.confirmPassword}
              onChange={handlePasswordChange}
              required
              className="max-w-md"
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={isChangingPassword}>
            {isChangingPassword ? "Atualizando..." : "Atualizar Senha"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};

export default SecurityTab;
