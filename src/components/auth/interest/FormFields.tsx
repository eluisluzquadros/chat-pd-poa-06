
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, User } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { InterestFormValues } from "@/types/interest";

interface FormFieldsProps {
  formValues: InterestFormValues;
  isLoading: boolean;
  updateField: (field: keyof InterestFormValues, value: any) => void;
}

export const FormFields = ({ formValues, isLoading, updateField }: FormFieldsProps) => {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="fullName">Nome Completo</Label>
        <div className="relative">
          <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            id="fullName"
            value={formValues.fullName}
            onChange={(e) => updateField("fullName", e.target.value)}
            required
            className="bg-secondary pl-9"
            placeholder="Seu nome completo"
            disabled={isLoading}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            id="email"
            type="email"
            value={formValues.email}
            onChange={(e) => updateField("email", e.target.value)}
            required
            className="bg-secondary pl-9"
            placeholder="seu@email.com"
            disabled={isLoading}
          />
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="newsletter"
          checked={formValues.newsletter}
          onCheckedChange={(checked) => updateField("newsletter", checked as boolean)}
        />
        <Label htmlFor="newsletter" className="text-sm">
          Desejo receber newsletter e atualizações por email
        </Label>
      </div>
    </div>
  );
};
