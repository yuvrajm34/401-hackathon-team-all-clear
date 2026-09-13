import type { Metadata } from "next";

import { LoginView } from "@/components/auth/LoginView";

export const metadata: Metadata = {
  title: "Log in",
  description: "Sign in to ApplyPath on this device.",
};

export default function LoginPage() {
  return <LoginView />;
}
