/* Hallmark · component: team-leaderboard · genre: modern-minimal · theme: Adaptive Zinc/Violet */
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
      if (!activeTenant?.id) {
        return;
      }
      setIsLoading(true);
      try {
        const orderRes = await ApiClient.getOrderStats(activeTenant.id);
        if (
          orderRes.success &&
          orderRes.data &&
          orderRes.data.totalOrders > 0
        ) {
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
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 font-bold text-amber-600 text-xs dark:bg-amber-950/60 dark:text-amber-400">
            <Trophy className="h-3 w-3" />
          </div>
        );
      case 2:
        return (
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-200 font-bold text-zinc-600 text-xs dark:bg-zinc-800 dark:text-zinc-300">
            <Medal className="h-3 w-3" />
          </div>
        );
      case 3:
        return (
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-50 font-bold text-amber-800 text-xs dark:bg-amber-950/40 dark:text-amber-300">
            <Award className="h-3 w-3" />
          </div>
        );
      default:
        return (
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-100 font-bold text-zinc-500 text-xs dark:bg-zinc-800 dark:text-zinc-400">
            {rank}
          </div>
        );
    }
  };

  return (
    <div className="flex h-full flex-col justify-between rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-2xs transition-all hover:border-zinc-300 dark:border-zinc-800/90 dark:bg-zinc-900/90 dark:hover:border-zinc-700">
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-950/60 dark:text-violet-400 shadow-2xs dark:bg-violet-950/60 dark:text-violet-400">
              <Trophy className="h-4 w-4" />
            </div>
            <div>
              <span className="font-bold text-zinc-900 text-sm dark:text-zinc-100">
                Satış Liderlik Tablosu
              </span>
              <div className="font-medium text-[11px] text-zinc-500 dark:text-zinc-400">
                Dönemin en başarılı temsilcileri
              </div>
            </div>
          </div>

          {members.length > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 font-bold text-[10px] text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
              <Flame className="h-3 w-3 text-amber-500" />
              Yarış Sürüyor
            </span>
          )}
        </div>

        {/* Content Area */}
        {isLoading ? (
          <div className="space-y-2 py-3">
            {[1, 2].map((i) => (
              <div
                className="h-10 w-full animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800"
                key={i}
              />
            ))}
          </div>
        ) : members.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-7 text-center">
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-400 shadow-2xs dark:bg-zinc-800 dark:text-zinc-500">
              <Trophy className="h-5 w-5" />
            </div>
            <h4 className="font-bold text-zinc-800 text-xs dark:text-zinc-200">
              Henüz satış performansı kaydedilmedi
            </h4>
            <p className="mt-0.5 max-w-xs text-[11px] text-zinc-400 dark:text-zinc-500">
              Temsilcilerinizin kapattığı satışlar ve siparişler burada liderlik
              sıralaması olarak görüntülenecektir.
            </p>
            <div className="mt-3 flex items-center gap-2">
              <Link
                className="inline-flex items-center gap-1 rounded-xl bg-violet-600 px-3.5 py-1.5 font-bold text-white text-xs shadow-xs transition hover:bg-violet-700 active:scale-95"
                href={`/${activeTenant?.slug || "workspace"}/pipelines`}
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Fırsat Ekle</span>
              </Link>
              <Link
                className="inline-flex items-center gap-1 rounded-xl border border-zinc-200 bg-white px-3.5 py-1.5 font-bold text-zinc-700 text-xs shadow-2xs transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                href={`/${activeTenant?.slug || "workspace"}/orders`}
              >
                <span>Sipariş Gir</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {members.map((member) => {
              const pct =
                member.target > 0
                  ? Math.round((member.achieved / member.target) * 100)
                  : 0;
              return (
                <div
                  className="group rounded-xl border border-zinc-100 p-2.5 transition-all hover:border-zinc-300 hover:bg-zinc-50/50 dark:border-zinc-800/80 dark:hover:border-zinc-700 dark:hover:bg-zinc-800/40"
                  key={member.id}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      {getRankBadge(member.rank)}
                      <div
                        className={`flex h-7 w-7 items-center justify-center rounded-full font-bold text-white text-[11px] ${member.avatarColor} shadow-2xs`}
                      >
                        {member.initials}
                      </div>
                      <div>
                        <div className="font-bold text-zinc-900 text-xs dark:text-zinc-100">
                          {member.name}
                        </div>
                        <div className="text-[10px] text-zinc-400 dark:text-zinc-500">
                          {member.role}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-bold text-zinc-900 text-xs dark:text-zinc-100">
                        ₺{member.achieved.toLocaleString("tr-TR")}
                      </div>
                      <div className="text-[10px] text-zinc-400 dark:text-zinc-500">
                        {member.dealsClosed} Satış
                      </div>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-2 flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                      <div
                        className={`h-full rounded-full transition-all ${
                          pct >= 100 ? "bg-emerald-500" : "bg-violet-500"
                        }`}
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>
                    <span
                      className={`font-semibold text-[10px] ${
                        pct >= 100 ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-500 dark:text-zinc-400"
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
        <div className="mt-3 border-t border-zinc-100 pt-2.5 text-center dark:border-zinc-800/80">
          <Link
            className="font-bold text-violet-600 text-xs transition hover:text-violet-700 dark:hover:text-violet-400"
            href={`/${activeTenant?.slug || "workspace"}/orders`}
          >
            Tüm Satışları Görüntüle →
          </Link>
        </div>
      )}
    </div>
  );
}
