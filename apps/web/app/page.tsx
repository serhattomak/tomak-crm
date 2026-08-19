"use client";

import { Building2, Loader2, LogOut, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import type React from "react";
import { useEffect, useState } from "react";
import { ApiClient, type TenantDto } from "@/lib/api-client";
import { createClient } from "@/lib/supabase/client";

export default function RootPage() {
  const router = useRouter();
  const [tenants, setTenants] = useState<TenantDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newTenantName, setNewTenantName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadTenants = async () => {
      const res = await ApiClient.getMyTenants();
      if (res.success && res.data && res.data.length > 0) {
        // Redirect to the first workspace
        router.push(`/${res.data[0]?.slug}`);
      } else {
        setTenants(res.data || []);
        setIsLoading(false);
      }
    };
    loadTenants();
  }, [router]);

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTenantName.trim()) {
      return;
    }

    setIsCreating(true);
    setErrorMessage(null);
    const res = await ApiClient.createTenant(newTenantName.trim());
    setIsCreating(false);

    if (res.success && res.data) {
      router.push(`/${res.data.slug}`);
    } else {
      setErrorMessage(
        res.message ||
          "Failed to create workspace. Please check your credentials."
      );
    }
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#f4f5f8] text-slate-600">
        <Loader2 className="mb-3 h-8 w-8 animate-spin text-fuchsia-500" />
        <p className="font-semibold text-xs">Loading your workspaces...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#f4f5f8] p-4">
      <div className="w-full max-w-md space-y-6 rounded-3xl border border-slate-200/80 bg-white p-8 shadow-xl">
        <div className="flex items-center justify-between border-slate-100 border-b pb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-500 via-purple-600 to-cyan-500 text-white shadow-fuchsia-500/25 shadow-md">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-slate-900 tracking-tight">
                Create a Workspace
              </h1>
              <p className="text-slate-500 text-xs">
                You don&apos;t have any active workspace yet.
              </p>
            </div>
          </div>
          <button
            className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            onClick={handleLogout}
            title="Logout"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>

        {errorMessage && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 font-medium text-rose-700 text-xs">
            {errorMessage}
          </div>
        )}

        <form className="space-y-4" onSubmit={handleCreateTenant}>
          <div>
            <label className="mb-1.5 block font-semibold text-slate-800 text-xs">
              Workspace Name
            </label>
            <input
              autoFocus
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-slate-900 text-xs transition-all placeholder:text-slate-400 focus:border-fuchsia-500 focus:bg-white focus:outline-none"
              onChange={(e) => setNewTenantName(e.target.value)}
              placeholder="e.g. Acme Corp"
              required
              type="text"
              value={newTenantName}
            />
          </div>

          <button
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 py-3 font-semibold text-white text-xs shadow-sm transition-all hover:bg-slate-800 disabled:opacity-50"
            disabled={isCreating}
            type="submit"
          >
            {isCreating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Create Workspace & Continue
          </button>
        </form>
      </div>
    </div>
  );
}
