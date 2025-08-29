
import { useState } from "react";

export function useInputState() {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  return {
    input,
    setInput,
    isLoading,
    setIsLoading,
  };
}
