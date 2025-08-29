
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface SecurityTabProps {
  passwordValues: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  };
  handlePasswordChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handlePasswordUpdate: (e: React.FormEvent) => void;
  isChangingPassword: boolean;
}

const SecurityTab = ({
  passwordValues,
  handlePasswordChange,
  handlePasswordUpdate,
  isChangingPassword
}: SecurityTabProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Alterar Senha</CardTitle>
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
