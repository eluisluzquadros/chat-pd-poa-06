
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Users, FileText, MessageCircle, BarChart3, Shield, Database, Settings, Settings2 } from 'lucide-react';

export const MainNavigation = () => {
  const navigate = useNavigate();
  const { isAdmin, isSupervisor } = useAuth();

  return (
    <nav>
      <ul className="flex items-center space-x-4">
        <li>
          <button 
            onClick={() => navigate('/chat')} 
            className="hover:underline flex items-center cursor-pointer"
          >
            <MessageCircle className="h-4 w-4 mr-1" />
            Assistente
          </button>
        </li>
        
        <li>
          <button 
            onClick={() => navigate('/explorar-dados')} 
            className="hover:underline flex items-center cursor-pointer"
          >
            <Database className="h-4 w-4 mr-1" />
            Explorar Dados
          </button>
        </li>
        
        {(isAdmin || isSupervisor) && (
          <li>
            <button 
              onClick={() => navigate('/admin/dashboard')} 
              className="hover:underline flex items-center cursor-pointer"
            >
              <BarChart3 className="h-4 w-4 mr-1" />
              Dashboard
            </button>
          </li>
        )}
        
        {isAdmin && (
          <>
            <li>
              <button 
                onClick={() => navigate('/admin/users')} 
                className="hover:underline flex items-center cursor-pointer"
              >
                <Users className="h-4 w-4 mr-1" />
                Usuários
              </button>
            </li>
            <li>
              <button 
                onClick={() => navigate('/admin/agents-config')} 
                className="hover:underline flex items-center cursor-pointer"
              >
                <Settings className="h-4 w-4 mr-1" />
                Agentes
              </button>
            </li>
            <li>
              <button 
                onClick={() => navigate('/admin/settings')} 
                className="hover:underline flex items-center cursor-pointer"
              >
                <Settings2 className="h-4 w-4 mr-1" />
                Plataforma
              </button>
            </li>
          </>
        )}
      </ul>
    </nav>
  );
};

