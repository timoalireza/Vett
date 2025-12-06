import { useState, useCallback } from "react";

export type LensState = "idle" | "input" | "loading" | "result";

export function useLensState() {
  const [state, setState] = useState<LensState>("idle");

  const toInput = useCallback(() => {
    setState((curr) => (curr === "idle" ? "input" : curr));
  }, []);

  const toLoading = useCallback(() => {
    setState("loading");
  }, []);

  const toResult = useCallback(() => {
    setState("result");
  }, []);

  const reset = useCallback(() => {
    setState("idle");
  }, []);

  return {
    state,
    toInput,
    toLoading,
    toResult,
    reset,
    isIdle: state === "idle",
    isInput: state === "input",
    isLoading: state === "loading",
    isResult: state === "result",
  };
}

