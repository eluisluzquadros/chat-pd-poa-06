
import React from 'react';
import { LucideIcon } from 'lucide-react';

export interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  onClick?: () => void;
}

const FeatureCard = ({
  icon: Icon,
  title,
  description,
  onClick
}: FeatureCardProps) => {
  return (
    <div 
      className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md hover:shadow-lg transition-shadow duration-300 border border-gray-100 dark:border-gray-700 h-full"
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <div className="flex flex-col h-full">
        <div className="mb-4">
          <div className="p-2 bg-primary/10 inline-block rounded-lg">
            <Icon className="h-6 w-6 text-primary" />
          </div>
        </div>
        <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">{title}</h3>
        <p className="text-gray-600 dark:text-gray-300 flex-grow">{description}</p>
        
        {onClick && (
          <div className="mt-4 flex justify-end">
            <div className="text-primary text-sm font-medium flex items-center">
              Saiba mais
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 ml-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FeatureCard;
