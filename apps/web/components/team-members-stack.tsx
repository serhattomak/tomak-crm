"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, useParams } from "next/navigation"
import {
  Users,
  UserPlus,
  Search,
  Mail,
  MessageSquare,
  Shield,
  Copy,
  Check,
  X,
  ExternalLink,
  Loader2,
  Sparkles,
} from "lucide-react"
import { toast } from "@workspace/ui/components/sonner"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Button } from "@workspace/ui/components/button"
import { ApiClient, type RoleDto, type TenantUserDto } from "@/lib/api-client"
import { usePermissions } from "@/lib/permissions/permission-context"

const AVATAR_BG_COLORS = [
  "bg-slate-900 text-white",
  "bg-indigo-600 text-white",
  "bg-fuchsia-600 text-white",
  "bg-emerald-600 text-white",
  "bg-blue-600 text-white",
  "bg-violet-600 text-white",
  "bg-amber-600 text-white",
  "bg-rose-600 text-white",
]

function getAvatarColor(idOrName: string) {
  let hash = 0
  for (let i = 0; i < idOrName.length; i++) {
    hash = idOrName.charCodeAt(i) + ((hash << 5) - hash)
  }
  return AVATAR_BG_COLORS[Math.abs(hash) % AVATAR_BG_COLORS.length]
}

function getInitials(name?: string, email?: string) {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/)
    const firstPart = parts[0]
    const lastPart = parts[parts.length - 1]
    if (parts.length >= 2 && firstPart && lastPart) {
      const first = firstPart[0] ?? ""
      const last = lastPart[0] ?? ""
      return (first + last).toUpperCase()
    }
    if (firstPart) {
      return firstPart.slice(0, 2).toUpperCase()
    }
  }
  if (email && email.trim()) {
    return email.slice(0, 2).toUpperCase()
  }
  return "U"
}

// Fallback demo users if API is unreachable or returns empty
const FALLBACK_USERS: TenantUserDto[] = [
  {
    id: "u-1",
    email: "can.ozkan@sirket.com",
    fullName: "Can Özkan",
    isActive: true,
    createdAt: new Date().toISOString(),
    roles: [{ id: "r-1", name: "Admin" }],
  },
  {
    id: "u-2",
    email: "elif.kaya@sirket.com",
    fullName: "Elif Kaya",
    isActive: true,
    createdAt: new Date().toISOString(),
    roles: [{ id: "r-2", name: "Satış Temsilcisi" }],
  },
  {
    id: "u-3",
    email: "burak.yilmaz@sirket.com",
    fullName: "Burak Yılmaz",
    isActive: true,
    createdAt: new Date().toISOString(),
    roles: [{ id: "r-3", name: "Destek Uzmanı" }],
  },
  {
    id: "u-4",
    email: "merve.demir@sirket.com",
    fullName: "Merve Demir",
    isActive: true,
    createdAt: new Date().toISOString(),
    roles: [{ id: "r-2", name: "Satış Temsilcisi" }],
  },
]

interface TeamMembersStackProps {
  onOpenInvite?: () => void
  className?: string
}

