"use client";

import { Award, Flame, Medal, Plus, Trophy } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ApiClient } from "@/lib/api-client";
import { usePermissions } from "@/lib/permissions/permission-context";
import type { TeamMemberScore } from "./dashboard-types";

export function TeamLeaderboardWidget() {
  const { activeTenant } = usePermissions();
  const [members, setMembers] = useState<TeamMemberScore[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!activeTenant?.id) return;
      setIsLoading(true);
      try {
        const orderRes = await ApiClient.getOrderStats(activeTenant.id);
        if (orderRes.success && orderRes.data && orderRes.data.totalOrders > 0) {
          setMembers([]);
        } else {
          setMembers([]);
        }
      } catch {
        setMembers([]);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [activeTenant?.id]);

  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return (
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 font-bold text-amber-600 text-xs">
            <Trophy className="h-3.5 w-3.5" />
          </div>
        );
      case 2:
        return (
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 font-bold text-slate-600 text-xs">
            <Medal className="h-3.5 w-3.5" />
          </div>
        );
      case 3:
        return (
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-50 font-bold text-amber-800 text-xs">
            <Award className="h-3.5 w-3.5" />
          </div>
        );
      default:
        return (
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 font-bold text-slate-500 text-xs">
            {rank}
          </div>
        );
    }
  };

  return (
    <div className="flex h-full flex-col justify-between rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs transition-all hover:border-slate-300">
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 shadow-2xs">
              <Trophy className="h-4.5 w-4.5" />
            </div>
            <div>
              <span className="font-bold text-slate-900 text-sm">
                Satış Liderlik Tablosu
              </span>
              <div className="text-[11px] text-slate-500 font-medium">
                Dönemin en başarılı temsilcileri
              </div>
            </div>
          </div>

          {members.length > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 font-bold text-[10px] text-amber-700">
              <Flame className="h-3 w-3 text-amber-500" />
              Yarış Sürüyor
            </span>
          )}
        </div>

        {/* Content Area */}
        {isLoading ? (
          <div className="space-y-2 py-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-12 w-full animate-pulse rounded-2xl bg-slate-50" />
            ))}
          </div>
        ) : members.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-slate-100 text-slate-400 mb-2.5 shadow-2xs">
              <Trophy className="h-6 w-6" />
            </div>
            <h4 className="font-bold text-slate-800 text-xs">Henüz satış performansı kaydedilmedi</h4>
            <p className="text-slate-400 text-[11px] mt-0.5 max-w-xs">
              Temsilcilerinizin kapattığı satışlar ve siparişler burada liderlik sıralaması olarak görüntülenecektir.
            </p>
            <div className="mt-3 flex items-center gap-2">
              <Link
                href={`/${activeTenant?.slug || "workspace"}/pipelines`}
                className="inline-flex items-center gap-1 rounded-xl bg-amber-600 px-3.5 py-1.5 font-bold text-white text-xs shadow-xs hover:bg-amber-700 transition"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Fırsat Ekle</span>
              </Link>
              <Link
                href={`/${activeTenant?.slug || "workspace"}/orders`}
                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 font-bold text-slate-700 text-xs shadow-2xs hover:bg-slate-50 transition"
              >
                <span>Sipariş Gir</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {members.map((member) => {
              const pct = member.target > 0 ? Math.round((member.achieved / member.target) * 100) : 0;
              return (
                <div
                  className="group rounded-2xl border border-slate-100 p-3 transition-all hover:border-slate-300 hover:bg-slate-50/50"
                  key={member.id}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getRankBadge(member.rank)}
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full font-bold text-white text-xs ${member.avatarColor} shadow-2xs`}
                      >
                        {member.initials}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 text-xs">
                          {member.name}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {member.role}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-extrabold text-slate-900 text-xs">
                        ₺{member.achieved.toLocaleString("tr-TR")}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {member.dealsClosed} Satış
                      </div>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-2.5 flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full transition-all ${
                          pct >= 100 ? "bg-emerald-500" : "bg-indigo-500"
                        }`}
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>
                    <span
                      className={`font-semibold text-[10px] ${
                        pct >= 100 ? "text-emerald-600" : "text-slate-500"
                      }`}
                    >
                      %{pct}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {members.length > 0 && (
        <div className="mt-4 border-slate-100 border-t pt-3 text-center">
          <Link
            href={`/${activeTenant?.slug || "workspace"}/orders`}
            className="font-bold text-amber-600 text-xs hover:text-amber-700 transition"
          >
            Tüm Satışları Görüntüle →
          </Link>
        </div>
      )}
    </div>
  );
}
