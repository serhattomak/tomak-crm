import { createBrowserClient } from "@supabase/ssr";

let browserClient: ReturnType<typeof createBrowserClient> | null = null;

const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

function getSupabaseUrl(): string {
  if (typeof window !== "undefined") {
    const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (
      !envUrl ||
      envUrl.includes("127.0.0.1") ||
      envUrl.includes("localhost")
    ) {
      return `${window.location.origin}/supabase`;
    }
    return envUrl;
  }
  return process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";
}

export function createClient() {
  const supabaseUrl = getSupabaseUrl();

  if (typeof window === "undefined") {
    return createBrowserClient(supabaseUrl, SUPABASE_ANON_KEY, {
      cookieOptions: {
        name: "sb-ecommerce-auth-token",
      },
    });
  }

  if (!browserClient) {
    browserClient = createBrowserClient(supabaseUrl, SUPABASE_ANON_KEY, {
      cookieOptions: {
        name: "sb-ecommerce-auth-token",
      },
    });
  }

  return browserClient;
}
