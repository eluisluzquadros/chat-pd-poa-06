import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { InterestUser } from "@/types/interest";
import { AppRole, APP_ROLES } from "@/types/app";
import { toast } from "sonner";
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

interface ConversionDialogProps {
  interest: InterestUser;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const CreateAccountDialog = ({
  interest,
  open,
  onOpenChange,
  onSuccess,
}: ConversionDialogProps) => {
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<AppRole>("citizen");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetDialog = () => {
    setPassword("");
    setRole("citizen");
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!password) {
      setError("Por favor, defina uma senha");
      return;
    }

    setIsSubmitting(true);

    try {
      // First check if user already exists in auth system
      const { data: existingAuthUsers, error: authCheckError } = await supabase.auth.admin.listUsers();
      
      if (authCheckError) {
        console.error("Error checking for existing auth user:", authCheckError);
      }

      // Manually filter the users to find matching email
      const existingAuthUser = existingAuthUsers?.users?.find((user: any) => 
        user && typeof user === 'object' && 'email' in user && user.email === interest.email
      );

      // Check if the user already exists but isn't linked to interest
      if (existingAuthUser) {
        console.log("Found existing auth user:", existingAuthUser.id);
      }

      console.log("Calling edge function with data:", {
        interest: {
          id: interest.id,
          email: interest.email,
          full_name: interest.full_name,
          cpf: interest.cpf,
          city: interest.city,
          organization: interest.organization,
          organization_size: interest.organization_size,
          newsletter_opt_in: interest.newsletter_opt_in
        },
        password,
        role
      });

      // Call the edge function to create the user
      const { data, error: functionError } = await supabase.functions.invoke('create-user-from-interest', {
        body: {
          interest: {
            id: interest.id,
            email: interest.email,
            full_name: interest.full_name,
            cpf: interest.cpf,
            city: interest.city,
            organization: interest.organization,
            organization_size: interest.organization_size,
            newsletter_opt_in: interest.newsletter_opt_in
          },
          password,
          role
        }
      });

      if (functionError) {
        console.error("Edge function error:", functionError);
        throw new Error(functionError.message || 'Erro ao converter manifestação em usuário');
      }

      if (!data) {
        throw new Error('Resposta vazia do servidor');
      }

      if (data.error) {
        throw new Error(data.error);
      }

      toast.success("Usuário criado com sucesso a partir da manifestação de interesse", { duration: 3000 });
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error converting interest to user:", error);
      setError(error.message || "Erro desconhecido ao converter usuário");
      toast.error(`Erro ao converter manifestação em usuário: ${error.message}`, { duration: 3000 });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      if (!newOpen) {
        resetDialog();
      }
      onOpenChange(newOpen);
    }}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Converter Manifestação de Interesse</DialogTitle>
          <DialogDescription>
            Crie uma conta para {interest.full_name} a partir da manifestação de interesse.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          {error && (
            <div className="bg-red-50 p-3 rounded border border-red-200 text-red-700 text-sm">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label>Nome</Label>
            <div className="p-2 bg-muted rounded">{interest.full_name}</div>
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <div className="p-2 bg-muted rounded">{interest.email}</div>
          </div>
          <div className="space-y-2">
            <Label>Organização</Label>
            <div className="p-2 bg-muted rounded">{interest.organization}</div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Senha*</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Digite uma senha para o usuário"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">Função</Label>
            <Select value={role} onValueChange={(value) => setRole(value as AppRole)}>
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

export default CreateAccountDialog;
