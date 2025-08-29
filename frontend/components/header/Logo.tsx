
import React from 'react';
import { Link } from 'react-router-dom';

export const Logo = () => {
  return (
    <Link to="/" className="flex items-center">
      <img 
        src="/lovable-uploads/ea243044-6006-46b3-840a-a280efc7a4d3.png" 
        alt="Prefeitura de Porto Alegre" 
        className="h-10 transition-all duration-300"
      />
    </Link>
  );
};
