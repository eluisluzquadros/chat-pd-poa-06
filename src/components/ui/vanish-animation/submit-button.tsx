
import { motion } from "framer-motion";

interface SubmitButtonProps {
  disabled: boolean;
  value: string;
}

export const SubmitButton = ({ disabled, value }: SubmitButtonProps) => {
  return (
    <button
      disabled={!value}
      type="submit"
      className="absolute right-2 top-1/2 z-50 -translate-y-1/2 h-8 w-8 rounded-full disabled:bg-gray-100 bg-black dark:bg-zinc-900 dark:disabled:bg-zinc-800 transition duration-200 flex items-center justify-center"
    >
      <motion.svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-gray-300 h-4 w-4"
      >
        <path stroke="none" d="M0 0h24v24H0z" fill="none" />
        <motion.path
          d="M5 12l14 0"
          initial={{
            strokeDasharray: "50%",
            strokeDashoffset: "50%",
          }}
          animate={{
            strokeDashoffset: value ? 0 : "50%",
          }}
          transition={{
            duration: 0.3,
            ease: "linear",
          }}
        />
        <path d="M13 18l6 -6" />
        <path d="M13 6l6 6" />
      </motion.svg>
    </button>
  );
};
