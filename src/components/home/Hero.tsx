
import { useNavigate } from "react-router-dom";
import { HeroContent } from "./hero/HeroContent";
import { HeroBackground } from "./hero/HeroBackground";

export const Hero = () => {
  const scrollToFeatures = () => {
    const featuresSection = document.getElementById('features');
    if (featuresSection) {
      featuresSection.scrollIntoView({
        behavior: 'smooth'
      });
    }
  };
  
  return (
    <div className="relative flex flex-col">
      {/* Hero Section with split layout */}
      <HeroBackground>
        <div className="flex flex-col w-full">
          <HeroContent scrollToFeatures={scrollToFeatures} />
          {/* Testimonial Badge is now inside HeroContent */}
        </div>
      </HeroBackground>
    </div>
  );
};
