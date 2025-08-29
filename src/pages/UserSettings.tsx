
import { Header } from "@/components/Header";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useProfileSettings } from "@/hooks/useProfileSettings";
import { useAccountSettings } from "@/hooks/useAccountSettings";
import ProfileInfoTab from "@/components/profile/ProfileInfoTab";
import SecurityTab from "@/components/profile/SecurityTab";
import ProfileLoading from "@/components/profile/ProfileLoading";
import AccountDeletion from "@/components/profile/AccountDeletion";
import AccountInfoTab from "@/components/account/AccountInfoTab";
import TutorialsTab from "@/components/account/TutorialsTab";


const UserSettings = () => {
  // Profile settings hook
  const {
    isLoading: profileIsLoading,
    formValues: profileFormValues,
    passwordValues,
    isSaving: profileIsSaving,
    isChangingPassword,
    handleInputChange: handleProfileInputChange,
    handlePasswordChange,
    handleProfileUpdate,
    handlePasswordUpdate
  } = useProfileSettings();

  // Account settings hook
  const {
    profile,
    userEmail,
    isLoading: accountIsLoading,
    formValues: accountFormValues,
    isSaving: accountIsSaving,
    handleInputChange: handleAccountInputChange
  } = useAccountSettings();

  const isLoading = profileIsLoading || accountIsLoading;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="container mx-auto pt-24 pb-10 flex-grow">
        <h1 className="text-2xl font-bold mb-6">Meu Perfil</h1>
        
        {isLoading ? (
          <ProfileLoading />
        ) : (
          <Tabs defaultValue="personal" className="w-full">
            <TabsList className="mb-6">
              <TabsTrigger value="personal">Informações Pessoais</TabsTrigger>
              <TabsTrigger value="account">Conta</TabsTrigger>
              <TabsTrigger value="security">Segurança</TabsTrigger>
              <TabsTrigger value="tutorials">Tutoriais</TabsTrigger>
            </TabsList>
            
            <TabsContent value="personal">
              <ProfileInfoTab 
                formValues={profileFormValues}
                handleInputChange={handleProfileInputChange}
                handleProfileUpdate={handleProfileUpdate}
                isSaving={profileIsSaving}
              />
            </TabsContent>

            <TabsContent value="account">
              <AccountInfoTab 
                profile={profile}
                userEmail={userEmail}
                formValues={accountFormValues}
                handleInputChange={handleAccountInputChange}
                isSaving={accountIsSaving}
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

            <TabsContent value="tutorials">
              <TutorialsTab />
            </TabsContent>
          </Tabs>
        )}
      </div>
      
    </div>
  );
};

export default UserSettings;
