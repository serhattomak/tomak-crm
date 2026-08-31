import { RegisterForm } from "./register-form";

interface PageProps {
  params: Promise<{ tenantSlug: string }>;
}

export default async function RegisterPage({ params }: PageProps) {
  const { tenantSlug } = await params;
  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <h1 className="font-bold text-2xl">Kayıt Ol</h1>
      <p className="mt-1 text-muted-foreground text-sm">
        E-ticarette kayıt ol — CRM → Müşteriler’de otomatik görüneceksin.
      </p>
      <RegisterForm tenantSlug={tenantSlug} />
    </div>
  );
}
