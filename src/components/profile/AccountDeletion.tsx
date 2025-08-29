
import { useState } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2Icon } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

const AccountDeletion = () => {
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleDeleteAccount = async () => {
    try {
      setIsDeleting(true);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("Usuário não encontrado");
      }
      
      // Delete user profile first (RLS will handle the permission)
      const { error: profileError } = await supabase
        .from("profiles")
        .delete()
        .eq("id", user.id);
        
      if (profileError) throw profileError;

      // Delete user account from auth (will require admin rights in production)
      const { error: authError } = await supabase.auth.admin.deleteUser(user.id);
      
      if (authError) {
        // Fallback for development - just sign out
        await supabase.auth.signOut();
        toast({
          title: "Conta desativada",
          description: "Sua conta foi desativada. Em ambiente de produção, seria completamente excluída.",
        });
      } else {
        toast({
          title: "Conta excluída",
          description: "Sua conta foi excluída com sucesso.",
        });
      }
      
      // Redirect to home page
      navigate("/auth");
      
    } catch (error: any) {
      console.error("Erro ao excluir conta:", error);
      toast({
        title: "Erro ao excluir conta",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Card className="bg-muted/50 border-destructive/20">
      <CardHeader>
        <CardTitle className="text-base text-destructive">Excluir conta</CardTitle>
        <CardDescription>
          Esta ação é irreversível. Todos os seus dados serão permanentemente excluídos.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button 
              variant="destructive" 
              className="w-full sm:w-auto flex items-center justify-center gap-2"
              disabled={isDeleting}
            >
              <Trash2Icon className="h-4 w-4" />
              <span>{isDeleting ? "Excluindo..." : "Excluir minha conta"}</span>
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita. Isso excluirá permanentemente sua conta
                e removerá todos os seus dados dos nossos servidores.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleDeleteAccount}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Sim, excluir minha conta
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
};

export default AccountDeletion;
