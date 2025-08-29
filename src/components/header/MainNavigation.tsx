
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Users, FileText, MessageCircle, BarChart3, Shield } from 'lucide-react';

export const MainNavigation = () => {
  const navigate = useNavigate();

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
            onClick={() => navigate('/admin/dashboard')} 
            className="hover:underline flex items-center cursor-pointer"
          >
            <BarChart3 className="h-4 w-4 mr-1" />
            Dashboard
          </button>
        </li>
        
        <li>
          <button 
            onClick={() => navigate('/admin/users')} 
            className="hover:underline flex items-center cursor-pointer"
          >
            <Users className="h-4 w-4 mr-1" />
            Usuários
          </button>
        </li>
      </ul>
    </nav>
  );
};

