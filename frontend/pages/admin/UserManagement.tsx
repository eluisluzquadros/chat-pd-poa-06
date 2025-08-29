
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import UserTable from "./components/UserTable";
import SearchBar from "./components/SearchBar";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import CreateUserDialog from "./components/CreateUserDialog";
import { Header } from "@/components/Header";
import { UserAccount } from "@/types/user";
import InterestConversionPanel from "./components/InterestConversionPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

const UserManagement = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("users");

  const { data: users = [], refetch: refetchUsers } = useQuery({
    queryKey: ["user_accounts", searchTerm],
    queryFn: async () => {
      try {
        let query = supabase
          .from("user_accounts")
          .select("*");

        if (searchTerm) {
          query = query.or(
            `full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`
          );
        }

        const { data, error } = await query;

        if (error) {
          console.error("Error fetching users:", error);
          toast.error("Erro ao carregar usuários");
          return [];
        }

        return data as UserAccount[];
      } catch (error) {
        console.error("Failed to fetch users:", error);
        toast.error("Erro ao carregar usuários");
        return [];
      }
    },
  });

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
  };

  const handleUserUpdated = () => {
    refetchUsers();
  };

  const handleUserDeleted = () => {
    refetchUsers();
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="container mx-auto pt-24 pb-10 flex-grow">
        <h1 className="text-2xl font-bold mb-6">Gerenciar Usuários</h1>

        <Tabs defaultValue="users" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="users">Usuários</TabsTrigger>
            <TabsTrigger value="interests">Manifestações de Interesse</TabsTrigger>
          </TabsList>
          
          <TabsContent value="users">
            <div className="flex justify-between items-center mb-6">
              <SearchBar 
                searchTerm={searchTerm} 
                onSearchChange={handleSearchChange} 
                placeholder="Buscar usuários..."
              />
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Usuário
              </Button>
            </div>

            <UserTable
              users={users}
              onUserUpdated={handleUserUpdated}
              onUserDeleted={handleUserDeleted}
            />
          </TabsContent>
          
          <TabsContent value="interests">
            <InterestConversionPanel onUserCreated={handleUserUpdated} />
          </TabsContent>
        </Tabs>

        <CreateUserDialog
          open={isCreateDialogOpen}
          onOpenChange={setIsCreateDialogOpen}
          onUserCreated={handleUserUpdated}
        />
      </div>
    </div>
  );
};

export default UserManagement;
