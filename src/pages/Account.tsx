
import { Header } from "@/components/Header";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { useAccountSettings } from "@/hooks/useAccountSettings";
import AccountSidebar from "@/components/account/AccountSidebar";
import AccountInfoTab from "@/components/account/AccountInfoTab";
import SecurityTab from "@/components/account/SecurityTab";
import TutorialsTab from "@/components/account/TutorialsTab";

const Account = () => {
  const {
    profile,
    userEmail,
    isLoading,
    formValues,
    isSaving,
    handleInputChange,
    setIsSavingState
  } = useAccountSettings();

  if (isLoading) {
    return (
      <>
        <Header />
        <div className="container mx-auto pt-24 pb-10">
          <div className="flex justify-center items-center h-64">
            <p>Carregando configurações...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="container mx-auto pt-24 pb-10">
        <div className="flex flex-col">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Sidebar */}
            <div className="col-span-1">
              <AccountSidebar />
            </div>

            {/* Main Content */}
            <div className="col-span-1 md:col-span-3">
              <Tabs defaultValue="account" className="w-full">
                <TabsContent value="account">
                  <AccountInfoTab 
                    profile={profile}
                    userEmail={userEmail}
                    formValues={formValues}
                    handleInputChange={handleInputChange}
                    isSaving={isSaving}
                  />
                </TabsContent>

                <TabsContent value="security" id="security-tab">
                  <SecurityTab />
                </TabsContent>

                <TabsContent value="tutorials">
                  <TutorialsTab />
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Account;
