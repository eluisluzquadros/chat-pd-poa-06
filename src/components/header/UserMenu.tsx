
import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut, Settings, User, Shield } from 'lucide-react';
import { AuthService } from '@/services/authService';

interface UserMenuProps {
  isAuthenticated: boolean;
  isLoading: boolean;
}

export const UserMenu = ({ isAuthenticated, isLoading }: UserMenuProps) => {
  const { signOut } = useAuth();
  const isDemoMode = AuthService.isDemoMode();
  
  return (
    <nav className="ml-4">
      <ul className="flex items-center space-x-5">
        {isAuthenticated ? (
          <>
            {isDemoMode && (
              <li>
                <div className="flex items-center gap-1.5 text-yellow-300 bg-yellow-900/20 px-2 py-1 rounded-md text-xs">
                  <Shield className="h-3 w-3" />
                  <span className="font-medium">DEMO</span>
                </div>
              </li>
            )}
            <li>
              <Link 
                to="/settings" 
                className="flex items-center gap-1.5 text-white/90 hover:text-white transition-colors px-2 py-1 rounded-md hover:bg-white/10"
              >
                <Settings className="h-4 w-4" />
                <span className="font-medium">Configurações</span>
              </Link>
            </li>
            <li>
              <Button 
                onClick={signOut} 
                disabled={isLoading}
                variant="secondary"
                size="sm"
                className="bg-white/15 text-white hover:bg-white/25 transition-colors border-none font-medium px-4 py-2"
              >
                <LogOut className="h-4 w-4 mr-2" />
                {isLoading ? 'Saindo...' : 'Sair'}
              </Button>
            </li>
          </>
        ) : (
          <li>
            <Link 
              to="/auth" 
              className="bg-white/15 text-white hover:bg-white/25 transition-colors rounded-md px-4 py-2 flex items-center gap-2 font-medium"
            >
              <User className="h-4 w-4" />
              Entrar
            </Link>
          </li>
        )}
      </ul>
    </nav>
  );
};
