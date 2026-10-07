"use client";

import { AuthProvider } from "../auth/AuthContext";
import { GenerationProcessProvider } from "../hooks/GenerationProcessContext";

export default function Providers({ children }) {
  return (
    <AuthProvider>
      <GenerationProcessProvider>{children}</GenerationProcessProvider>
    </AuthProvider>
  );
}
