
import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Users, FileText, MessageCircle, BarChart3, Shield } from 'lucide-react';

export const MainNavigation = () => {
  const { isAdmin, isSupervisor } = useAuth();

  return (
    <nav>
      <ul className="flex items-center space-x-4">
        <li>
          <Link to="/chat" className="hover:underline flex items-center">
            <MessageCircle className="h-4 w-4 mr-1" />
            Assistente
          </Link>
        </li>
        
        {/* Links condicionais baseados no papel do usuário */}
        {isSupervisor && !isAdmin && (
          <li>
            <Link to="/reports" className="hover:underline flex items-center">
              <FileText className="h-4 w-4 mr-1" />
              Relatórios
            </Link>
          </li>
        )}
        
        {isAdmin && (
          <>
            <li>
              <Link to="/admin/dashboard" className="hover:underline flex items-center">
                <BarChart3 className="h-4 w-4 mr-1" />
                Dashboard
              </Link>
            </li>
            <li>
              <Link to="/admin/users" className="hover:underline flex items-center">
                <Users className="h-4 w-4 mr-1" />
                Usuários
              </Link>
            </li>
          </>
        )}
      </ul>
    </nav>
  );
};

