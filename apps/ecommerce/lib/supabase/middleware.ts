import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  if (request.method !== "GET") {
    return NextResponse.next();
  }

  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });
  supabaseResponse.headers.set(
    "Permissions-Policy",
    "identity-credentials-get=()"
  );

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookieOptions: {
      name: "sb-ecommerce-auth-token",
    },
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        supabaseResponse = NextResponse.next({
          request,
        });
        for (const { name, value, options } of cookiesToSet) {
          supabaseResponse.cookies.set(name, value, options);
        }
      },
    },
  });

  // E-commerce storefront is public — no auth redirect.
  // Just refresh session so `auth_user_id → customerId` can be resolved when logged in.
  await supabase.auth.getUser();

  return supabaseResponse;
}
