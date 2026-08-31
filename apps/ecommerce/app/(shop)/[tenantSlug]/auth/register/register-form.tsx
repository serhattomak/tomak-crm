"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { EcommerceClient } from "@/lib/ecommerce-client";

export function RegisterForm({ tenantSlug }: { tenantSlug: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { full_name: fullName.trim(), tenant_slug: tenantSlug } },
      });
      if (authError) throw authError;
      // If email confirmation required, data.session may be null — inform user
      if (!data.session) {
        setError("Kayıt alındı — e-postanı doğrula, sonra giriş yap.");
        return;
      }
      const token = data.session.access_token;
      const guestToken = localStorage.getItem("guest_token") ?? undefined;
      await EcommerceClient.syncAuth(
        tenantSlug,
        { email: email.trim(), fullName: fullName.trim(), guestToken },
        token,
      );
      if (guestToken) localStorage.removeItem("guest_token");
      router.push(`/${tenantSlug}/my-orders`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kayıt başarısız");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="mt-6 space-y-4" onSubmit={handleRegister}>
      {error ? <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{error}</p> : null}
      <div>
        <label className="font-medium text-sm">Ad Soyad</label>
        <input
          className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Ad Soyad"
          required
          value={fullName}
        />
      </div>
      <div>
        <label className="font-medium text-sm">E-posta</label>
        <input
          className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
          onChange={(e) => setEmail(e.target.value)}
          placeholder="ornek@e-posta.com"
          required
          type="email"
          value={email}
        />
      </div>
      <div>
        <label className="font-medium text-sm">Şifre</label>
        <input
          className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
          onChange={(e) => setPassword(e.target.value)}
          required
          type="password"
          value={password}
        />
      </div>
      <button
        className="w-full rounded-xl bg-violet-600 py-3 font-semibold text-sm text-white hover:bg-violet-700 disabled:opacity-50"
        disabled={loading}
        type="submit"
      >
        {loading ? "Kaydediliyor…" : "Kayıt Ol"}
      </button>
      <p className="text-center text-sm text-muted-foreground">
        Zaten hesabın var mı?{" "}
        <Link className="font-semibold text-violet-600 underline" href={`/${tenantSlug}/auth/login`}>
          Giriş Yap
        </Link>
      </p>
    </form>
  );
}
