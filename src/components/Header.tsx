
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
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo - sempre visível */}
          <div className="flex items-center gap-2 min-w-0">
            <Logo />
          </div>
          
          {/* Navegação - esconder em mobile, mostrar em tablet+ */}
          <div className="hidden md:flex items-center space-x-6">
            <MainNavigation />
          </div>
          
          {/* User Menu - sempre visível mas compacto em mobile */}
          <div className="flex items-center gap-2">
            <UserMenu isAuthenticated={isAuthenticated} isLoading={isLoading} />
          </div>
        </div>
      </div>
    </header>
  );
};

// Add named export to fix import issues
export { Header };
export default Header;
