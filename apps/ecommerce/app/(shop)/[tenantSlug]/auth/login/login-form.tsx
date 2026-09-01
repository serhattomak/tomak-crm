"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { EcommerceClient } from "@/lib/ecommerce-client";
import { createClient } from "@/lib/supabase/client";

export function LoginForm({ tenantSlug }: { tenantSlug: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error: authError } = await supabase.auth.signInWithPassword(
        {
          email: email.trim(),
          password,
        }
      );
      if (authError) {
        throw authError;
      }
      // Sync to CRM customers (auth_user_id → customerId) + guest merge
      const token = data.session?.access_token;
      if (token) {
        const guestToken = localStorage.getItem("guest_token") ?? undefined;
        const userEmail = data.session?.user?.email ?? email.trim();
        await EcommerceClient.syncAuth(
          tenantSlug,
          { email: userEmail, guestToken },
          token
        );
        if (guestToken) {
          localStorage.removeItem("guest_token");
        }
      }
      router.push(`/${tenantSlug}/my-orders`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Giriş başarısız");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="mt-6 space-y-4" onSubmit={handleLogin}>
      {error ? (
        <p className="rounded-xl bg-rose-50 p-3 text-rose-700 text-sm">
          {error}
        </p>
      ) : null}
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
        {loading ? "Giriş yapılıyor…" : "Giriş Yap"}
      </button>
      <p className="text-center text-muted-foreground text-sm">
        Hesabın yok mu?{" "}
        <Link
          className="font-semibold text-violet-600 underline"
          href={`/${tenantSlug}/auth/register`}
        >
          Kayıt Ol
        </Link>
      </p>
    </form>
  );
}