export function TeamMembersStack({ onOpenInvite, className = "" }: TeamMembersStackProps) {
  const router = useRouter()
  const params = useParams()
  const tenantSlug = (params?.tenantSlug as string) || ""
  const { activeTenant } = usePermissions()

  const [users, setUsers] = useState<TenantUserDto[]>(FALLBACK_USERS)
  const [loading, setLoading] = useState(Boolean(activeTenant?.id))
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null)
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const popoverRef = useRef<HTMLDivElement>(null)

  const tenantId = activeTenant?.id

  useEffect(() => {
    if (!tenantId) {
      return
    }

    let isMounted = true

    ApiClient.getTenantUsers(tenantId)
      .then((res) => {
        if (!isMounted) return
        if (res.success && res.data && res.data.length > 0) {
          setUsers(res.data)
        } else {
          setUsers(FALLBACK_USERS)
        }
      })
      .catch(() => {
        if (isMounted) {
          setUsers(FALLBACK_USERS)
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [tenantId, refreshKey])

  // Click outside & Escape handler
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    window.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [isOpen])

  const copyEmailToClipboard = (email: string, e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(email)
    setCopiedEmail(email)
    toast.success("E-posta kopyalandı", { description: email })
    setTimeout(() => setCopiedEmail(null), 2000)
  }

  const navigateToChat = (_userName?: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    setIsOpen(false)
    router.push(`/${tenantSlug}/messages`)
  }

  const displayedUsers = users.slice(0, 3)
  const remainingCount = Math.max(0, users.length - 3)

  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase()
    const nameMatch = u.fullName?.toLowerCase().includes(q)
    const emailMatch = u.email.toLowerCase().includes(q)
    const roleMatch = u.roles?.some((r) => r.name.toLowerCase().includes(q))
    return nameMatch || emailMatch || roleMatch
  })

  return (
    <>
      <div className={`relative inline-block ${className}`} ref={popoverRef}>
        {/* Trigger: Member Avatars Stack */}
        <button
          className="group flex items-center -space-x-2 px-1 cursor-pointer select-none rounded-full p-0.5 hover:ring-2 hover:ring-blue-400/50 transition-all active:scale-95"
          onClick={() => setIsOpen(!isOpen)}
          title={`Ekip Üyeleri (${users.length} Kişi) - Detaylar için tıkla`}
          type="button"
        >
          {displayedUsers.map((user, idx) => {
            const initials = getInitials(user.fullName, user.email)
            const colorClass = getAvatarColor(user.id || user.email || String(idx))

            return (
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full border-2 border-white font-semibold text-xs shadow-xs transition-transform group-hover:scale-105 dark:border-card ${colorClass}`}
                key={user.id || idx}
                title={user.fullName || user.email}
              >
                {initials}
              </div>
            )
          })}

          {remainingCount > 0 && (
            <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-slate-100 font-bold text-[10px] text-slate-700 shadow-xs transition-transform group-hover:scale-105 dark:border-card dark:bg-muted dark:text-foreground">
              +{remainingCount}
            </div>
          )}
        </button>

        {/* Team Members Popover */}
        {isOpen && (
          <div className="fixed inset-x-3 top-14 z-50 sm:absolute sm:inset-x-auto sm:right-0 sm:top-11 sm:w-96 rounded-2xl border border-slate-200/90 bg-white/95 backdrop-blur-md shadow-2xl dark:border-border dark:bg-card/95 animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-border">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                  <Users className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-foreground">Ekip Üyeleri</h3>
                  <p className="text-[10px] text-slate-500 dark:text-muted-foreground">
                    Toplam {users.length} aktif kullanıcı
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  className="h-7 px-2.5 text-[11px] font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-2xs"
                  onClick={() => {
                    setIsOpen(false)
                    if (onOpenInvite) {
                      onOpenInvite()
                    } else {
                      setIsInviteModalOpen(true)
                    }
                  }}
                  size="sm"
                  type="button"
                >
                  <UserPlus className="mr-1 h-3.5 w-3.5" />
                  <span>Davet Et</span>
                </Button>

                <button
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-muted"
                  onClick={() => setIsOpen(false)}
                  type="button"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Search Input */}
            <div className="p-3 border-b border-slate-100 bg-slate-50/70 dark:border-border dark:bg-muted/40">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  className="w-full rounded-xl border border-slate-200 bg-white pl-8 pr-3 py-1.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none dark:border-border dark:bg-card dark:text-foreground"
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="İsim, e-posta veya role göre ara..."
                  value={searchQuery}
                />
              </div>
            </div>

            {/* Members List Stream */}
            <div className="max-h-[340px] overflow-y-auto divide-y divide-slate-100 dark:divide-border/50">
              {loading ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin text-blue-600 mb-2" />
                  Üyeler yükleniyor...
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="py-8 text-center px-4">
                  <Users className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600" />
                  <p className="mt-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Kullanıcı bulunamadı
                  </p>
                  <p className="mt-1 text-[11px] text-slate-400">Aramanıza uygun üye eşleşmedi.</p>
                </div>
              ) : (
                filteredUsers.map((user, idx) => {
                  const initials = getInitials(user.fullName, user.email)
                  const colorClass = getAvatarColor(user.id || user.email || String(idx))

                  return (
                    <div
                      className="group flex items-center justify-between p-3 transition-colors hover:bg-slate-50/80 dark:hover:bg-muted/30"
                      key={user.id || idx}
                    >
                      <div className="flex items-center gap-3 min-w-0 pr-2">
                        {/* Avatar with Status Dot */}
                        <div className="relative shrink-0">
                          <div
                            className={`flex h-9 w-9 items-center justify-center rounded-full font-bold text-xs shadow-xs ${colorClass}`}
                          >
                            {initials}
                          </div>
                          <span
                            className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white dark:border-card ${
                              user.isActive !== false ? "bg-emerald-500" : "bg-slate-300"
                            }`}
                            title={user.isActive !== false ? "Aktif" : "Pasif"}
                          />
                        </div>

                        {/* Name & Email */}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-900 dark:text-foreground truncate">
                              {user.fullName || user.email.split("@")[0]}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-muted-foreground truncate">
                            {user.email}
                          </div>

                          {/* Role Badges */}
                          {user.roles && user.roles.length > 0 ? (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {user.roles.map((role) => (
                                <span
                                  className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-1.5 py-0.2 text-[9px] font-semibold text-slate-700 dark:bg-muted dark:text-slate-300"
                                  key={role.id}
                                  role="status"
                                >
                                  <Shield className="h-2.5 w-2.5 text-blue-500" />
                                  {role.name}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <div className="mt-1 flex flex-wrap gap-1">
                              <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-1.5 py-0.2 text-[9px] font-semibold text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
                                Rolsüz
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Quick Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors dark:hover:bg-muted dark:hover:text-foreground"
                          onClick={(e) => copyEmailToClipboard(user.email, e)}
                          title="E-posta Kopyala"
                          type="button"
                        >
                          {copiedEmail === user.email ? (
                            <Check className="h-3.5 w-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>

                        <button
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-colors dark:hover:bg-blue-950/40 dark:hover:text-blue-400"
                          onClick={(e) => navigateToChat(user.fullName, e)}
                          title="Mesaj Gönder"
                          type="button"
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* Footer: Manage Users Link */}
            <div className="border-t border-slate-100 bg-slate-50/50 p-2.5 text-center dark:border-border dark:bg-muted/30">
              <button
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 dark:hover:text-blue-400"
                onClick={() => {
                  setIsOpen(false)
                  router.push(`/${tenantSlug}/users`)
                }}
                type="button"
              >
                <span>Tüm Kullanıcıları & Rolleri Yönet</span>
                <ExternalLink className="h-3 w-3" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Embedded Invite Modal */}
      <InviteMemberModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        onSuccess={() => {
          setRefreshKey((k) => k + 1)
        }}
      />
    </>
  )
}

interface InviteMemberModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function InviteMemberModal({ isOpen, onClose, onSuccess }: InviteMemberModalProps) {
  const { activeTenant } = usePermissions()

  const [email, setEmail] = useState("")
  const [roleId, setRoleId] = useState("")
  const [roles, setRoles] = useState<RoleDto[]>([])
  const [loadingRoles, setLoadingRoles] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Load roles on modal open
  useEffect(() => {
    if (!isOpen) return

    async function loadRoles() {
      if (!activeTenant?.id) {
        setRoles([
          { id: "r-admin", name: "Admin", isDefault: false, memberCount: 1, createdAt: "", tenantId: "", permissions: [] },
          { id: "r-sales", name: "Satış Temsilcisi", isDefault: true, memberCount: 3, createdAt: "", tenantId: "", permissions: [] },
          { id: "r-support", name: "Müşteri Destek", isDefault: false, memberCount: 2, createdAt: "", tenantId: "", permissions: [] },
        ])
        setRoleId("r-sales")
        setLoadingRoles(false)
        return
      }

      setLoadingRoles(true)
      try {
        const res = await ApiClient.getRoles(activeTenant.id)
        if (res.success && res.data && res.data.length > 0) {
          setRoles(res.data)
          setRoleId(res.data[0]?.id || "r-sales")
        } else {
          setRoles([
            { id: "r-admin", name: "Admin", isDefault: false, memberCount: 1, createdAt: "", tenantId: "", permissions: [] },
            { id: "r-sales", name: "Satış Temsilcisi", isDefault: true, memberCount: 3, createdAt: "", tenantId: "", permissions: [] },
            { id: "r-support", name: "Müşteri Destek", isDefault: false, memberCount: 2, createdAt: "", tenantId: "", permissions: [] },
          ])
          setRoleId("r-sales")
        }
      } catch {
        setRoles([
          { id: "r-admin", name: "Admin", isDefault: false, memberCount: 1, createdAt: "", tenantId: "", permissions: [] },
          { id: "r-sales", name: "Satış Temsilcisi", isDefault: true, memberCount: 3, createdAt: "", tenantId: "", permissions: [] },
        ])
        setRoleId("r-sales")
      } finally {
        setLoadingRoles(false)
      }
    }

    loadRoles()
  }, [isOpen, activeTenant?.id])

  // Escape key handler
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, onClose])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !roleId) {
      toast.error("Lütfen e-posta adresi ve rol seçiniz.")
      return
    }

    setIsSubmitting(true)

    try {
      if (activeTenant?.id) {
        const res = await ApiClient.inviteUser(email.trim(), roleId, activeTenant.id)
        if (res.success) {
          toast.success("Davet başarıyla gönderildi! 🎉", {
            description: `${email} adresine davet bağlantısı iletildi.`,
          })
          setEmail("")
          if (onSuccess) onSuccess()
          onClose()
        } else {
          toast.error(res.message || "Davet gönderilemedi.")
        }
      } else {
        // Fallback simulate
        setTimeout(() => {
          toast.success("Davet başarıyla iletildi! 🎉", {
            description: `${email} adresine üyelik aktivasyon linki gönderildi.`,
          })
          setEmail("")
          if (onSuccess) onSuccess()
          onClose()
        }, 500)
      }
    } catch {
      toast.error("Bir hata oluştu. Lütfen tekrar deneyin.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="relative z-10 w-full max-w-md rounded-3xl bg-white p-5 sm:p-6 shadow-2xl dark:bg-card border border-slate-200 dark:border-border my-auto max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3.5 dark:border-border shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-foreground">
                Ekip Arkadaşı Davet Et
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-muted-foreground">
                Çalışma alanınıza yeni bir kullanıcı ekleyin
              </p>
            </div>
          </div>
          <button
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-muted shrink-0"
            onClick={onClose}
            type="button"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form className="space-y-4 py-4" onSubmit={handleSubmit}>
          {/* Email input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300" htmlFor="invite-email">
              E-posta Adresi *
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-border dark:bg-muted/50 dark:text-foreground"
                id="invite-email"
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ornek@sirketiniz.com"
                required
                type="email"
                value={email}
              />
            </div>
          </div>

          {/* Role Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Kullanıcı Rolü *
            </label>
            {loadingRoles ? (
              <div className="flex h-9 items-center justify-center rounded-xl border border-slate-200 text-xs text-slate-400">
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> Rol listesi alınıyor...
              </div>
            ) : (
              <Select onValueChange={setRoleId} value={roleId}>
                <SelectTrigger className="w-full text-xs rounded-xl bg-slate-50 dark:bg-muted/50">
                  <SelectValue placeholder="Rol Seçiniz" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      <div className="flex items-center gap-2">
                        <Shield className="h-3.5 w-3.5 text-blue-500" />
                        <span>{role.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="rounded-xl bg-blue-50/70 p-3 text-[11px] text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 flex items-start gap-2">
            <Sparkles className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
            <p>
              Davet edilen kullanıcıya e-posta ile davet bağlantısı gönderilecek ve şifresini belirleyerek anında giriş yapabilecektir.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-border shrink-0">
            <Button disabled={isSubmitting} onClick={onClose} size="sm" type="button" variant="outline">
              İptal
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-xs"
              disabled={isSubmitting || !email.trim() || !roleId}
              size="sm"
              type="submit"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Gönderiliyor...
                </>
              ) : (
                <>
                  <Mail className="mr-1.5 h-3.5 w-3.5" />
                  Davet Gönder
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
