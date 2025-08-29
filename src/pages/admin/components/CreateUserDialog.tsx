
import { useCreateUserForm } from "../hooks/useCreateUserForm";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import PersonalInfoFields from "./create-user/PersonalInfoFields";
import RoleAndPreferences from "./create-user/RoleAndPreferences";
import ErrorDisplay from "./create-user/ErrorDisplay";

interface CreateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserCreated: () => void;
}

const CreateUserDialog = ({
  open,
  onOpenChange,
  onUserCreated,
}: CreateUserDialogProps) => {
  const { 
    formValues,
    isSubmitting,
    error,
    resetForm,
    handleInputChange,
    handleRoleChange,
    handleNewsletterChange,
    handleSubmit
  } = useCreateUserForm(onUserCreated, onOpenChange);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) resetForm();
      onOpenChange(isOpen);
    }}>
      <DialogContent className="sm:max-w-[470px]">
        <DialogHeader>
          <DialogTitle>Criar Novo Usuário</DialogTitle>
          <DialogDescription>
            Preencha os campos abaixo para criar um novo usuário.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <ErrorDisplay error={error} />
          
          <PersonalInfoFields 
            formValues={formValues} 
            handleInputChange={handleInputChange} 
          />
          
          <RoleAndPreferences 
            formValues={formValues}
            handleRoleChange={handleRoleChange}
            handleNewsletterChange={handleNewsletterChange}
          />

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
              {isSubmitting ? "Criando..." : "Criar Usuário"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateUserDialog;
