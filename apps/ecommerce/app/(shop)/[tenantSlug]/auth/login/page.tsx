import { LoginForm } from "./login-form";

interface PageProps {
  params: Promise<{ tenantSlug: string }>;
}

export default async function LoginPage({ params }: PageProps) {
  const { tenantSlug } = await params;
  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <h1 className="font-bold text-2xl">Giriş Yap</h1>
      <p className="mt-1 text-muted-foreground text-sm">
        E-ticaret hesabınla giriş yap — siparişlerin, adreslerin ve destek taleplerin burada görünecek.
      </p>
      <LoginForm tenantSlug={tenantSlug} />
    </div>
  );
}
