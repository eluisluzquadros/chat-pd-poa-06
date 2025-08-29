
import { Header } from "@/components/Header";
import { AuthSyncComponent } from "@/components/AuthSyncComponent";
import { useAuth } from "@/context/AuthContext";
import { Hero } from "@/components/home/Hero";
import { Features } from "@/components/home/Features";
import { CompaniesSection } from "@/components/home/CompaniesSection";
import { TestimonialsGrid } from "@/components/home/TestimonialsGrid";
import { WorkShowcase } from "@/components/home/WorkShowcase";
import { UrbanNewsBanner } from "@/components/home/UrbanNewsBanner";
import { WaitlistSection } from "@/components/home/WaitlistSection";

import { useEffect } from "react";

const Index = () => {
  const { isAuthenticated, isAdmin, isAnalyst, refreshAuthState } = useAuth();

  // Add a useEffect to refresh auth state when the page loads
  useEffect(() => {
    const initAuth = async () => {
      console.log("Home: Refreshing auth state on page load");
      await refreshAuthState();
    };
    
    initAuth();
  }, [refreshAuthState]);

  const scrollToFeatures = () => {
    const featuresSection = document.getElementById('features');
    if (featuresSection) {
      featuresSection.scrollIntoView({
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Include the AuthSyncComponent to sync authentication state */}
      <AuthSyncComponent />
      
      <Header />
      
      <main>
        {/* Landing page components */}
        <Hero />
        
        <div id="features">
          <Features isAdminOrAnalyst={isAdmin || isAnalyst} />
        </div>
        
        <CompaniesSection />
        
        <WorkShowcase />
        
        <UrbanNewsBanner />
        
        <TestimonialsGrid />
        
        <WaitlistSection />
      </main>
      
      
    </div>
  );
};

export default Index;
