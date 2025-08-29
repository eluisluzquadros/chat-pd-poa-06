
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { APP_ROLES, AppRole } from "@/types/app";
import { CreateUserFormValues } from "../../hooks/useCreateUserForm";

interface RoleAndPreferencesProps {
  formValues: CreateUserFormValues;
  handleRoleChange: (value: AppRole) => void;
  handleNewsletterChange: (checked: boolean) => void;
}

const RoleAndPreferences = ({ 
  formValues, 
  handleRoleChange, 
  handleNewsletterChange 
}: RoleAndPreferencesProps) => {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="role">Função*</Label>
        <Select value={formValues.role} onValueChange={handleRoleChange}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione uma função" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(APP_ROLES).map(([key, label]) => (
              <SelectItem key={key} value={key as AppRole}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="newsletter"
          checked={formValues.newsletter}
          onCheckedChange={handleNewsletterChange}
        />
        <Label htmlFor="newsletter" className="text-sm">
          Desejo receber newsletter e atualizações por email
        </Label>
      </div>
    </>
  );
};

export default RoleAndPreferences;
