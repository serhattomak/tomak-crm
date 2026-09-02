import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip static assets, Next internals, api endpoints, and media files immediately
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Skip non-GET requests (form submissions, API calls, etc.)
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
      name: "sb-crm-auth-token",
    },
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  const isAuthPage =
    pathname.startsWith("/login") || pathname.startsWith("/register");
  const isPublicPage =
    isAuthPage ||
    pathname.startsWith("/quotes/view/") ||
    pathname.startsWith("/public/") ||
    pathname.startsWith("/portal/") ||
    pathname === "/portal";

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!(user || isPublicPage)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    const redirectResponse = NextResponse.redirect(url);
    for (const cookie of supabaseResponse.cookies.getAll()) {
      redirectResponse.cookies.set(cookie.name, cookie.value, cookie);
    }
    return redirectResponse;
  }

  if (user && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    const redirectResponse = NextResponse.redirect(url);
    for (const cookie of supabaseResponse.cookies.getAll()) {
      redirectResponse.cookies.set(cookie.name, cookie.value, cookie);
    }
    return redirectResponse;
  }

  return supabaseResponse;
}
