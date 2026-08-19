"use client"

import React, { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Eye, EyeOff, Loader2 } from "lucide-react"

export default function RegisterPage() {
  const router = useRouter()
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const supabase = createClient()
      const { error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      })

      if (authError) {
        setError(authError.message)
        setIsLoading(false)
        return
      }

      router.push("/")
      router.refresh()
    } catch {
      setError("An unexpected error occurred. Please try again.")
      setIsLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    try {
      const supabase = createClient()
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      })
    } catch {
      setError("Failed to initialize Google signup.")
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#070709] p-3 sm:p-6">
      {/* Ambient background fluid glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-40 mix-blend-screen">
        <Image
          src="/auth-art.jpg"
          alt="Ambient Background"
          fill
          className="scale-125 object-cover blur-3xl"
          priority
        />
      </div>

      {/* Main Floating Card */}
      <div className="relative z-10 grid w-full max-w-5xl grid-cols-1 overflow-hidden rounded-[32px] bg-white p-3 shadow-[0_25px_70px_rgba(0,0,0,0.55)] sm:rounded-[40px] sm:p-4 lg:grid-cols-12">
        {/* Left Side: Editorial Art Card */}
        <div className="relative hidden min-h-[640px] flex-col justify-between overflow-hidden rounded-[28px] bg-black p-10 text-white lg:col-span-6 lg:flex">
          <Image
            src="/auth-art.jpg"
            alt="Editorial Wave Art"
            fill
            className="object-cover"
            priority
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/40" />

          {/* Top Caption */}
          <div className="relative z-10 flex w-full items-center gap-3">
            <span className="text-[11px] font-bold tracking-[0.25em] text-white/90 uppercase">
              START YOUR JOURNEY
            </span>
            <div className="h-[1px] max-w-[120px] flex-1 bg-white/40" />
          </div>

          {/* Bottom Quote & Typography */}
          <div className="relative z-10 max-w-sm space-y-4">
            <h2 className="font-serif text-4xl leading-[1.08] font-normal tracking-tight text-white sm:text-5xl">
              Build
              <br />
              Something
              <br />
              Remarkable
            </h2>
            <p className="text-xs leading-relaxed font-light text-white/80 sm:text-sm">
              Create your multi-tenant workspace and unleash the full power of
              your team.
            </p>
          </div>
        </div>

        {/* Right Side: Form Container */}
        <div className="flex flex-col justify-between bg-white px-6 py-8 text-slate-900 sm:px-12 sm:py-10 lg:col-span-6">
          {/* Brand Logo Header */}
          <div className="mb-6 flex items-center justify-center gap-2 sm:mb-8">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-white shadow-sm">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                className="h-3.5 w-3.5"
              >
                <path d="M12 3a9 9 0 0 1 9 9 9 9 0 0 1-9 9 9 9 0 0 1-9-9 9 9 0 0 1 9-9Z" />
                <path d="M12 7a5 5 0 0 1 5 5 5 5 0 0 1-5 5 5 5 0 0 1-5-5 5 5 0 0 1 5-5Z" />
              </svg>
            </div>
            <span className="text-base font-semibold tracking-tight text-slate-900">
              Cogie
            </span>
          </div>

          {/* Form Content */}
          <div className="mx-auto w-full max-w-sm space-y-5">
            <div className="space-y-1.5 text-center">
              <h1 className="font-serif text-3xl font-normal tracking-tight text-slate-900 sm:text-4xl">
                Create Account
              </h1>
              <p className="text-xs font-normal text-slate-500">
                Enter your details to create your workspace
              </p>
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-center text-xs text-red-600">
                {error}
              </div>
            )}

            <form onSubmit={handleRegister} className="space-y-3.5">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-800">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full rounded-xl border-0 bg-[#f3f4f7] px-4 py-3 text-xs text-slate-900 transition-all outline-none placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-900 sm:text-sm"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-800">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full rounded-xl border-0 bg-[#f3f4f7] px-4 py-3 text-xs text-slate-900 transition-all outline-none placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-900 sm:text-sm"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-800">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="w-full rounded-xl border-0 bg-[#f3f4f7] px-4 py-3 pr-10 text-xs text-slate-900 transition-all outline-none placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-900 sm:text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute top-3.5 right-3 text-slate-400 hover:text-slate-600"
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
                  type="submit"
                  disabled={isLoading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-black py-3.5 text-xs font-medium text-white shadow-sm transition-all hover:bg-neutral-800 active:scale-[0.99] disabled:opacity-50 sm:text-sm"
                >
                  {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Sign Up
                </button>

                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-slate-200 bg-white py-3 text-xs font-medium text-slate-700 shadow-sm transition-all hover:bg-slate-50 sm:text-sm"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  Sign Up with Google
                </button>
              </div>
            </form>
          </div>

          {/* Footer */}
          <div className="mt-8 text-center text-xs text-slate-500">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-semibold text-slate-900 hover:underline"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
