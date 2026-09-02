import { notFound, redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ token: string }>;
};

/**
 * Legacy redirect: /quotes/view/[token] → /portal/[token]
 *
 * ADR 0001 pattern — docs/adr/0001-recruitment-deep-link.md (route redirect vs drawer).
 * Faz 1'de drawer-only, Faz 2'de route kararı burada legacy deep-link için uygulanıyor:
 * eski public link /quotes/view/[token] korunur ve tek yönlü (one-way) olarak
 * kanonik portal rotası /portal/[token]'a yönlendirilir.
 *
 * - No infinite loop: middleware (lib/supabase/middleware.ts → isPublicPage)
 *   hem /portal/* hem de /quotes/view/*'ı public olarak işaretler; redirect
 *   yalnızca bu dosyada ve yalnızca /portal yönüne yapılır, portal asla geri
 *   yönlendirmez.
 * - Token forwarding: PublicViewToken = Guid.New("N") → 32-char hex (tire yok);
 *   token olduğu gibi korunarak iletilir, trim dışında transform yok.
 * - Missing token: graceful 404 (notFound) — /portal/undefined'e yönlendirme yok.
 */
export default async function Page({ params }: PageProps): Promise<never> {
  const { token } = await params;

  const normalizedToken = token?.trim();

  if (!normalizedToken) {
    notFound();
  }

  redirect(`/portal/${normalizedToken}`);
}
