/* Auth route-group shell — owns nothing but the toast surface. `(auth)` had no layout
   at all, so a `toast()` here rendered nothing and reported nothing
   (docs/agents/environment.md). System: docs/crm-ui-standards.md (ADR-0004). */
import { Toaster } from "@workspace/ui/components/sonner";
import type React from "react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <Toaster position="top-right" richColors />
    </>
  );
}
