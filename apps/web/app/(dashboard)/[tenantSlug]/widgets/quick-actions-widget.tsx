"use client"

import {
  Briefcase,
  CheckSquare,
  FileText,
  Plus,
  UserPlus,
  Zap,
} from "lucide-react"

interface QuickActionsWidgetProps {
  onOpenQuickCreate: (type: "lead" | "deal" | "task" | "proposal") => void
}

export function QuickActionsWidget({
  onOpenQuickCreate,
}: QuickActionsWidgetProps) {
  const actions = [
    {
      id: "lead",
      title: "Yeni Lead Ekle",
      description: "Müşteri adayı kaydı oluştur",
      icon: UserPlus,
      color: "from-violet-600 to-indigo-600 text-white",
      hoverRing: "hover:ring-violet-400",
      actionType: "lead" as const,
    },
    {
      id: "deal",
      title: "Fırsat Başlat",
      description: "Pipeline'a yeni anlaşma ekle",
      icon: Briefcase,
      color: "from-blue-600 to-cyan-600 text-white",
      hoverRing: "hover:ring-blue-400",
      actionType: "deal" as const,
    },
    {
      id: "task",
      title: "Görev Tanımla",
      description: "Kendine veya ekibe iş ata",
      icon: CheckSquare,
      color: "from-emerald-600 to-teal-600 text-white",
      hoverRing: "hover:ring-emerald-400",
      actionType: "task" as const,
    },
    {
      id: "proposal",
      title: "Hızlı Teklif Hazırla",
      description: "PDF şablonuyla teklif oluştur",
      icon: FileText,
      color: "from-fuchsia-600 to-pink-600 text-white",
      hoverRing: "hover:ring-fuchsia-400",
      actionType: "proposal" as const,
    },
  ]

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-5 text-white shadow-md">
      <div className="mb-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-amber-300">
            <Zap className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">
              Hızlı İşlemler & Kısayollar
            </h3>
            <p className="text-[11px] text-slate-300">
              Sık kullanılan CRM eylemlerini tek tıkla başlatın
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {actions.map((act) => {
          const Icon = act.icon
          return (
            <button
              className={`group flex items-center gap-3.5 rounded-xl border border-white/10 bg-white/5 p-3.5 text-left transition-all duration-150 hover:scale-[1.02] hover:bg-white/15 hover:shadow-lg`}
              key={act.id}
              onClick={() => onOpenQuickCreate(act.actionType)}
              type="button"
            >
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${act.color} shadow-sm`}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-white transition-colors group-hover:text-amber-200">
                  {act.title}
                </div>
                <div className="truncate text-[10px] text-slate-300">
                  {act.description}
                </div>
              </div>
              <Plus className="h-4 w-4 text-slate-400 transition-colors group-hover:text-white" />
            </button>
          )
        })}
      </div>
    </div>
  )
}
