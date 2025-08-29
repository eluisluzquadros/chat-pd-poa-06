
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { UserAccount } from "@/types/user";
import { toast } from "sonner";

interface DeleteUserDialogProps {
  user: UserAccount;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserDeleted: () => void;
}

const DeleteUserDialog = ({
  user,
  open,
  onOpenChange,
  onUserDeleted,
}: DeleteUserDialogProps) => {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      // First delete from user_accounts (this will cascade to user_roles)
      const { error: accountError } = await supabase
        .from("user_accounts")
        .delete()
        .eq("id", user.id);

      if (accountError) throw accountError;

      // Then delete the auth user if we have a user_id
      if (user.user_id) {
        const { error: authError } = await supabase.auth.admin.deleteUser(
          user.user_id
        );

        if (authError) throw authError;
      }

      toast.success("Usuário excluído com sucesso");
      onUserDeleted();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error deleting user:", error);
      toast.error(`Erro ao excluir usuário: ${error.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
          <AlertDialogDescription>
            Você está prestes a excluir o usuário <strong>{user.full_name}</strong>. Esta ação não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? "Excluindo..." : "Excluir"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteUserDialog;
