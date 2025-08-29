
import { motion, AnimatePresence } from "framer-motion";

interface PlaceholderProps {
  value: string;
  currentPlaceholder: number;
  placeholders: string[];
}

export const AnimatedPlaceholder = ({
  value,
  currentPlaceholder,
  placeholders,
}: PlaceholderProps) => {
  return (
    <div className="absolute inset-0 flex items-center rounded-full pointer-events-none">
      <AnimatePresence mode="wait">
        {!value && (
          <motion.p
            initial={{
              y: 5,
              opacity: 0,
            }}
            key={`current-placeholder-${currentPlaceholder}`}
            animate={{
              y: 0,
              opacity: 1,
            }}
            exit={{
              y: -15,
              opacity: 0,
            }}
            transition={{
              duration: 0.3,
              ease: "linear",
            }}
            className="dark:text-zinc-500 text-sm sm:text-base font-normal text-neutral-500 pl-4 sm:pl-12 text-left w-[calc(100%-2rem)] truncate"
          >
            {placeholders[currentPlaceholder]}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
};
