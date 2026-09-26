import React, { createContext, useContext } from "react";
import { useGenerationProcess } from "./useGenerationProcess";

const GenerationProcessContext = createContext(null);

export function GenerationProcessProvider({ children }) {
  const value = useGenerationProcess();
  return (
    <GenerationProcessContext.Provider value={value}>
      {children}
    </GenerationProcessContext.Provider>
  );
}

export function useGenerationProcessContext() {
  const value = useContext(GenerationProcessContext);
  if (!value) {
    throw new Error(
      "useGenerationProcessContext must be used inside GenerationProcessProvider",
    );
  }
  return value;
}
