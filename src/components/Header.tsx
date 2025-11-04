
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Logo } from '@/components/header/Logo';
import { MainNavigation } from '@/components/header/MainNavigation';
import { UserMenu } from '@/components/header/UserMenu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell } from 'lucide-react';
import { AnnouncementsPanel } from '@/components/platform/AnnouncementsPanel';
import { usePlatformAnnouncements } from '@/hooks/usePlatformAnnouncements';

const Header = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  const isInChat = location.pathname === '/chat';
  const [showAnnouncements, setShowAnnouncements] = useState(false);
  const { unreadCount } = usePlatformAnnouncements();

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
          
          {/* Notifications & User Menu */}
          <div className="flex items-center gap-2">
            {isAuthenticated && (
              <Button 
                variant="ghost" 
                size="icon"
                className="relative"
                onClick={() => setShowAnnouncements(true)}
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <Badge 
                    className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                    variant="destructive"
                  >
                    {unreadCount}
                  </Badge>
                )}
              </Button>
            )}
            <UserMenu isAuthenticated={isAuthenticated} isLoading={isLoading} />
          </div>
        </div>
      </div>

      <AnnouncementsPanel 
        open={showAnnouncements} 
        onOpenChange={setShowAnnouncements} 
      />
    </header>
  );
};

// Add named export to fix import issues
export { Header };
export default Header;
