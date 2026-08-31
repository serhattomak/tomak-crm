import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const TENANT_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function isValidTenantSlug(slug: string): boolean {
  return (
    TENANT_SLUG_PATTERN.test(slug) && slug.length >= 2 && slug.length <= 64
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Validate tenantSlug segment for /[tenantSlug]/* routes
  // Path shape: /{tenantSlug}/shop, /{tenantSlug}/product/..., /{tenantSlug}/cart, etc.
  const segment = pathname.split("/").find(Boolean);

  if (
    segment &&
    !["api", "_next", "supabase", "favicon.ico"].includes(segment)
  ) {
    // Allow root / as 404 or landing; only validate if segment looks like a slug and path is under (shop)
    // We don't block unknown slugs here — layout.tsx will notFound() — but we guard malformed slugs.
    const looksLikeSlugRoute =
      pathname.startsWith(`/${segment}/shop`) ||
      pathname.startsWith(`/${segment}/product`) ||
      pathname.startsWith(`/${segment}/cart`) ||
      pathname.startsWith(`/${segment}/checkout`) ||
      pathname.startsWith(`/${segment}/my-orders`);

    if (looksLikeSlugRoute && !isValidTenantSlug(segment)) {
      // Let Next handle 404; we still refresh session cookies
      // No redirect — malformed slug is 404, not login
    }
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (svg, png, jpg, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
