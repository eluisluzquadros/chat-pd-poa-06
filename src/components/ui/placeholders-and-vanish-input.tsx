
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { VanishCanvas } from "./vanish-animation/canvas";
import { SubmitButton } from "./vanish-animation/submit-button";
import { AnimatedPlaceholder } from "./vanish-animation/placeholder";

export function PlaceholdersAndVanishInput({
  placeholders,
  onChange,
  onSubmit,
}: {
  placeholders: string[];
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>, inputValue: string) => void;
}) {
  const [currentPlaceholder, setCurrentPlaceholder] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");
  const [animating, setAnimating] = useState(false);

  const startAnimation = () => {
    intervalRef.current = setInterval(() => {
      setCurrentPlaceholder((prev) => (prev + 1) % placeholders.length);
    }, 3000);
  };

  const handleVisibilityChange = () => {
    if (document.visibilityState !== "visible" && intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    } else if (document.visibilityState === "visible") {
      startAnimation();
    }
  };

  useEffect(() => {
    startAnimation();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [placeholders]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !animating) {
      vanishAndSubmit();
    }
  };

  const vanishAndSubmit = () => {
    if (value) {
      setAnimating(true);
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (value.trim()) {
      vanishAndSubmit();
      onSubmit && onSubmit(e, value);
    }
  };

  const handleAnimationComplete = useCallback(() => {
    setValue("");
    setAnimating(false);
  }, []);

  return (
    <form
      className={cn(
        "w-full relative max-w-xl mx-auto h-12 rounded-full overflow-hidden shadow-[0px_2px_3px_-1px_rgba(0,0,0,0.1),_0px_1px_0px_0px_rgba(25,28,33,0.02),_0px_0px_0px_1px_rgba(25,28,33,0.08)] transition duration-200",
        value && "bg-gray-50",
        "bg-white/90 dark:bg-gray-800/90 dark:border dark:border-gray-700"
      )}
      onSubmit={handleSubmit}
    >
      <VanishCanvas 
        value={value} 
        animating={animating} 
        inputRef={inputRef} 
        onAnimationComplete={handleAnimationComplete}
      />
      <input
        onChange={(e) => {
          if (!animating) {
            setValue(e.target.value);
            onChange && onChange(e);
          }
        }}
        onKeyDown={handleKeyDown}
        ref={inputRef}
        value={value}
        type="text"
        className={cn(
          "w-full relative text-sm sm:text-base z-50 border-none h-full rounded-full focus:outline-none focus:ring-0 pl-4 sm:pl-10 pr-20",
          "bg-transparent text-black dark:text-white",
          animating && "text-transparent dark:text-transparent"
        )}
      />
      <SubmitButton disabled={!value} value={value} />
      <AnimatedPlaceholder
        value={value}
        currentPlaceholder={currentPlaceholder}
        placeholders={placeholders}
      />
    </form>
  );
}
