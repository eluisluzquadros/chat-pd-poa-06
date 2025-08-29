
import { useState, useEffect, useRef } from "react";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Send } from "lucide-react";

interface ExampleQuestionsCarouselProps {
  onSelectQuestion: (question: string) => void;
}

export function ExampleQuestionsCarousel({ onSelectQuestion }: ExampleQuestionsCarouselProps) {
  const exampleQuestions = [
    "O que é um contrato de serviços?",
    "Como criar um plano de negócios?",
    "Explique as diferenças entre sociedade limitada e S/A",
    "Quais são os passos para abrir uma empresa?",
    "Qual a diferença entre MEI e ME?",
  ];

  const carouselRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const startAutoRotation = () => {
    intervalRef.current = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % exampleQuestions.length);
    }, 3000);
  };

  useEffect(() => {
    startAutoRotation();
    
    // Clean up interval on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Handle visibility change (tab switching)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && intervalRef.current) {
        clearInterval(intervalRef.current);
      } else {
        startAutoRotation();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return (
    <div className="w-full max-w-lg mx-auto">
      <Carousel 
        className="w-full" 
        opts={{
          align: "center",
          loop: true,
        }}
        setApi={(api) => {
          if (api) {
            api.scrollTo(activeIndex);
          }
        }}
      >
        <CarouselContent>
          {exampleQuestions.map((question, index) => (
            <CarouselItem key={index} className="md:basis-full">
              <div className="p-1">
                <div className={cn(
                  "flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-700 p-4 bg-white/80 dark:bg-gray-800/80 shadow-sm transition-all",
                  activeIndex === index ? "opacity-100 scale-100" : "opacity-70 scale-95"
                )}>
                  <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-1">{question}</p>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="ml-2 shrink-0 h-8 w-8 p-0 rounded-full bg-primary/10 hover:bg-primary/20" 
                    onClick={() => onSelectQuestion(question)}
                  >
                    <Send className="h-3.5 w-3.5 text-primary" />
                    <span className="sr-only">Usar esta pergunta</span>
                  </Button>
                </div>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
    </div>
  );
}
