
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { UserAccount } from "@/types/user";
import { toast } from "sonner";
import { APP_ROLES, AppRole } from "@/types/app";

interface EditUserDialogProps {
  user: UserAccount;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserUpdated: () => void;
}

const EditUserDialog = ({
  user,
  open,
  onOpenChange,
  onUserUpdated,
}: EditUserDialogProps) => {
  const [formValues, setFormValues] = useState({
    fullName: "",
    email: "",
    role: "",
    active: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      setFormValues({
        fullName: user.full_name,
        email: user.email,
        role: user.role,
        active: user.is_active,
      });
    }
  }, [user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormValues({ ...formValues, [name]: value });
  };

  const handleRoleChange = (value: string) => {
    setFormValues({ ...formValues, role: value });
  };

  const handleActiveChange = (checked: boolean) => {
    setFormValues({ ...formValues, active: checked });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formValues.fullName || !formValues.email) {
      toast.error("Por favor, preencha todos os campos obrigatórios");
      return;
    }

    setIsSubmitting(true);

    try {
      // Update user account
      const { error: accountError } = await supabase
        .from("user_accounts")
        .update({
          full_name: formValues.fullName,
          email: formValues.email,
          role: formValues.role,
          is_active: formValues.active,
        })
        .eq("id", user.id);

      if (accountError) throw accountError;

      // Update user role if user_id exists and role has changed
      if (user.user_id && user.role !== formValues.role) {
        // Check if role record exists
        const { data: existingRole } = await supabase
          .from("user_roles")
          .select("*")
          .eq("user_id", user.user_id)
          .single();

        if (existingRole) {
          // Update existing role
          const { error: roleError } = await supabase
            .from("user_roles")
            .update({
              role: formValues.role as any,
            })
            .eq("user_id", user.user_id);

          if (roleError) throw roleError;
        } else {
          // Insert new role
          const { error: insertRoleError } = await supabase
            .from("user_roles")
            .insert({
              user_id: user.user_id,
              role: formValues.role as any,
            });

          if (insertRoleError) throw insertRoleError;
        }
      }

      toast.success("Usuário atualizado com sucesso");
      onUserUpdated();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error updating user:", error);
      toast.error(`Erro ao atualizar usuário: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Editar Usuário</DialogTitle>
          <DialogDescription>
            Atualize as informações do usuário {user.full_name}.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Nome Completo*</Label>
            <Input
              id="fullName"
              name="fullName"
              value={formValues.fullName}
              onChange={handleInputChange}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email*</Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={formValues.email}
              onChange={handleInputChange}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">Função</Label>
            <Select value={formValues.role} onValueChange={handleRoleChange}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma função" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(APP_ROLES).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              id="active"
              checked={formValues.active}
              onCheckedChange={handleActiveChange}
            />
            <Label htmlFor="active">Usuário Ativo</Label>
          </div>

          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditUserDialog;
