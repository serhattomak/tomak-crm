"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ApiClient, type TenantDto } from "@/lib/api-client"
import { Building2, Plus, Loader2, LogOut } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

export default function RootPage() {
  const router = useRouter()
  const [tenants, setTenants] = useState<TenantDto[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [newTenantName, setNewTenantName] = useState("")
  const [isCreating, setIsCreating] = useState(false)

  useEffect(() => {
    const loadTenants = async () => {
      const res = await ApiClient.getMyTenants()
      if (res.success && res.data && res.data.length > 0) {
        // Redirect to the first workspace
        router.push(`/${res.data[0]?.slug}`)
      } else {
        setTenants(res.data || [])
        setIsLoading(false)
      }
    }
    loadTenants()
  }, [router])

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTenantName.trim()) return

    setIsCreating(true)
    const res = await ApiClient.createTenant(newTenantName.trim())
    setIsCreating(false)

    if (res.success && res.data) {
      router.push(`/${res.data.slug}`)
    } else {
      alert(res.message || "Failed to create workspace")
    }
  }

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/login")
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 text-slate-300">
        <Loader2 className="mb-3 h-8 w-8 animate-spin text-indigo-500" />
        <p className="text-sm">Loading your workspaces...</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-indigo-500/20 bg-indigo-600/10 p-2.5 text-indigo-400">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-100">
                Create a Workspace
              </h1>
              <p className="text-xs text-slate-400">
                You don&apos;t have any active workspace yet.
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Logout"
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-red-400"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleCreateTenant} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-300">
              Workspace Name
            </label>
            <input
              type="text"
              required
              value={newTenantName}
              onChange={(e) => setNewTenantName(e.target.value)}
              placeholder="e.g. Acme Corp"
              className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={isCreating}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
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
  )
}
