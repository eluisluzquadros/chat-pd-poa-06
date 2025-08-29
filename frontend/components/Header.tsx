
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Logo } from '@/components/header/Logo';
import { MainNavigation } from '@/components/header/MainNavigation';
import { UserMenu } from '@/components/header/UserMenu';

const Header = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  const isInChat = location.pathname === '/chat';

  return (
    <header className="bg-primary text-primary-foreground shadow-md sticky top-0 z-50">
      <div className="container-wide flex items-center justify-between py-4">
        <div className="flex items-center gap-4">
          <Logo />
        </div>
        <div className="flex items-center space-x-6">
          <MainNavigation />
          <UserMenu isAuthenticated={isAuthenticated} isLoading={isLoading} />
        </div>
      </div>
    </header>
  );
};

// Add named export to fix import issues
export { Header };
export default Header;
