
import { motion } from "framer-motion";
import { User } from "lucide-react";

export const TestimonialBadge = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.8 }}
      className="flex items-center gap-3 mt-16 mb-10"
    >
      <div className="flex -space-x-2">
        {[1, 2, 3, 4].map((i) => (
          <div 
            key={i} 
            className="w-8 h-8 rounded-full bg-gray-300 border-2 border-white flex items-center justify-center overflow-hidden"
          >
            <User className="w-5 h-5 text-gray-600" />
          </div>
        ))}
      </div>
      <span className="text-sm text-gray-700 dark:text-gray-300">
        Avaliado por <span className="font-bold">50+</span> urbanistas
      </span>
    </motion.div>
  );
};
