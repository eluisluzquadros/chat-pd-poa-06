
import { Header } from "@/components/Header";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import ProfileInfoTab from "@/components/profile/ProfileInfoTab";
import SecurityTab from "@/components/profile/SecurityTab";
import ProfileLoading from "@/components/profile/ProfileLoading";
import AccountDeletion from "@/components/profile/AccountDeletion";
import { useProfileSettings } from "@/hooks/useProfileSettings";

const Profile = () => {
  const {
    isLoading,
    formValues,
    passwordValues,
    isSaving,
    isChangingPassword,
    handleInputChange,
    handlePasswordChange,
    handleProfileUpdate,
    handlePasswordUpdate
  } = useProfileSettings();

  return (
    <>
      <Header />
      <div className="container mx-auto pt-24 pb-10">
        <h1 className="text-2xl font-bold mb-6">Meu Perfil</h1>
        
        {isLoading ? (
          <ProfileLoading />
        ) : (
          <Tabs defaultValue="profile" className="w-full max-w-2xl mx-auto">
            <TabsList className="mb-6">
              <TabsTrigger value="profile">Informações Pessoais</TabsTrigger>
              <TabsTrigger value="security">Segurança</TabsTrigger>
            </TabsList>
            
            <TabsContent value="profile">
              <ProfileInfoTab 
                formValues={formValues}
                handleInputChange={handleInputChange}
                handleProfileUpdate={handleProfileUpdate}
                isSaving={isSaving}
              />
            </TabsContent>
            
            <TabsContent value="security">
              <div className="space-y-6">
                <SecurityTab 
                  passwordValues={passwordValues}
                  handlePasswordChange={handlePasswordChange}
                  handlePasswordUpdate={handlePasswordUpdate}
                  isChangingPassword={isChangingPassword}
                />
                <AccountDeletion />
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </>
  );
};

export default Profile;
