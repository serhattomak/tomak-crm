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
      <div className="flex min-h-screen flex-col items-center justify-center bg-muted text-zinc-600 dark:bg-zinc-950 dark:text-zinc-400">
        <Loader2 className="mb-3 h-8 w-8 animate-spin text-blue-500 dark:text-blue-400" />
        <p className="font-semibold text-xs">Loading your workspaces...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted p-4 dark:bg-zinc-950">
      <div className="w-full max-w-md space-y-6 rounded-3xl border border-zinc-200/80 bg-white p-8 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between border-zinc-100 border-b pb-5 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 via-blue-600 to-cyan-500 text-white shadow-blue-500/25 shadow-md">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-zinc-900 tracking-tight dark:text-zinc-100">
                Create a Workspace
              </h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                You don&apos;t have any active workspace yet.
              </p>
            </div>
          </div>
          <button
            className="rounded-xl p-2 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
            onClick={handleLogout}
            title="Logout"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>

        {errorMessage && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 font-medium text-rose-700 text-xs dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
            {errorMessage}
          </div>
        )}

        <form
          action="javascript:void(0);"
          className="space-y-4"
          onSubmit={handleCreateTenant}
        >
          <div>
            <label className="mb-1.5 block font-semibold text-xs text-zinc-800 dark:text-zinc-200">
              Workspace Name
            </label>
            <input
              autoFocus
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-xs text-zinc-900 transition-all placeholder:text-zinc-400 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:border-blue-400 dark:focus:bg-zinc-900 dark:placeholder:text-zinc-500"
              onChange={(e) => setNewTenantName(e.target.value)}
              placeholder="e.g. Acme Corp"
              required
              type="text"
              value={newTenantName}
            />
          </div>

          <button
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-950 py-3 font-semibold text-white text-xs shadow-sm transition-all hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
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
