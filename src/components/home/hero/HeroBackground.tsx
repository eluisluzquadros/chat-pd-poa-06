
import { motion } from "framer-motion";

interface HeroBackgroundProps {
  children: React.ReactNode;
}

export const HeroBackground = ({ children }: HeroBackgroundProps) => {
  return (
    <section className="relative min-h-screen overflow-hidden bg-white dark:bg-gray-900">
      {/* Split layout container */}
      <div className="flex flex-col md:flex-row min-h-screen">
        {/* Content side (left) */}
        <div className="w-full md:w-1/2 z-10 flex flex-col items-center justify-center">
          {children}
        </div>
        
        {/* Image side (right) - hidden on mobile */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.2 }}
          className="hidden md:block w-full md:w-1/2 bg-center bg-cover h-[40vh] md:h-screen absolute md:relative right-0 top-0 md:top-auto"
          style={{
            backgroundImage: 'url(https://cdn.midjourney.com/05e5a2c5-5f27-4ac7-9ee2-1ba2ee4a0a04/0_0.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            clipPath: 'polygon(10% 0, 100% 0, 100% 100%, 0 100%)'
          }}
        >
          {/* Optional overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/10 to-black/30 dark:from-black/30 dark:to-black/50" />
        </motion.div>
      </div>
    </section>
  );
};
