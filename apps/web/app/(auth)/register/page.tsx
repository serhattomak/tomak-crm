"use client";

import { Eye, EyeOff, Loader2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type React from "react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signUp({
        email,
        options: {
          data: {
            full_name: fullName,
          },
        },
        password,
      });

      if (authError) {
        setError(authError.message);
        setIsLoading(false);
        return;
      }

      window.location.href = "/";
    } catch {
      setError("An unexpected error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signInWithOAuth({
        options: {
          redirectTo: `${window.location.origin}/`,
        },
        provider: "google",
      });
    } catch {
      setError("Failed to initialize Google signup.");
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-zinc-950 p-3 sm:p-6">
      {/* Ambient background fluid glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-40 mix-blend-screen">
        <Image
          alt="Ortam Arka Planı"
          className="scale-125 object-cover blur-3xl"
          fill
          priority
          src="/auth-art.jpg"
        />
      </div>

      {/* Main Floating Card */}
      <div className="relative z-10 grid w-full max-w-5xl grid-cols-1 overflow-hidden rounded-[32px] bg-card p-3 shadow-[0_25px_70px_rgba(0,0,0,0.55)] sm:rounded-[40px] sm:p-4 lg:grid-cols-12">
        {/* Left Side: Editorial Art Card */}
        <div className="relative hidden min-h-[640px] flex-col justify-between overflow-hidden rounded-[28px] bg-black p-10 text-white lg:col-span-6 lg:flex">
          <Image
            alt="Editoryal Dalga Görseli"
            className="object-cover"
            fill
            priority
            src="/auth-art.jpg"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/40" />

          {/* Top Caption */}
          <div className="relative z-10 flex w-full items-center gap-3">
            <span className="font-bold text-2xs text-white/90 uppercase tracking-[0.25em]">
              YOLCULUĞUNUZA BAŞLAYIN
            </span>
            <div className="h-[1px] max-w-[120px] flex-1 bg-white/40" />
          </div>

          {/* Bottom Quote & Typography */}
          <div className="relative z-10 max-w-sm space-y-4">
            <h2 className="font-normal font-serif text-4xl text-white leading-[1.08] tracking-tight sm:text-5xl">
              Sıra Dışı
              <br />
              Bir Şey
              <br />
              İnşa Edin
            </h2>
            <p className="font-light text-white/80 text-xs leading-relaxed sm:text-sm">
              Çok kiracılı çalışma alanınızı oluşturun ve ekibinizin tüm
              gücünü ortaya çıkarın.
            </p>
          </div>
        </div>

        {/* Right Side: Form Container */}
        <div className="flex flex-col justify-between bg-card px-6 py-8 text-zinc-900 sm:px-12 sm:py-10 lg:col-span-6">
          {/* Brand Logo Header */}
          <div className="mb-6 flex items-center justify-center gap-2 sm:mb-8">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-900 text-white shadow-sm">
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                viewBox="0 0 24 24"
              >
                <path d="M12 3a9 9 0 0 1 9 9 9 9 0 0 1-9 9 9 9 0 0 1-9-9 9 9 0 0 1 9-9Z" />
                <path d="M12 7a5 5 0 0 1 5 5 5 5 0 0 1-5 5 5 5 0 0 1-5-5 5 5 0 0 1 5-5Z" />
              </svg>
            </div>
            <span className="font-semibold text-base text-zinc-900 tracking-tight">
              Cogie
            </span>
          </div>

          {/* Form Content */}
          <div className="mx-auto w-full max-w-sm space-y-5">
            <div className="space-y-1.5 text-center">
              <h1 className="font-normal font-serif text-3xl text-zinc-900 tracking-tight sm:text-4xl">
                Hesap Oluştur
              </h1>
              <p className="font-normal text-zinc-500 text-xs">
                Çalışma alanınızı oluşturmak için bilgilerinizi girin
              </p>
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-center text-red-600 text-xs">
                {error}
              </div>
            )}

            <form
              action="javascript:void(0);"
              className="space-y-3.5"
              onSubmit={handleRegister}
            >
              <div>
                <label className="mb-1.5 block font-semibold text-zinc-800 text-xs" htmlFor="register-full-name">
                  Ad Soyad
                </label>
                <input
                  className="w-full rounded-xl border-0 bg-muted px-4 py-3 text-foreground text-xs outline-none transition-all placeholder:text-zinc-400 focus:bg-card focus:ring-2 focus:ring-zinc-900 sm:text-sm"
                  id="register-full-name"
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ahmet Yılmaz"
                  required
                  type="text"
                  value={fullName}
                />
              </div>

              <div>
                <label className="mb-1.5 block font-semibold text-zinc-800 text-xs" htmlFor="register-email">
                  E-posta
                </label>
                <input
                  className="w-full rounded-xl border-0 bg-muted px-4 py-3 text-foreground text-xs outline-none transition-all placeholder:text-zinc-400 focus:bg-card focus:ring-2 focus:ring-zinc-900 sm:text-sm"
                  id="register-email"
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="E-postanızı girin"
                  required
                  type="email"
                  value={email}
                />
              </div>

              <div>
                <label className="mb-1.5 block font-semibold text-zinc-800 text-xs" htmlFor="register-password">
                  Şifre
                </label>
                <div className="relative">
                  <input
                    className="w-full rounded-xl border-0 bg-muted px-4 py-3 pr-10 text-foreground text-xs outline-none transition-all placeholder:text-zinc-400 focus:bg-card focus:ring-2 focus:ring-zinc-900 sm:text-sm"
                    id="register-password"
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="En az 6 karakter"
                    required
                    type={showPassword ? "text" : "password"}
                    value={password}
                  />
                  <button
                    className="absolute top-3.5 right-3 text-zinc-400 hover:text-zinc-600"
                    onClick={() => setShowPassword(!showPassword)}
                    type="button"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-2.5 pt-2">
                <button
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-black py-3.5 font-medium text-white text-xs shadow-sm transition-all hover:bg-neutral-800 active:scale-[0.99] disabled:opacity-50 sm:text-sm"
                  disabled={isLoading}
                  type="submit"
                >
                  {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Kayıt Ol
                </button>

                <button
                  className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-border bg-card py-3 font-medium text-zinc-700 text-xs shadow-sm transition-all hover:bg-zinc-50 sm:text-sm"
                  onClick={handleGoogleLogin}
                  type="button"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      fill="#EA4335"
                    />
                  </svg>
                  Google ile Kayıt Ol
                </button>
              </div>
            </form>
          </div>

          {/* Footer */}
          <div className="mt-8 text-center text-zinc-500 text-xs">
            Already have an account?{" "}
            <Link
              className="font-semibold text-zinc-900 hover:underline"
              href="/login"
            >
              Giriş Yap
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
