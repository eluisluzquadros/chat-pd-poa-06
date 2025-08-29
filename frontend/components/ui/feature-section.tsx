
import React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface FeatureSectionProps {
  title: string;
  description: string;
  imageSrc: string;
  imageAlt: string;
  buttonText?: string;
  buttonAction?: () => void;
  imagePosition?: "left" | "right";
  variant?: "default" | "alternate" | "light" | "gradient";
  className?: string;
}

export const FeatureSection = ({
  title,
  description,
  imageSrc,
  imageAlt,
  buttonText,
  buttonAction,
  imagePosition = "right",
  variant = "default",
  className
}: FeatureSectionProps) => {
  const getVariantClasses = () => {
    switch (variant) {
      case "alternate":
        return "bg-gray-50 dark:bg-gray-800";
      case "light":
        return "bg-white dark:bg-gray-900";
      case "gradient":
        return "bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800";
      default:
        return "bg-white dark:bg-gray-900";
    }
  };
  
  return (
    <section className={cn("py-12 md:py-20", getVariantClasses(), className)}>
      <div className="container mx-auto px-4">
        <div className={`flex flex-col ${imagePosition === "left" ? "md:flex-row" : "md:flex-row-reverse"} items-center gap-8 md:gap-12`}>
          {/* Content */}
          <div className="md:w-1/2 space-y-4">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">{title}</h2>
            <p className="text-lg text-gray-600 dark:text-gray-300">{description}</p>
            
            {buttonText && buttonAction && (
              <div className="pt-4">
                <Button onClick={buttonAction} className="bg-primary hover:bg-primary/90">
                  {buttonText}
                </Button>
              </div>
            )}
          </div>
          
          {/* Image */}
          <div className="md:w-1/2">
            <div className="relative rounded-xl overflow-hidden shadow-xl">
              <img 
                src={imageSrc} 
                alt={imageAlt} 
                className="w-full h-auto object-cover" 
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
