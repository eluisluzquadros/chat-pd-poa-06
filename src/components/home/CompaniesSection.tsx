
import { Logos3 } from "@/components/blocks/logos3";
import { useTheme } from "next-themes";

export const CompaniesSection = () => {
  const { theme } = useTheme();
  
  // Updated company logos with real image paths
  const companies = [
    { 
      id: "logo-1", 
      description: "Prefeitura", 
      image: theme === 'dark' 
        ? "/lovable-uploads/24d7a345-3612-4e26-b0ba-0220d7a03f2c.png"
        : "/lovable-uploads/262b5675-74ba-4091-81cb-b675d836d543.png",
      className: "h-8 w-auto" 
    },
    { 
      id: "logo-2", 
      description: "Secretaria", 
      image: theme === 'dark' 
        ? "/lovable-uploads/24d7a345-3612-4e26-b0ba-0220d7a03f2c.png"
        : "/lovable-uploads/262b5675-74ba-4091-81cb-b675d836d543.png",
      className: "h-8 w-auto" 
    },
    { 
      id: "logo-3", 
      description: "Planejamento", 
      image: theme === 'dark' 
        ? "/lovable-uploads/24d7a345-3612-4e26-b0ba-0220d7a03f2c.png"
        : "/lovable-uploads/262b5675-74ba-4091-81cb-b675d836d543.png",
      className: "h-8 w-auto" 
    },
    { 
      id: "logo-4", 
      description: "Desenvolvimento", 
      image: theme === 'dark' 
        ? "/lovable-uploads/24d7a345-3612-4e26-b0ba-0220d7a03f2c.png"
        : "/lovable-uploads/262b5675-74ba-4091-81cb-b675d836d543.png",
      className: "h-8 w-auto" 
    },
    { 
      id: "logo-5", 
      description: "Inovação", 
      image: theme === 'dark' 
        ? "/lovable-uploads/24d7a345-3612-4e26-b0ba-0220d7a03f2c.png"
        : "/lovable-uploads/262b5675-74ba-4091-81cb-b675d836d543.png",
      className: "h-8 w-auto" 
    },
    { 
      id: "logo-6", 
      description: "Sustentabilidade", 
      image: theme === 'dark' 
        ? "/lovable-uploads/24d7a345-3612-4e26-b0ba-0220d7a03f2c.png"
        : "/lovable-uploads/262b5675-74ba-4091-81cb-b675d836d543.png",
      className: "h-8 w-auto" 
    }
  ];

  return (
    <Logos3 
      heading="Uma iniciativa" 
      logos={companies}
    />
  );
};
