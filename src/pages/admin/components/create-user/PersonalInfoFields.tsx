
import { User, Mail } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CreateUserFormValues } from "../../hooks/useCreateUserForm";

interface PersonalInfoFieldsProps {
  formValues: CreateUserFormValues;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const PersonalInfoFields = ({ formValues, handleInputChange }: PersonalInfoFieldsProps) => {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="fullName">Nome Completo*</Label>
        <div className="relative">
          <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            id="fullName"
            name="fullName"
            value={formValues.fullName}
            onChange={handleInputChange}
            className="pl-9"
            placeholder="Nome completo"
            required
          />
        </div>
      </div>


      <div className="space-y-2">
        <Label htmlFor="email">Email*</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            id="email"
            name="email"
            type="email"
            value={formValues.email}
            onChange={handleInputChange}
            className="pl-9"
            placeholder="email@exemplo.com"
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Senha*</Label>
        <Input
          id="password"
          name="password"
          type="password"
          value={formValues.password}
          onChange={handleInputChange}
          required
        />
      </div>
    </>
  );
};

export default PersonalInfoFields;
