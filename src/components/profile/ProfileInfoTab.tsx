
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ProfileInfoTabProps {
  formValues: {
    fullName: string;
    firstName: string;
    lastName: string;
  };
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleProfileUpdate: (e: React.FormEvent) => void;
  isSaving: boolean;
}

const ProfileInfoTab = ({
  formValues,
  handleInputChange,
  handleProfileUpdate,
  isSaving
}: ProfileInfoTabProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Informações Pessoais</CardTitle>
        <CardDescription>
          Atualize suas informações pessoais. Estas informações serão exibidas publicamente.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleProfileUpdate}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Nome Completo</Label>
            <Input
              id="fullName"
              name="fullName"
              value={formValues.fullName}
              onChange={handleInputChange}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">Nome</Label>
              <Input
                id="firstName"
                name="firstName"
                value={formValues.firstName}
                onChange={handleInputChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Sobrenome</Label>
              <Input
                id="lastName"
                name="lastName"
                value={formValues.lastName}
                onChange={handleInputChange}
              />
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};

export default ProfileInfoTab;
